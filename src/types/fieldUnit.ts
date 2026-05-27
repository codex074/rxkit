export type FieldUnitStatus = 'draft' | 'saved' | 'printed' | 'cancelled'

export interface FieldUnit {
  id: string
  fiscalYear: number
  unitTypeId: string
  unitTypeName: string
  eventDate: string
  location: string
  responsiblePerson: string
  numberOfSets: number
  status: FieldUnitStatus
  note: string
  createdBy: string
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

export interface FieldUnitItem {
  id: string
  fieldUnitId: string
  drugId: string
  drugCodeSnapshot: string
  drugNameSnapshot: string
  genericNameSnapshot: string
  tradeNameSnapshot: string
  strengthSnapshot: string
  dosageFormSnapshot: string
  unitSnapshot: string
  pricePerUnitSnapshot: number
  instructionSnapshot: string
  warningSnapshot: string
  labelNoteSnapshot: string
  qtyPerSet: number
  numberOfSets: number
  totalQty: number
  note: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface FieldUnitFormData {
  unitTypeId: string
  unitTypeName: string
  eventDate: string
  location: string
  responsiblePerson: string
  numberOfSets: number
  note: string
}

export interface FieldUnitItemDraft {
  drugId: string
  drugCodeSnapshot: string
  drugNameSnapshot: string
  genericNameSnapshot: string
  tradeNameSnapshot: string
  strengthSnapshot: string
  dosageFormSnapshot: string
  unitSnapshot: string
  pricePerUnitSnapshot: number
  instructionSnapshot: string
  warningSnapshot: string
  labelNoteSnapshot: string
  qtyPerSet: number
  note: string
  sortOrder: number
}
