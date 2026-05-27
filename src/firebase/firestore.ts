import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseApp } from './config'

function getDb() {
  return getFirestore(getFirebaseApp())
}

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

// ─── User Profile ─────────────────────────────────────────────────────────────

import type { UserProfile, UserRole } from '../types/user'

function docToUserProfile(id: string, data: DocumentData): UserProfile {
  return {
    uid: id,
    username: data.username ?? '',
    usernameLower: data.usernameLower ?? '',
    email: data.email ?? '',
    displayName: data.displayName ?? '',
    role: (data.role as UserRole) ?? 'viewer',
    active: data.active ?? false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getDb()
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return docToUserProfile(snap.id, snap.data())
}

export async function createUserProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = getDb()
  await setDoc(doc(db, 'users', profile.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// ─── Drug ─────────────────────────────────────────────────────────────────────

import type { Drug, DrugFormData } from '../types/drug'

function docToDrug(id: string, data: DocumentData): Drug {
  return {
    id,
    code: data.code ?? '',
    name: data.name ?? '',
    genericName: data.genericName ?? '',
    tradeName: data.tradeName ?? '',
    strength: data.strength ?? '',
    dosageForm: data.dosageForm ?? '',
    unit: data.unit ?? '',
    pricePerUnit: data.pricePerUnit ?? 0,
    instruction: data.instruction ?? '',
    warning: data.warning ?? '',
    labelNote: data.labelNote ?? '',
    active: data.active ?? true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: data.createdBy ?? '',
    updatedBy: data.updatedBy ?? '',
  }
}

export async function getActiveDrugs(): Promise<Drug[]> {
  const db = getDb()
  const q = query(collection(db, 'drugs'), where('active', '==', true), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => docToDrug(d.id, d.data()))
}

export async function getAllDrugs(): Promise<Drug[]> {
  const db = getDb()
  const q = query(collection(db, 'drugs'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => docToDrug(d.id, d.data()))
}

export async function getDrugById(drugId: string): Promise<Drug | null> {
  const db = getDb()
  const snap = await getDoc(doc(db, 'drugs', drugId))
  if (!snap.exists()) return null
  return docToDrug(snap.id, snap.data())
}

export async function createDrug(data: DrugFormData, uid: string): Promise<string> {
  const db = getDb()
  const ref = await addDoc(collection(db, 'drugs'), {
    ...data,
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateDrug(drugId: string, data: Partial<DrugFormData>, uid: string): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, 'drugs', drugId), {
    ...data,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })
}

export async function deactivateDrug(drugId: string, uid: string): Promise<void> {
  await updateDrug(drugId, { active: false }, uid)
}

// ─── Unit Type ────────────────────────────────────────────────────────────────

import type { UnitType, UnitTypeFormData } from '../types/unit'

function docToUnitType(id: string, data: DocumentData): UnitType {
  return {
    id,
    name: data.name ?? '',
    description: data.description ?? '',
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: data.createdBy ?? '',
    updatedBy: data.updatedBy ?? '',
  }
}

export async function getActiveUnitTypes(): Promise<UnitType[]> {
  const db = getDb()
  const q = query(collection(db, 'unitTypes'), where('active', '==', true), orderBy('sortOrder'))
  const snap = await getDocs(q)
  return snap.docs.map(d => docToUnitType(d.id, d.data()))
}

export async function getAllUnitTypes(): Promise<UnitType[]> {
  const db = getDb()
  const q = query(collection(db, 'unitTypes'), orderBy('sortOrder'))
  const snap = await getDocs(q)
  return snap.docs.map(d => docToUnitType(d.id, d.data()))
}

export async function createUnitType(data: UnitTypeFormData, uid: string): Promise<string> {
  const db = getDb()
  const ref = await addDoc(collection(db, 'unitTypes'), {
    ...data,
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateUnitType(unitTypeId: string, data: Partial<UnitTypeFormData>, uid: string): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, 'unitTypes', unitTypeId), {
    ...data,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })
}

// ─── Default Sets ─────────────────────────────────────────────────────────────

import type { DefaultSet, DefaultSetItem } from '../types/unit'

function docToDefaultSet(id: string, data: DocumentData): DefaultSet {
  return {
    id,
    unitTypeId: data.unitTypeId ?? '',
    unitTypeName: data.unitTypeName ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    active: data.active ?? true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: data.createdBy ?? '',
    updatedBy: data.updatedBy ?? '',
  }
}

function docToDefaultSetItem(id: string, data: DocumentData): DefaultSetItem {
  return {
    id,
    setId: data.setId ?? '',
    unitTypeId: data.unitTypeId ?? '',
    drugId: data.drugId ?? '',
    drugNameSnapshot: data.drugNameSnapshot ?? '',
    strengthSnapshot: data.strengthSnapshot ?? '',
    dosageFormSnapshot: data.dosageFormSnapshot ?? '',
    unitSnapshot: data.unitSnapshot ?? '',
    qtyPerSet: data.qtyPerSet ?? 1,
    note: data.note ?? '',
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getDefaultSetByUnitType(unitTypeId: string): Promise<DefaultSet | null> {
  const db = getDb()
  const q = query(collection(db, 'defaultSets'), where('unitTypeId', '==', unitTypeId), where('active', '==', true))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return docToDefaultSet(d.id, d.data())
}

export async function getOrCreateDefaultSet(unitTypeId: string, unitTypeName: string, uid: string): Promise<DefaultSet> {
  const existing = await getDefaultSetByUnitType(unitTypeId)
  if (existing) return existing
  const db = getDb()
  const ref = await addDoc(collection(db, 'defaultSets'), {
    unitTypeId,
    unitTypeName,
    name: `ชุดยาเริ่มต้น - ${unitTypeName}`,
    description: '',
    active: true,
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return {
    id: ref.id,
    unitTypeId,
    unitTypeName,
    name: `ชุดยาเริ่มต้น - ${unitTypeName}`,
    description: '',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: uid,
    updatedBy: uid,
  }
}

export async function getDefaultSetItems(setId: string): Promise<DefaultSetItem[]> {
  const db = getDb()
  const q = query(
    collection(db, 'defaultSetItems'),
    where('setId', '==', setId),
    where('active', '==', true),
    orderBy('sortOrder')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => docToDefaultSetItem(d.id, d.data()))
}

export async function addDefaultSetItem(
  item: Omit<DefaultSetItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDb()
  const ref = await addDoc(collection(db, 'defaultSetItems'), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateDefaultSetItem(itemId: string, data: Partial<DefaultSetItem>): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, 'defaultSetItems', itemId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDefaultSetItem(itemId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, 'defaultSetItems', itemId))
}

// ─── Field Units ──────────────────────────────────────────────────────────────

import type { FieldUnit, FieldUnitItem, FieldUnitFormData, FieldUnitItemDraft } from '../types/fieldUnit'

function docToFieldUnit(id: string, data: DocumentData): FieldUnit {
  return {
    id,
    fiscalYear: data.fiscalYear ?? 0,
    unitTypeId: data.unitTypeId ?? '',
    unitTypeName: data.unitTypeName ?? '',
    eventDate: data.eventDate ?? '',
    location: data.location ?? '',
    responsiblePerson: data.responsiblePerson ?? '',
    numberOfSets: data.numberOfSets ?? 1,
    status: data.status ?? 'saved',
    note: data.note ?? '',
    createdBy: data.createdBy ?? '',
    createdByName: data.createdByName ?? '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

function docToFieldUnitItem(id: string, data: DocumentData): FieldUnitItem {
  return {
    id,
    fieldUnitId: data.fieldUnitId ?? '',
    drugId: data.drugId ?? '',
    drugCodeSnapshot: data.drugCodeSnapshot ?? '',
    drugNameSnapshot: data.drugNameSnapshot ?? '',
    genericNameSnapshot: data.genericNameSnapshot ?? '',
    tradeNameSnapshot: data.tradeNameSnapshot ?? '',
    strengthSnapshot: data.strengthSnapshot ?? '',
    dosageFormSnapshot: data.dosageFormSnapshot ?? '',
    unitSnapshot: data.unitSnapshot ?? '',
    pricePerUnitSnapshot: data.pricePerUnitSnapshot ?? 0,
    instructionSnapshot: data.instructionSnapshot ?? '',
    warningSnapshot: data.warningSnapshot ?? '',
    labelNoteSnapshot: data.labelNoteSnapshot ?? '',
    qtyPerSet: data.qtyPerSet ?? 0,
    numberOfSets: data.numberOfSets ?? 1,
    totalQty: data.totalQty ?? 0,
    note: data.note ?? '',
    sortOrder: data.sortOrder ?? 0,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function createFieldUnit(
  formData: FieldUnitFormData,
  items: FieldUnitItemDraft[],
  uid: string,
  displayName: string,
  fiscalYear: number
): Promise<string> {
  const db = getDb()
  const unitRef = await addDoc(collection(db, 'fieldUnits'), {
    fiscalYear,
    unitTypeId: formData.unitTypeId,
    unitTypeName: formData.unitTypeName,
    eventDate: formData.eventDate,
    location: formData.location,
    responsiblePerson: formData.responsiblePerson,
    numberOfSets: formData.numberOfSets,
    status: 'saved',
    note: formData.note,
    createdBy: uid,
    createdByName: displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const itemPromises = items.map((item, idx) =>
    addDoc(collection(db, 'fieldUnitItems'), {
      fieldUnitId: unitRef.id,
      drugId: item.drugId,
      drugCodeSnapshot: item.drugCodeSnapshot,
      drugNameSnapshot: item.drugNameSnapshot,
      genericNameSnapshot: item.genericNameSnapshot,
      tradeNameSnapshot: item.tradeNameSnapshot,
      strengthSnapshot: item.strengthSnapshot,
      dosageFormSnapshot: item.dosageFormSnapshot,
      unitSnapshot: item.unitSnapshot,
      pricePerUnitSnapshot: item.pricePerUnitSnapshot,
      instructionSnapshot: item.instructionSnapshot,
      warningSnapshot: item.warningSnapshot,
      labelNoteSnapshot: item.labelNoteSnapshot,
      qtyPerSet: item.qtyPerSet,
      numberOfSets: formData.numberOfSets,
      totalQty: item.qtyPerSet * formData.numberOfSets,
      note: item.note,
      sortOrder: item.sortOrder ?? idx,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  )
  await Promise.all(itemPromises)
  return unitRef.id
}

export async function getFieldUnitById(fieldUnitId: string): Promise<FieldUnit | null> {
  const db = getDb()
  const snap = await getDoc(doc(db, 'fieldUnits', fieldUnitId))
  if (!snap.exists()) return null
  return docToFieldUnit(snap.id, snap.data())
}

export async function getFieldUnitItems(fieldUnitId: string): Promise<FieldUnitItem[]> {
  const db = getDb()
  const q = query(
    collection(db, 'fieldUnitItems'),
    where('fieldUnitId', '==', fieldUnitId),
    orderBy('sortOrder')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => docToFieldUnitItem(d.id, d.data()))
}

export async function listRecentFieldUnits(limitCount: number = 20): Promise<FieldUnit[]> {
  const db = getDb()
  const q = query(collection(db, 'fieldUnits'), orderBy('createdAt', 'desc'), limit(limitCount))
  const snap = await getDocs(q)
  return snap.docs.map(d => docToFieldUnit(d.id, d.data()))
}

export async function updateFieldUnitStatus(fieldUnitId: string, status: string): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, 'fieldUnits', fieldUnitId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

// ─── Settings ─────────────────────────────────────────────────────────────────

import type { AppSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'

export async function getAppSettings(): Promise<AppSettings> {
  const db = getDb()
  const snap = await getDoc(doc(db, 'settings', 'app'))
  if (!snap.exists()) {
    return { ...DEFAULT_SETTINGS, updatedAt: new Date() }
  }
  const data = snap.data()
  return {
    appName: data.appName ?? DEFAULT_SETTINGS.appName,
    hospitalName: data.hospitalName ?? DEFAULT_SETTINGS.hospitalName,
    fiscalYearStartMonth: data.fiscalYearStartMonth ?? 10,
    labelWidthMm: data.labelWidthMm ?? DEFAULT_SETTINGS.labelWidthMm,
    labelHeightMm: data.labelHeightMm ?? DEFAULT_SETTINGS.labelHeightMm,
    labelColumns: data.labelColumns ?? DEFAULT_SETTINGS.labelColumns,
    labelRows: data.labelRows ?? DEFAULT_SETTINGS.labelRows,
    labelGapMm: data.labelGapMm ?? DEFAULT_SETTINGS.labelGapMm,
    labelMarginTopMm: data.labelMarginTopMm ?? DEFAULT_SETTINGS.labelMarginTopMm,
    labelMarginLeftMm: data.labelMarginLeftMm ?? DEFAULT_SETTINGS.labelMarginLeftMm,
    labelFontSizePx: data.labelFontSizePx ?? DEFAULT_SETTINGS.labelFontSizePx,
    updatedAt: toDate(data.updatedAt),
  }
}

export async function updateAppSettings(data: Partial<Omit<AppSettings, 'updatedAt'>>): Promise<void> {
  const db = getDb()
  await setDoc(doc(db, 'settings', 'app'), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export async function writeActivityLog(
  action: string,
  detail: string,
  uid: string,
  username: string
): Promise<void> {
  const db = getDb()
  await addDoc(collection(db, 'activityLogs'), {
    action,
    detail,
    uid,
    username,
    createdAt: serverTimestamp(),
  })
}
