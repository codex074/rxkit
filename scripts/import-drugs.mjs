#!/usr/bin/env node
/**
 * Import Drug-list.xlsx + Drug-label.doc → Firestore
 * - drugs collection: ยาทั้งหมด
 * - defaultSetItems: ยาของหน่วยปฐมพยาบาล
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')

const PROJECT_ID = 'rxkit-a2c07'
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const AUTH_MGMT = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`

function log(msg)  { console.log(`\x1b[36m▸\x1b[0m ${msg}`) }
function ok(msg)   { console.log(`\x1b[32m✓\x1b[0m ${msg}`) }
function warn(msg) { console.log(`\x1b[33m⚠\x1b[0m ${msg}`) }
function err(msg)  { console.error(`\x1b[31m✗\x1b[0m ${msg}`) }

// ── REST helpers ────────────────────────────────────────────────────────────
async function req(url, { method = 'GET', body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Goog-User-Project': PROJECT_ID,
  }
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}: ${text.slice(0, 300)}`)
  return data
}

const str  = v => ({ stringValue: String(v ?? '') })
const num  = v => ({ doubleValue: Number(v) || 0 })
const bool = v => ({ booleanValue: Boolean(v) })
const ts   = () => ({ timestampValue: new Date().toISOString() })
const intV = v => ({ integerValue: String(Math.round(Number(v) || 0)) })

async function fsSet(col, docId, fields, token) {
  return req(`${FS}/${col}/${docId}`, { method: 'PATCH', body: { fields }, token })
}
async function fsCreate(col, fields, token) {
  return req(`${FS}/${col}`, { method: 'POST', body: { fields }, token })
}
async function fsList(col, token, pageSize = 300) {
  return req(`${FS}/${col}?pageSize=${pageSize}`, { token })
}

// ── Parse Drug-label.doc ────────────────────────────────────────────────────
function parseLabelDoc() {
  const raw = execSync(`textutil -convert txt -stdout "${join(ROOT, 'raw/Drug-label.doc')}"`)
    .toString()

  // Split by patient name separator
  const blocks = raw.split(/ชื่อผู้ป่วย\s*\.{5,}/).map(b => b.trim()).filter(Boolean)

  const labels = []
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) continue
    const rawName = lines[0]
    // instruction = all middle lines; warning = last line (category)
    const instruction = lines.slice(1, -1).join(' ').trim()
    const warning = lines[lines.length - 1].trim()
    labels.push({ rawName, instruction, warning })
  }
  return labels
}

// ── Fuzzy name matching ──────────────────────────────────────────────────────
function normalize(s) {
  return s.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()[\]]/g, '')
    .replace(/\d+(\.\d+)?\s*(mg|ml|%|iu|g)\b/gi, '')
    .replace(/tab|syrup|syp|inj|amp|vial|cream|lotion|eye|oint|supp|paste/gi, '')
    .trim()
}

function findLabel(drugName, labels) {
  const norm = normalize(drugName)
  // Exact normalized match first
  let match = labels.find(l => normalize(l.rawName) === norm)
  if (match) return match
  // Starts-with match
  match = labels.find(l => normalize(l.rawName).startsWith(norm) || norm.startsWith(normalize(l.rawName)))
  if (match) return match
  // Substring match (drug name appears in label name or vice versa)
  const words = norm.split(' ').filter(w => w.length > 3)
  if (words.length > 0) {
    match = labels.find(l => {
      const ln = normalize(l.rawName)
      return words.every(w => ln.includes(w))
    })
  }
  return match ?? null
}

// ── Extract strength from drug name ─────────────────────────────────────────
function extractStrength(name) {
  const m = name.match(/(\d+(\.\d+)?\s*(mg|ml|%|iu|g|mcg)(\s*\/\s*\d+\s*(mg|ml))?)/i)
  return m ? m[0].trim() : ''
}

function cleanName(name) {
  // Remove trailing strength, qty, tab count like "30 tab", "20 tab"
  return name.replace(/\s+\d+\s*(tab|amp|vial|หลอด|ขวด|เม็ด|ซีซี)?$/i, '').trim()
}

// ── Dosage form inference ────────────────────────────────────────────────────
function inferDosageForm(name, unit) {
  const n = (name + ' ' + unit).toLowerCase()
  if (/inj|amp|vial/.test(n)) return 'ยาฉีด'
  if (/syrup|syp|น้ำ/.test(n)) return 'ยาน้ำ'
  if (/cream|lotion|gel|oint|paste/.test(n)) return 'ยาทาภายนอก'
  if (/eye|oph|หยอดตา/.test(n)) return 'ยาหยอดตา'
  if (/supp|เหน็บ/.test(n)) return 'ยาเหน็บ'
  if (/inhaler|mdi|nb|พ่น/.test(n)) return 'ยาพ่น'
  if (/เม็ด|tab/.test(n)) return 'ยาเม็ด'
  if (/ซอง|ผง/.test(n)) return 'ยาผง'
  if (/ขวด|ซีซี/.test(n)) return 'ยาน้ำ'
  return ''
}

// ── Parse Excel sheets ───────────────────────────────────────────────────────
function parseSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
  const items = []
  for (const row of data) {
    if (!row || row.length < 2) continue
    const name = row[1]
    const qty  = row[2]
    const unit = row[3]
    if (typeof name !== 'string' || !name.trim()) continue
    if (/ลำดับ|รายการ|ชื่อผู้ป่วย|ลงชื่อ/.test(name)) continue
    items.push({ name: name.trim(), qty: Number(qty) || 0, unit: String(unit ?? '').trim() })
  }
  return items
}

// ── Deduplicate drug list ────────────────────────────────────────────────────
function deduplicateDrugs(allItems) {
  const seen = new Map()
  for (const item of allItems) {
    const key = normalize(item.name)
    if (!seen.has(key)) {
      seen.set(key, item)
    }
  }
  return [...seen.values()]
}

// ── Get admin UID from Firestore ─────────────────────────────────────────────
async function getAdminUid(token) {
  try {
    const result = await req(`${AUTH_MGMT}/accounts:lookup`, {
      method: 'POST',
      body: { email: ['rxopd@rxkit.local'] },
      token,
    })
    return result.users?.[0]?.localId ?? 'system'
  } catch {
    return 'system'
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n\x1b[1m📦 RxKit Drug Import\x1b[0m\n')

  log('กำลังรับ gcloud access token...')
  const token = execSync('gcloud auth print-access-token').toString().trim()
  ok('Access token สำเร็จ')

  const adminUid = await getAdminUid(token)
  log(`Admin UID: ${adminUid}`)

  // ── Parse label doc ────────────────────────────────────────────────────────
  log('กำลังอ่าน Drug-label.doc...')
  const labels = parseLabelDoc()
  ok(`Labels พบ ${labels.length} รายการ`)

  // ── Parse Excel ────────────────────────────────────────────────────────────
  log('กำลังอ่าน Drug-list.xlsx...')
  const wb = XLSX.readFile(join(ROOT, 'raw/Drug-list.xlsx'))

  const sheetFirst    = parseSheet(wb.Sheets['ยาออกหน่วยปฐมพยาบาล'])
  const sheetInject   = parseSheet(wb.Sheets['ยาฉีด'])
  const sheetOral     = parseSheet(wb.Sheets['ยากินและยาอื่นๆ'])
  const sheetVaccine  = parseSheet(wb.Sheets['วัคซีน+เซรุ่มงู ตามเสด็จ'])

  const allItems = [...sheetFirst, ...sheetInject, ...sheetOral, ...sheetVaccine]
  const uniqueDrugs = deduplicateDrugs(allItems)
  ok(`ยาทั้งหมด ${uniqueDrugs.length} รายการ (หลัง dedup)`)

  // ── Check existing drugs ───────────────────────────────────────────────────
  log('กำลังตรวจสอบยาที่มีอยู่แล้วใน Firestore...')
  let existingNames = new Set()
  try {
    const existing = await fsList('drugs', token)
    for (const doc of (existing.documents ?? [])) {
      const n = doc.fields?.name?.stringValue
      if (n) existingNames.add(normalize(n))
    }
    if (existingNames.size > 0) warn(`มียาในระบบแล้ว ${existingNames.size} รายการ — จะข้ามรายการที่ซ้ำ`)
  } catch {
    warn('ไม่สามารถตรวจสอบยาเดิมได้ — จะ import ทั้งหมด')
  }

  // ── Import drugs ───────────────────────────────────────────────────────────
  log('กำลัง import ยาเข้า Firestore...')
  const drugIdMap = new Map() // normalize(name) → docId

  let imported = 0
  let skipped = 0
  let codeNum = 1

  for (const item of uniqueDrugs) {
    const normKey = normalize(item.name)
    if (existingNames.has(normKey)) {
      skipped++
      continue
    }

    const label = findLabel(item.name, labels)
    const strength = extractStrength(item.name)
    const cleanedName = cleanName(item.name)
    const dosageForm = inferDosageForm(item.name, item.unit)

    const code = String(codeNum).padStart(4, '0')
    codeNum++

    const fields = {
      code:          str(code),
      name:          str(cleanedName),
      genericName:   str(cleanedName),
      tradeName:     str(''),
      strength:      str(strength),
      dosageForm:    str(dosageForm),
      unit:          str(item.unit),
      pricePerUnit:  num(0),
      instruction:   str(label?.instruction ?? ''),
      warning:       str(label?.warning ?? ''),
      labelNote:     str(''),
      active:        bool(true),
      createdAt:     ts(),
      updatedAt:     ts(),
      createdBy:     str(adminUid),
      updatedBy:     str(adminUid),
    }

    try {
      const doc = await fsCreate('drugs', fields, token)
      // Extract doc ID from name path
      const docId = doc.name.split('/').pop()
      drugIdMap.set(normKey, { docId, name: cleanedName, strength, dosageForm, unit: item.unit })
      imported++
      console.log(`  ✓ [${code}] ${cleanedName}${strength ? ' ' + strength : ''}`)
    } catch (e) {
      err(`  ✗ ${item.name}: ${e.message}`)
    }
  }

  ok(`Import ยาสำเร็จ ${imported} รายการ (ข้าม ${skipped} รายการที่มีอยู่แล้ว)`)

  // ── Find ปฐมพยาบาล unitType ────────────────────────────────────────────────
  log('กำลังค้นหา unitType "ปฐมพยาบาล"...')
  let unitTypeId = null
  let unitTypeName = 'ปฐมพยาบาล'
  try {
    const utDocs = await fsList('unitTypes', token)
    for (const doc of (utDocs.documents ?? [])) {
      const name = doc.fields?.name?.stringValue ?? ''
      if (name.includes('ปฐมพยาบาล')) {
        unitTypeId = doc.name.split('/').pop()
        unitTypeName = name
        break
      }
    }
  } catch (e) {
    warn(`ค้นหา unitType ไม่สำเร็จ: ${e.message}`)
  }

  if (!unitTypeId) {
    warn('ไม่พบ unitType ปฐมพยาบาล — ข้ามขั้นตอน defaultSet')
  } else {
    ok(`พบ unitType: ${unitTypeName} (${unitTypeId})`)

    // ── Find or create defaultSet ──────────────────────────────────────────
    log('กำลังค้นหา defaultSet ของ ปฐมพยาบาล...')
    let setId = null
    try {
      const setDocs = await fsList('defaultSets', token)
      for (const doc of (setDocs.documents ?? [])) {
        if (doc.fields?.unitTypeId?.stringValue === unitTypeId) {
          setId = doc.name.split('/').pop()
          break
        }
      }
    } catch {}

    if (!setId) {
      log('กำลังสร้าง defaultSet ใหม่...')
      const setDoc = await fsCreate('defaultSets', {
        unitTypeId:   str(unitTypeId),
        unitTypeName: str(unitTypeName),
        name:         str(`ชุดยาออกหน่วย${unitTypeName}`),
        description:  str('ชุดยามาตรฐานสำหรับหน่วยปฐมพยาบาลทั่วไป'),
        active:       bool(true),
        createdAt:    ts(),
        updatedAt:    ts(),
        createdBy:    str(adminUid),
        updatedBy:    str(adminUid),
      }, token)
      setId = setDoc.name.split('/').pop()
      ok(`สร้าง defaultSet: ${setId}`)
    } else {
      ok(`พบ defaultSet: ${setId}`)
    }

    // ── Check existing defaultSetItems ─────────────────────────────────────
    log('ตรวจสอบ defaultSetItems ที่มีอยู่...')
    let existingSetItems = 0
    try {
      const existing = await fsList('defaultSetItems', token)
      existingSetItems = (existing.documents ?? []).filter(
        d => d.fields?.setId?.stringValue === setId
      ).length
    } catch {}

    if (existingSetItems > 0) {
      warn(`มี defaultSetItems อยู่แล้ว ${existingSetItems} รายการ — ข้ามขั้นตอนนี้`)
    } else {
      // ── Get current drug IDs from Firestore for matching ──────────────────
      log('กำลังโหลด drug IDs จาก Firestore...')
      const allDrugDocs = []
      try {
        const res = await fsList('drugs', token, 500)
        for (const doc of (res.documents ?? [])) {
          allDrugDocs.push({
            docId: doc.name.split('/').pop(),
            name: doc.fields?.name?.stringValue ?? '',
            strength: doc.fields?.strength?.stringValue ?? '',
            dosageForm: doc.fields?.dosageForm?.stringValue ?? '',
            unit: doc.fields?.unit?.stringValue ?? '',
          })
        }
      } catch (e) {
        warn(`โหลด drugs ไม่สำเร็จ: ${e.message}`)
      }

      // ── Create defaultSetItems from ยาออกหน่วยปฐมพยาบาล sheet ──────────────
      log(`กำลังสร้าง defaultSetItems ${sheetFirst.length} รายการ...`)
      let itemOrder = 1

      for (const item of sheetFirst) {
        const normKey = normalize(item.name)
        // Find drug doc
        const drug = allDrugDocs.find(d => normalize(d.name) === normKey)
          ?? allDrugDocs.find(d => {
            const dn = normalize(d.name)
            const words = normKey.split(' ').filter(w => w.length > 2)
            return words.length > 0 && words.every(w => dn.includes(w))
          })

        if (!drug) {
          warn(`  ไม่พบ drugId สำหรับ: ${item.name}`)
          continue
        }

        try {
          await fsCreate('defaultSetItems', {
            setId:              str(setId),
            unitTypeId:         str(unitTypeId),
            drugId:             str(drug.docId),
            drugNameSnapshot:   str(drug.name),
            strengthSnapshot:   str(drug.strength),
            dosageFormSnapshot: str(drug.dosageForm),
            unitSnapshot:       str(drug.unit || item.unit),
            qtyPerSet:          intV(item.qty || 1),
            note:               str(''),
            active:             bool(true),
            sortOrder:          intV(itemOrder),
            createdAt:          ts(),
            updatedAt:          ts(),
          }, token)
          console.log(`  ✓ [${itemOrder}] ${drug.name} × ${item.qty || 1} ${item.unit}`)
          itemOrder++
        } catch (e) {
          err(`  ✗ ${item.name}: ${e.message}`)
        }
      }
      ok(`สร้าง defaultSetItems สำเร็จ ${itemOrder - 1} รายการ`)
    }
  }

  console.log('\n\x1b[1m\x1b[32m✅ Import เสร็จสมบูรณ์!\x1b[0m\n')
  console.log(`  ยาที่ import: ${imported} รายการ`)
  console.log(`  ยาที่ข้าม (มีอยู่แล้ว): ${skipped} รายการ`)
  console.log('  เปิด Drug-list ในแอปเพื่อตรวจสอบและแก้ไขข้อมูลเพิ่มเติม\n')
}

main().catch(e => {
  err(e.message ?? String(e))
  process.exit(1)
})
