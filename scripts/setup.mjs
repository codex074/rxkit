#!/usr/bin/env node
/**
 * RxKit Initial Setup Script
 * ใช้ Firebase Identity Platform REST API + Firestore REST API
 * ผ่าน gcloud auth token (ไม่ต้องการ service account key)
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')

const PROJECT_ID = 'rxkit-a2c07'
const ADMIN_EMAIL = 'rxopd@rxkit.local'
const ADMIN_PASSWORD = 'rx1234'
const ADMIN_USERNAME = 'RxOPD'
const ADMIN_DISPLAY_NAME = 'RxOPD Admin'
const HOSPITAL_NAME = 'โรงพยาบาลของท่าน'

const AUTH_MGMT = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function log(msg) { console.log(`\x1b[36m▸\x1b[0m ${msg}`) }
function ok(msg)  { console.log(`\x1b[32m✓\x1b[0m ${msg}`) }
function warn(msg){ console.log(`\x1b[33m⚠\x1b[0m ${msg}`) }
function err(msg) { console.error(`\x1b[31m✗\x1b[0m ${msg}`) }

// ─── REST helpers ─────────────────────────────────────────────────────────────

async function req(url, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    headers['X-Goog-User-Project'] = PROJECT_ID
  }
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}: ${text.slice(0, 200)}`)
  return data
}

// Firestore field helpers
function str(v)  { return { stringValue: String(v) } }
function num(v)  { return { integerValue: String(Math.round(v)) } }
function bool(v) { return { booleanValue: Boolean(v) } }
function ts()    { return { timestampValue: new Date().toISOString() } }

async function fsSet(col, docId, fields, token) {
  return req(`${FS}/${col}/${docId}`, { method: 'PATCH', body: { fields }, token })
}

async function fsAdd(col, docId, fields, token) {
  return req(`${FS}/${col}?documentId=${docId}`, { method: 'POST', body: { fields }, token })
}

// Firestore REST API uses PATCH for create+update (upsert)
// Use POST to create a new auto-ID document
async function fsCreate(col, fields, token) {
  return req(`${FS}/${col}`, { method: 'POST', body: { fields }, token })
}

// ─── Firestore seed rules ─────────────────────────────────────────────────────

const SEED_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /settings/{doc} {
      allow read, write: if request.auth != null;
    }
    match /unitTypes/{doc} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\x1b[1m🚀 RxKit Setup — สร้างข้อมูลเริ่มต้น\x1b[0m\n')

  // ── Get gcloud admin token ─────────────────────────────────────────────────
  log('กำลังรับ gcloud access token...')
  const token = execSync('gcloud auth print-access-token').toString().trim()
  ok('Access token สำเร็จ')

  // ── Deploy seed rules ──────────────────────────────────────────────────────
  log('กำลัง deploy Firestore rules สำหรับ seed...')
  const rulesPath = join(ROOT, 'firestore.rules')
  const originalRules = readFileSync(rulesPath, 'utf8')
  writeFileSync(rulesPath, SEED_RULES, 'utf8')
  try {
    execSync(`firebase use ${PROJECT_ID}`, { cwd: ROOT, stdio: 'pipe' })
    execSync('firebase deploy --only firestore:rules', { cwd: ROOT, stdio: 'pipe' })
    ok('Deploy seed rules สำเร็จ')
  } catch (e) {
    writeFileSync(rulesPath, originalRules, 'utf8')
    err(`Deploy rules ล้มเหลว: ${e.message}`)
    process.exit(1)
  }

  try {
    // ── Create / update admin user ──────────────────────────────────────────
    log(`กำลังตรวจสอบบัญชี ${ADMIN_EMAIL}...`)

    // ค้นหา user เดิม
    let uid = null
    try {
      const lookup = await req(`${AUTH_MGMT}/accounts:lookup`, {
        method: 'POST',
        body: { email: [ADMIN_EMAIL] },
        token,
      })
      const users = lookup.users ?? []
      if (users.length > 0) {
        uid = users[0].localId
        warn(`พบบัญชีเดิม UID: ${uid} — กำลังอัปเดต password...`)
        await req(`${AUTH_MGMT}/accounts:update`, {
          method: 'POST',
          body: { localId: uid, password: ADMIN_PASSWORD, displayName: ADMIN_DISPLAY_NAME },
          token,
        })
        ok(`อัปเดต password สำเร็จ`)
      }
    } catch (e) {
      if (!e.message.includes('USER_NOT_FOUND')) warn(`lookup: ${e.message}`)
    }

    if (!uid) {
      log('กำลังสร้างบัญชีใหม่...')
      const created = await req(`${AUTH_MGMT}/accounts`, {
        method: 'POST',
        body: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: ADMIN_DISPLAY_NAME,
          emailVerified: true,
        },
        token,
      })
      uid = created.localId
      ok(`สร้างบัญชีสำเร็จ UID: ${uid}`)
    }

    // ── User profile in Firestore ──────────────────────────────────────────
    log('กำลังสร้าง user profile ใน Firestore...')
    await fsSet('users', uid, {
      uid: str(uid),
      username: str(ADMIN_USERNAME),
      usernameLower: str(ADMIN_USERNAME.toLowerCase()),
      email: str(ADMIN_EMAIL),
      displayName: str(ADMIN_DISPLAY_NAME),
      role: str('admin'),
      active: bool(true),
      createdAt: ts(),
      updatedAt: ts(),
    }, token)
    ok('User profile สำเร็จ')

    // ── App settings ───────────────────────────────────────────────────────
    log('กำลังสร้าง app settings...')
    await fsSet('settings', 'app', {
      appName: str('RxKit'),
      hospitalName: str(HOSPITAL_NAME),
      fiscalYearStartMonth: num(10),
      labelWidthMm: num(70),
      labelHeightMm: num(35),
      labelColumns: num(3),
      labelRows: num(8),
      labelGapMm: num(2),
      labelMarginTopMm: num(10),
      labelMarginLeftMm: num(5),
      labelFontSizePx: num(10),
      updatedAt: ts(),
    }, token)
    ok('App settings สำเร็จ')

    // ── Unit types ─────────────────────────────────────────────────────────
    log('กำลังตรวจสอบ unit types...')
    const existingUt = await req(`${FS}/unitTypes?pageSize=1`, { token })
    if (existingUt.documents?.length > 0) {
      warn('unitTypes มีข้อมูลอยู่แล้ว ข้ามขั้นตอนนี้')
    } else {
      log('กำลังสร้าง unit types...')
      const unitTypes = [
        { name: 'ปฐมพยาบาล', description: 'หน่วยปฐมพยาบาลทั่วไป', sortOrder: 1 },
        { name: 'รับเสด็จ',   description: 'หน่วยรับเสด็จ',         sortOrder: 2 },
        { name: 'น้ำท่วม',    description: 'หน่วยช่วยเหลือน้ำท่วม',  sortOrder: 3 },
        { name: 'พอ.สว.',     description: 'หน่วยแพทย์อาสา พอ.สว.', sortOrder: 4 },
        { name: 'อื่นๆ',      description: 'หน่วยออกปฏิบัติอื่นๆ',  sortOrder: 5 },
      ]
      for (const ut of unitTypes) {
        await fsCreate('unitTypes', {
          name: str(ut.name),
          description: str(ut.description),
          active: bool(true),
          sortOrder: num(ut.sortOrder),
          createdBy: str(uid),
          updatedBy: str(uid),
          createdAt: ts(),
          updatedAt: ts(),
        }, token)
        ok(`  ${ut.name}`)
      }
    }

  } finally {
    // ── Restore proper rules ───────────────────────────────────────────────
    log('กำลัง restore Firestore security rules...')
    writeFileSync(rulesPath, originalRules, 'utf8')
    try {
      execSync('firebase deploy --only firestore:rules,firestore:indexes', { cwd: ROOT, stdio: 'pipe' })
      ok('Deploy security rules สำเร็จ')
    } catch {
      warn('กรุณารัน: firebase deploy --only firestore:rules,firestore:indexes')
    }
  }

  console.log('\n\x1b[1m\x1b[32m✅ Setup เสร็จสมบูรณ์!\x1b[0m\n')
  console.log('  ชื่อผู้ใช้ : RxOPD')
  console.log('  รหัสผ่าน  : rx1234')
  console.log('\n  รัน: \x1b[1mnpm run dev\x1b[0m แล้วเปิด http://localhost:5173\n')
}

main().catch(e => {
  err(e.message ?? String(e))
  process.exit(1)
})
