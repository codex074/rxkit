export interface UnitType {
  id: string
  name: string
  description: string
  active: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export interface UnitTypeFormData {
  name: string
  description: string
  active: boolean
  sortOrder: number
}

export interface DefaultSet {
  id: string
  unitTypeId: string
  unitTypeName: string
  name: string
  description: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export interface DefaultSetItem {
  id: string
  setId: string
  unitTypeId: string
  drugId: string
  drugNameSnapshot: string
  strengthSnapshot: string
  dosageFormSnapshot: string
  unitSnapshot: string
  qtyPerSet: number
  note: string
  active: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface DefaultSetItemFormData {
  drugId: string
  qtyPerSet: number
  note: string
  sortOrder: number
}
