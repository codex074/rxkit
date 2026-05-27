import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import { getFieldUnitById, getFieldUnitItems, getAppSettings } from '../firebase/firestore'
import { Spinner } from '../components/ui/Spinner'
import { formatThaiDate } from '../utils/date'
import type { FieldUnit, FieldUnitItem } from '../types/fieldUnit'
import type { AppSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'

export function PrintLabelsPage() {
  const { id } = useParams<{ id: string }>()
  const [fieldUnit, setFieldUnit] = useState<FieldUnit | null>(null)
  const [items, setItems] = useState<FieldUnitItem[]>([])
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS, updatedAt: new Date() })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getFieldUnitById(id), getFieldUnitItems(id), getAppSettings()]).then(([fu, fui, s]) => {
      setFieldUnit(fu)
      setItems(fui)
      setSettings(s)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Spinner size={24} /></div>
  if (!fieldUnit) return <div className="p-8 text-muted text-sm">ไม่พบรายการ</div>

  const {
    labelWidthMm,
    labelHeightMm,
    labelColumns,
    labelGapMm,
    labelMarginTopMm,
    labelMarginLeftMm,
    labelFontSizePx,
    hospitalName,
  } = settings

  const labelStyle: React.CSSProperties = {
    width: `${labelWidthMm}mm`,
    height: `${labelHeightMm}mm`,
    fontSize: `${labelFontSizePx}px`,
    padding: '3mm',
    boxSizing: 'border-box',
    overflow: 'hidden',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
    border: '1px solid #ccc',
    fontFamily: 'Sarabun, TH SarabunPSK, Arial, sans-serif',
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${labelColumns}, ${labelWidthMm}mm)`,
    gap: `${labelGapMm}mm`,
    marginTop: `${labelMarginTopMm}mm`,
    marginLeft: `${labelMarginLeftMm}mm`,
  }

  return (
    <>
      {/* Toolbar */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-hairline bg-white">
        <Link to={`/field-units/${id}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={14} />
          กลับ
        </Link>
        <div className="flex-1" />
        <div className="text-xs text-muted">
          ฉลากขนาด {labelWidthMm}×{labelHeightMm}mm · {labelColumns} คอลัมน์
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-active"
        >
          <Printer size={16} />
          พิมพ์
        </button>
      </div>

      {/* Label grid */}
      <div style={gridStyle}>
        {items.map((item) => (
          <div key={item.id} style={labelStyle}>
            {/* Hospital name */}
            <div style={{ fontWeight: 700, fontSize: `${labelFontSizePx + 1}px`, borderBottom: '1px solid #ccc', paddingBottom: '1mm', marginBottom: '1mm' }}>
              {hospitalName}
            </div>
            {/* Drug name */}
            <div style={{ fontWeight: 700, fontSize: `${labelFontSizePx + 2}px` }}>
              {item.drugNameSnapshot}
            </div>
            {/* Strength / dosage form */}
            {(item.strengthSnapshot || item.dosageFormSnapshot) && (
              <div style={{ color: '#555' }}>
                {[item.strengthSnapshot, item.dosageFormSnapshot].filter(Boolean).join(' / ')}
              </div>
            )}
            {/* Instruction */}
            {item.instructionSnapshot && (
              <div style={{ marginTop: '1mm' }}>
                {item.instructionSnapshot}
              </div>
            )}
            {/* Warning */}
            {item.warningSnapshot && (
              <div style={{ color: '#cc0000', fontWeight: 600 }}>
                ⚠ {item.warningSnapshot}
              </div>
            )}
            {/* Qty / Unit type / Date */}
            <div style={{ marginTop: '1mm', borderTop: '1px solid #ccc', paddingTop: '1mm', display: 'flex', justifyContent: 'space-between' }}>
              <span>จำนวน: <strong>{item.totalQty} {item.unitSnapshot}</strong></span>
              <span style={{ color: '#555', fontSize: `${labelFontSizePx - 1}px` }}>
                {fieldUnit.unitTypeName}
              </span>
            </div>
            <div style={{ fontSize: `${labelFontSizePx - 1}px`, color: '#777' }}>
              วันที่: {formatThaiDate(fieldUnit.eventDate)}
            </div>
            {item.labelNoteSnapshot && (
              <div style={{ fontSize: `${labelFontSizePx - 1}px`, fontStyle: 'italic' }}>
                {item.labelNoteSnapshot}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
