/**
 * fix-default-sets.mjs
 * 1. Rebuild ปฐมพยาบาล defaultSetItems (fix duplicates, remove ซองซิบ)
 * 2. Create รับเสด็จ defaultSet + items from ยาฉีด + ยากินและยาอื่นๆ + วัคซีน+เซรุ่มงู
 * 3. Create พอสว. defaultSet + items from วัคซีน+เซรุ่มงู
 * 4. Add missing vaccine/antivenom drugs to drugs collection
 */

import { execSync } from 'child_process'

const PROJECT = 'rxkit-a2c07'
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

function getToken() {
  return execSync('gcloud auth print-access-token').toString().trim()
}

async function req(url, { method = 'GET', body, token } = {}) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Goog-User-Project': PROJECT,
      'Content-Type': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${url} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function listDocs(collection, token) {
  const data = await req(`${FS}/${collection}?pageSize=500`, { token })
  return data.documents || []
}

async function deleteDocs(collection, token) {
  const docs = await listDocs(collection, token)
  for (const doc of docs) {
    await req(doc.name.replace('https://firestore.googleapis.com/v1/', 'https://firestore.googleapis.com/v1/'), { method: 'DELETE', token })
    process.stdout.write('.')
  }
}

function str(v) { return { stringValue: v } }
function num(v) { return { integerValue: String(v) } }
function bool(v) { return { booleanValue: v } }
function ts() { return { timestampValue: new Date().toISOString() } }

async function createDoc(collection, fields, token) {
  const data = await req(`${FS}/${collection}`, {
    method: 'POST',
    token,
    body: { fields },
  })
  return data.name.split('/').pop()
}

async function getOrCreateDefaultSet(unitTypeId, unitTypeName, setName, description, token) {
  // Check if exists
  const docs = await listDocs('defaultSets', token)
  const existing = docs.find(d => d.fields?.unitTypeId?.stringValue === unitTypeId && d.fields?.active?.booleanValue === true)
  if (existing) {
    console.log(`  defaultSet already exists for ${unitTypeName}: ${existing.name.split('/').pop()}`)
    return existing.name.split('/').pop()
  }
  const id = await createDoc('defaultSets', {
    unitTypeId: str(unitTypeId),
    unitTypeName: str(unitTypeName),
    name: str(setName),
    description: str(description),
    active: bool(true),
    createdBy: str('system'),
    updatedBy: str('system'),
    createdAt: ts(),
    updatedAt: ts(),
  }, token)
  console.log(`  Created defaultSet for ${unitTypeName}: ${id}`)
  return id
}

async function createSetItem(setId, unitTypeId, drugId, drugName, strength, dosageForm, unit, qtyPerSet, note, sortOrder, token) {
  return createDoc('defaultSetItems', {
    setId: str(setId),
    unitTypeId: str(unitTypeId),
    drugId: str(drugId),
    drugNameSnapshot: str(drugName),
    strengthSnapshot: str(strength),
    dosageFormSnapshot: str(dosageForm),
    unitSnapshot: str(unit),
    qtyPerSet: num(qtyPerSet),
    note: str(note),
    active: bool(true),
    sortOrder: num(sortOrder),
    createdAt: ts(),
    updatedAt: ts(),
  }, token)
}

async function main() {
  const token = getToken()

  // ─── Get all drugs ─────────────────────────────────────────────────────────
  console.log('\n1. Loading all drugs...')
  const drugDocs = await listDocs('drugs', token)
  const drugs = {}
  drugDocs.forEach(d => {
    const id = d.name.split('/').pop()
    const f = d.fields
    drugs[id] = {
      id,
      name: f.name?.stringValue ?? '',
      strength: f.strength?.stringValue ?? '',
      dosageForm: f.dosageForm?.stringValue ?? '',
      unit: f.unit?.stringValue ?? '',
    }
  })
  console.log(`  Loaded ${Object.keys(drugs).length} drugs`)

  // ─── Unit type IDs ─────────────────────────────────────────────────────────
  const UT_PRATHOM = '6z8ZoE7aUtCOHdhgH1sA'   // ปฐมพยาบาล
  const UT_RASADET = 'osOqTtrhTsHUUHz86vTJ'   // รับเสด็จ
  const UT_POSAEW  = 'R5pj1jT0dKpZDpVAWnYZ'   // พอ.สว.

  // ─── Drug ID map (name → id) ───────────────────────────────────────────────
  function findDrug(id) {
    const d = drugs[id]
    if (!d) throw new Error(`Drug not found: ${id}`)
    return d
  }

  // ─── 2. Rebuild ปฐมพยาบาล defaultSetItems ─────────────────────────────────
  console.log('\n2. Rebuilding ปฐมพยาบาล defaultSetItems...')

  // Get existing set ID
  const defaultSets = await listDocs('defaultSets', token)
  const pratHomSet = defaultSets.find(d => d.fields?.unitTypeId?.stringValue === UT_PRATHOM)
  if (!pratHomSet) throw new Error('ปฐมพยาบาล defaultSet not found!')
  const pratHomSetId = pratHomSet.name.split('/').pop()
  console.log(`  Set ID: ${pratHomSetId}`)

  // Delete all existing items for this set
  const existingItems = await listDocs('defaultSetItems', token)
  const itemsToDelete = existingItems.filter(d => d.fields?.setId?.stringValue === pratHomSetId)
  console.log(`  Deleting ${itemsToDelete.length} existing items...`)
  for (const item of itemsToDelete) {
    await req(`https://firestore.googleapis.com/v1/${item.name}`, { method: 'DELETE', token })
    process.stdout.write('.')
  }
  console.log('\n  Deleted.')

  // ปฐมพยาบาล items (from "ยาออกหน่วยปฐมพยาบาล" sheet)
  // Maps: excel drug name → [drugId, displayName, qtyPerSet, unit]
  const pratHomItems = [
    { id: 'ZAH1YVpfJe4LZG5xZOcu', qty: 2,  note: '' },  // Aludox (ขวด)
    { id: 'mcdpaqym86HKfd2e7dl2', qty: 30, note: '' },  // Air-x (เม็ด)
    { id: 'MgQt8YmYcGOetsm0M7kY', qty: 10, note: '' },  // Begesic (หลอด)
    { id: '8EKz5vireHng1JZOfrhL', qty: 30, note: '' },  // Bromhexine (เม็ด)
    { id: 'iJ4xSFhcIbmmLTnn7YoN', qty: 3,  note: '' },  // Buscopan inj (amp)
    { id: 'oe4pUEEHg4eAwYxh0smy', qty: 30, note: '' },  // Buscopan tab (เม็ด)
    { id: 'rtwEbUVNhrls7j8MbzkB', qty: 1,  note: '' },  // CPM inj (amp)
    { id: 'qZUteYVdU0A8WX7wpXsS', qty: 30, note: '' },  // CPM tab (เม็ด)
    { id: '1PVUyAazx3idRlqn9kEF', qty: 1,  note: '' },  // Diazepam inj (amp)
    { id: 'UvtAZByahqCQTZUP9fp4', qty: 1,  note: '' },  // Diclofenac inj (amp)
    { id: 'Dh5HOg1niBZqKTLBhzoN', qty: 30, note: '' },  // Diclofenac tab (เม็ด)
    { id: 'Qyfjfhj4OnrhKRpFQY3E', qty: 1,  note: '' },  // Dimen inj (amp)
    { id: 'F2gFJRGmrnbGNDUZ4oxS', qty: 30, note: '' },  // Dimen tab (เม็ด)
    { id: 'p9WDoPaCdXbwpgDInVKH', qty: 2,  note: '' },  // Elastic bandage 4 นิ้ว (ม้วน)
    { id: 'ekMgmNJNxN47mOUS6mev', qty: 2,  note: '' },  // Elastic bandage 6 นิ้ว (ม้วน)
    { id: 'bSGOqjVy7Vek1yzuBaN7', qty: 30, note: '' },  // Motilium (เม็ด)
    { id: 'mUGCqLhLZhMW6EKCfeXk', qty: 30, note: '' },  // Mydocalm (เม็ด)
    { id: 'LWIrBHFoCGgOsVhCZg6E', qty: 30, note: '' },  // Norfloxacin 400 mg (เม็ด)
    { id: 'kt7z7NexeOWZXrNsZyHs', qty: 10, note: '' },  // ORS ผู้ใหญ่ (ซอง)
    { id: 'blvQmHUHvg3CCAjzhZIU', qty: 50, note: '' },  // Paracetamol 500 mg (เม็ด)
    { id: 'VqlQ5pYYaEgpKPY1RrrG', qty: 30, note: '' },  // Ponstan 250 mg (เม็ด)
    { id: 'LftFYwmcV1KKzZ66H1TB', qty: 20, note: '' },  // Omeprazole 20 mg (เม็ด)
    { id: 'VReY7pMcz7oRQ79FeEKP', qty: 30, note: '' },  // Dextromethophan (เม็ด)
  ]

  console.log(`  Creating ${pratHomItems.length} items...`)
  for (let i = 0; i < pratHomItems.length; i++) {
    const { id: drugId, qty, note } = pratHomItems[i]
    const drug = findDrug(drugId)
    await createSetItem(pratHomSetId, UT_PRATHOM, drugId, drug.name, drug.strength, drug.dosageForm, drug.unit, qty, note, i, token)
    process.stdout.write('.')
  }
  console.log('\n  Done.')

  // ─── 3. Add missing vaccines/antivenoms to drugs ───────────────────────────
  console.log('\n3. Adding vaccines/antivenoms to drugs collection...')

  const vaccines = [
    { name: 'เซรุ่มงูกะปะ',              strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'เซรุ่มงูเห่า',               strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'เซรุ่มงูเขียวหางไหม้',       strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'เซรุ่มงูทับสมิงคลา',         strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'เซรุ่มงูแมวเซา',             strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'เซรุ่มงูระบบเลือด',          strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'เซรุ่มงูรวมระบบประสาท',      strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'วัคซีนป้องกันบาดทะยัก (dT)', strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'Tetagam',                    strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'PCEC',                       strength: '', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
    { name: 'HRIG',                       strength: '300 iu', dosageForm: 'ยาแช่เย็น', unit: 'vial', instruction: '', warning: '' },
  ]

  const vaccineIds = {}
  const existingNames = new Set(Object.values(drugs).map(d => d.name.toLowerCase().trim()))

  for (const v of vaccines) {
    if (existingNames.has(v.name.toLowerCase().trim())) {
      const found = Object.values(drugs).find(d => d.name.toLowerCase().trim() === v.name.toLowerCase().trim())
      console.log(`  Skip (exists): ${v.name} → ${found.id}`)
      vaccineIds[v.name] = found.id
      continue
    }
    const id = await createDoc('drugs', {
      code: str(''),
      name: str(v.name),
      genericName: str(''),
      tradeName: str(''),
      strength: str(v.strength),
      dosageForm: str(v.dosageForm),
      unit: str(v.unit),
      pricePerUnit: { doubleValue: 0 },
      instruction: str(v.instruction),
      warning: str(v.warning),
      labelNote: str(''),
      active: bool(true),
      createdBy: str('system'),
      updatedBy: str('system'),
      createdAt: ts(),
      updatedAt: ts(),
    }, token)
    vaccineIds[v.name] = id
    console.log(`  Created: ${v.name} → ${id}`)
  }

  // ─── 4. Create รับเสด็จ defaultSet + items ────────────────────────────────
  console.log('\n4. Creating รับเสด็จ defaultSet...')
  const rasadetSetId = await getOrCreateDefaultSet(
    UT_RASADET, 'รับเสด็จ',
    'ชุดยาสำหรับหน่วยรับเสด็จ',
    'ยาฉีด + ยากิน + วัคซีน/เซรุ่มงู สำหรับตามขบวนเสด็จ',
    token
  )

  // Delete existing items for รับเสด็จ if any
  const allItems = await listDocs('defaultSetItems', token)
  const rasadetItemsToDelete = allItems.filter(d => d.fields?.setId?.stringValue === rasadetSetId)
  if (rasadetItemsToDelete.length > 0) {
    console.log(`  Deleting ${rasadetItemsToDelete.length} existing รับเสด็จ items...`)
    for (const item of rasadetItemsToDelete) {
      await req(`https://firestore.googleapis.com/v1/${item.name}`, { method: 'DELETE', token })
    }
  }

  // รับเสด็จ items: ยาฉีด (skip กล่องยา CPR) + ยากินและยาอื่นๆ (skip ชุดยา...) + วัคซีน+เซรุ่มงู
  const rasadetInj = [
    // ยาฉีด sheet
    { id: 'Io7WvxmgxgOC31dgCkpb', qty: 2  },  // Morphine
    { id: 'ycIkch7Rk8cQc77vtO5J', qty: 2  },  // Pethidine
    { id: '32wl2ht07vha2T8lHSzH', qty: 2  },  // Fentanyl
    { id: '3rKTTvSymNhIggz7f5sS', qty: 2  },  // Mydazolam
    { id: 'MAFpNIAk9XnLzvmnLpU6', qty: 20 },  // Adrenaline
    { id: 'PjxvTLzLhYlif6DphQXA', qty: 3  },  // Adenosine
    { id: 'FPSmbErgsHBByrTS75Sh', qty: 6  },  // Amiodarone
    { id: 'gffj0N0rWhDPtLmivWrj', qty: 6  },  // Atropine
    { id: '4Afv92Uo9QuE5e2n1elG', qty: 2  },  // Bricanyl
    { id: 'iJ4xSFhcIbmmLTnn7YoN', qty: 2  },  // Buscopan inj
    { id: 'qsq9GN8pYMWeiLSIDX4G', qty: 3  },  // Calcium gluconate 10%
    { id: 'rtwEbUVNhrls7j8MbzkB', qty: 2  },  // CPM inj
    { id: 'gAvb8eYyMFp6g4rnVt5c', qty: 5  },  // Dexa
    { id: '1PVUyAazx3idRlqn9kEF', qty: 5  },  // Diazepam inj
    { id: '10MOJhnsPCkeh8HjTOJ7', qty: 2  },  // Digoxin
    { id: 'WPAy9ygsY7k95wFvOocA', qty: 2  },  // Diltiazem
    { id: 'Qyfjfhj4OnrhKRpFQY3E', qty: 2  },  // Dimen inj
    { id: 'cfUxVnRA17A6RRaL4vZg', qty: 2  },  // Dopamine
    { id: 'IRGE1zru9W4HxN27CZjg', qty: 2  },  // Dynastat
    { id: 'gon9OZpUY0NDDSWstXl4', qty: 2  },  // Glucose 50%
    { id: 'HFysWHJulPrJJnXDnnIL', qty: 2  },  // Hadol
    { id: 'kea2C8b4LyqoCseAUnb4', qty: 2  },  // Labetalol
    { id: 'KKFfoSUkQQCxHWtKOJ9i', qty: 5  },  // Lasix
    { id: 'kTc9dOPHF1KLiKZopPwh', qty: 2  },  // Lidocaine
    { id: 'w49o3fYuD9OshLIxWUyw', qty: 2  },  // Losec
    { id: 'Cbl9g6MRkWi4guTnatmi', qty: 5  },  // MgSO4
    { id: 'q9cmgCCGpfSjfRkZ0E08', qty: 4  },  // NaHCO3
    { id: 'YqgQ3ks8MRgf96XnKJn6', qty: 2  },  // Nicadipine
    { id: 'wVLdK6hpCiQAdkDvKm2L', qty: 2  },  // NTG
    { id: '1jAYYduHp6mxmI2jumy9', qty: 2  },  // Onsia
    { id: 'J8mCdUUhJ5FC40d1z7xe', qty: 2  },  // Plasil
    { id: 'Tl0Zgomma19X35cOdHdI', qty: 2  },  // Solucortef
    { id: 'BjkVxTs2oqHKTOMVs8vo', qty: 2  },  // Tramal
    { id: '8MQCS1eI7Gh2AIoiLxst', qty: 1  },  // Xylocain 2% (ไม่มี Adrenaline)
    { id: 'vIPgsH0rQ5kz3CxA3BaS', qty: 1  },  // Xylocain 2% (มี Adrenaline)
    // ยากินและยาอื่นๆ sheet (skip ชุดยาออกหน่วยปฐมพยาบาล)
    { id: 'lM8knc8iBTdSOY5FP9V5', qty: 5  },  // Amlodipine 5 mg
    { id: 'CzICQLbGrRUK0P61wJQQ', qty: 5  },  // ASA gr V
    { id: 'i5SyJ54ymM315qAZMBGg', qty: 10 },  // Clopidogrel
    { id: 'e20oMOx9Jx5rWj3c8MqY', qty: 30 },  // Fecainide Oral
    { id: '0bLotKczGDkAWtDzdvCA', qty: 5  },  // Hydralazine 10 mg
    { id: 'tDeMBonDF1LbtYEGTe08', qty: 5  },  // Hydralazine 25 mg
    { id: '4XuSnPy65in5T9QkF0OC', qty: 5  },  // Isordil 5 mg
    { id: 'LftFYwmcV1KKzZ66H1TB', qty: 20 },  // Omeprazole 20 mg
    { id: 'SzRfKLqAFI0EF5N4OPcq', qty: 10 },  // Ticagrelor
    { id: 'wcnglCrm8ENy7jOy4Qg2', qty: 20 },  // Celebrex
    { id: 'STt9Eprogv26vME3cOTQ', qty: 20 },  // Nexium
    { id: 'rSEM21DubOvizKJXYlhG', qty: 20 },  // Meditab
    { id: '7TcWAMh88vuJvmva6SRP', qty: 20 },  // Augmentin
    { id: '768eZAdtMUphFxA3cmDC', qty: 5  },  // Berodual NB
    { id: 'bQwBcT2285lA6GKUWknC', qty: 5  },  // Ventolin NB
    { id: 'YGNWCDdBlp6aULBBGnMp', qty: 5  },  // Pulmiclot NB
    { id: 'hJN2vcAZqorOLDjsnUWW', qty: 2  },  // Berodural MDI
    { id: 'w3xBZQSCMMdV8Kr6vjJI', qty: 2  },  // Dicofenac GEL
    { id: 'qVvTznJqmvE4BEQ6SNaw', qty: 2  },  // Calamine
  ]

  // Vaccines/antivenoms for รับเสด็จ
  const vaccineItems = [
    { name: 'เซรุ่มงูกะปะ',              qty: 3 },
    { name: 'เซรุ่มงูเห่า',               qty: 5 },
    { name: 'เซรุ่มงูเขียวหางไหม้',       qty: 3 },
    { name: 'เซรุ่มงูทับสมิงคลา',         qty: 3 },
    { name: 'เซรุ่มงูแมวเซา',             qty: 3 },
    { name: 'เซรุ่มงูระบบเลือด',          qty: 3 },
    { name: 'เซรุ่มงูรวมระบบประสาท',      qty: 5 },
    { name: 'วัคซีนป้องกันบาดทะยัก (dT)', qty: 2 },
    { name: 'Tetagam',                    qty: 2 },
    { name: 'PCEC',                       qty: 2 },
    { name: 'HRIG',                       qty: 3 },
  ]

  const allRasadetItems = [
    ...rasadetInj.map(i => ({ ...i, name: null })),
    ...vaccineItems.map(i => ({ id: vaccineIds[i.name], qty: i.qty, name: null })),
  ]

  console.log(`  Creating ${allRasadetItems.length} items for รับเสด็จ...`)
  for (let i = 0; i < allRasadetItems.length; i++) {
    const { id: drugId, qty } = allRasadetItems[i]
    if (!drugId) { console.warn(`  SKIP: no drugId at index ${i}`); continue }
    const drug = drugs[drugId] || Object.values(drugs).find(d => d.id === drugId)
    if (!drug) {
      // might be a vaccine just created - get from vaccineIds
      const vacName = Object.keys(vaccineIds).find(k => vaccineIds[k] === drugId)
      if (!vacName) { console.warn(`  SKIP unknown drug: ${drugId}`); continue }
      const vac = vaccines.find(v => v.name === vacName)
      await createSetItem(rasadetSetId, UT_RASADET, drugId, vacName, vac?.strength ?? '', vac?.dosageForm ?? '', vac?.unit ?? 'vial', qty, '', i, token)
    } else {
      await createSetItem(rasadetSetId, UT_RASADET, drugId, drug.name, drug.strength, drug.dosageForm, drug.unit, qty, '', i, token)
    }
    process.stdout.write('.')
  }
  console.log('\n  Done.')

  // ─── 5. Create พอ.สว. defaultSet + items (vaccines/antivenoms only) ─────────
  console.log('\n5. Creating พอ.สว. defaultSet...')
  const posaewSetId = await getOrCreateDefaultSet(
    UT_POSAEW, 'พอ.สว.',
    'ชุดยาสำหรับหน่วย พอ.สว.',
    'วัคซีน/เซรุ่มงู สำหรับหน่วย พอ.สว.',
    token
  )

  const allPosaewItems2 = await listDocs('defaultSetItems', token)
  const posaewToDelete = allPosaewItems2.filter(d => d.fields?.setId?.stringValue === posaewSetId)
  if (posaewToDelete.length > 0) {
    console.log(`  Deleting ${posaewToDelete.length} existing พอ.สว. items...`)
    for (const item of posaewToDelete) {
      await req(`https://firestore.googleapis.com/v1/${item.name}`, { method: 'DELETE', token })
    }
  }

  console.log(`  Creating ${vaccineItems.length} vaccine/antivenom items for พอ.สว....`)
  for (let i = 0; i < vaccineItems.length; i++) {
    const { name, qty } = vaccineItems[i]
    const drugId = vaccineIds[name]
    if (!drugId) { console.warn(`  SKIP: no id for ${name}`); continue }
    const vac = vaccines.find(v => v.name === name)
    await createSetItem(posaewSetId, UT_POSAEW, drugId, name, vac?.strength ?? '', vac?.dosageForm ?? '', vac?.unit ?? 'vial', qty, '', i, token)
    process.stdout.write('.')
  }
  console.log('\n  Done.')

  console.log('\n✓ All done!')
  console.log(`  ปฐมพยาบาล: ${pratHomItems.length} items`)
  console.log(`  รับเสด็จ: ${allRasadetItems.length} items`)
  console.log(`  พอ.สว.: ${vaccineItems.length} items`)
}

main().catch(console.error)
