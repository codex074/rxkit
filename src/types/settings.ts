export interface AppSettings {
  appName: string
  hospitalName: string
  fiscalYearStartMonth: number
  labelWidthMm: number
  labelHeightMm: number
  labelColumns: number
  labelRows: number
  labelGapMm: number
  labelMarginTopMm: number
  labelMarginLeftMm: number
  labelFontSizePx: number
  updatedAt: Date
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'updatedAt'> = {
  appName: 'RxKit',
  hospitalName: 'โรงพยาบาล',
  fiscalYearStartMonth: 10,
  labelWidthMm: 70,
  labelHeightMm: 35,
  labelColumns: 3,
  labelRows: 8,
  labelGapMm: 2,
  labelMarginTopMm: 10,
  labelMarginLeftMm: 5,
  labelFontSizePx: 10,
}
