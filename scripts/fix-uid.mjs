#!/usr/bin/env node
import { execSync } from 'node:child_process'

const PROJECT_ID = 'rxkit-a2c07'
const UID = '7wyueWDNqXbN09fc1Utbeng9kvo1'
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function str(v)  { return { stringValue: String(v) } }
function bool(v) { return { booleanValue: Boolean(v) } }
function ts()    { return { timestampValue: new Date().toISOString() } }

async function req(url, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Goog-User-Project': PROJECT_ID }
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}: ${text.slice(0, 300)}`)
  return data
}

const token = execSync('gcloud auth print-access-token').toString().trim()
console.log('Writing user profile for UID:', UID)

await req(`${FS}/users/${UID}`, {
  method: 'PATCH',
  token,
  body: {
    fields: {
      uid:           str(UID),
      username:      str('RxOPD'),
      usernameLower: str('rxopd'),
      email:         str('rxopd@rxkit.local'),
      displayName:   str('RxOPD Admin'),
      role:          str('admin'),
      active:        bool(true),
      createdAt:     ts(),
      updatedAt:     ts(),
    }
  }
})

console.log('Done. User profile created at users/' + UID)
