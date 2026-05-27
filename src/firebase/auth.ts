import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirebaseApp } from './config'
import { getUserProfile } from './firestore'
import type { UserProfile } from '../types/user'

function getAuthInstance() {
  return getAuth(getFirebaseApp())
}

export async function loginWithUsername(username: string, password: string): Promise<UserProfile> {
  // รองรับทั้ง "RxOPD" และ "rxopd@rxkit.local"
  const cleaned = username.trim().toLowerCase().replace(/@rxkit\.local$/, '')
  const email = `${cleaned}@rxkit.local`
  const auth = getAuthInstance()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  let profile
  try {
    profile = await getUserProfile(credential.user.uid)
  } catch (fsErr) {
    await signOut(auth)
    throw fsErr
  }
  if (!profile) {
    await signOut(auth)
    throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ')
  }
  if (!profile.active) {
    await signOut(auth)
    throw new Error('บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
  }
  return profile
}

export async function logout(): Promise<void> {
  const auth = getAuthInstance()
  await signOut(auth)
}

export function onAuthChanged(callback: (user: User | null) => void) {
  const auth = getAuthInstance()
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): User | null {
  const auth = getAuthInstance()
  return auth.currentUser
}
