export interface Drug {
  id: string
  code: string
  name: string
  genericName: string
  tradeName: string
  strength: string
  dosageForm: string
  unit: string
  pricePerUnit: number
  instruction: string
  warning: string
  labelNote: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export interface DrugFormData {
  code: string
  name: string
  genericName: string
  tradeName: string
  strength: string
  dosageForm: string
  unit: string
  pricePerUnit: number
  instruction: string
  warning: string
  labelNote: string
  active: boolean
}
