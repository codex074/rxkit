import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import { getFieldUnitById, getFieldUnitItems, getAppSettings } from '../firebase/firestore'
import { Spinner } from '../components/ui/Spinner'
import { formatThaiDate } from '../utils/date'
import type { FieldUnit, FieldUnitItem } from '../types/fieldUnit'
import type { AppSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'

export function PrintChecklistPage() {
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

  return (
    <>
      {/* Toolbar - hidden on print */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-hairline bg-white">
        <Link to={`/field-units/${id}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={14} />
          กลับ
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-active"
        >
          <Printer size={16} />
          พิมพ์
        </button>
      </div>

      {/* Print content */}
      <div className="print-container p-8 max-w-[800px] mx-auto font-sans">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">{settings.hospitalName}</h1>
          <h2 className="text-lg font-bold mt-1">รายการจัดเตรียมยาออกหน่วย</h2>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm border border-gray-400 rounded p-4">
          <div className="flex gap-2">
            <span className="font-semibold w-32 flex-shrink-0">ประเภทหน่วย:</span>
            <span>{fieldUnit.unitTypeName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-32 flex-shrink-0">ปีงบประมาณ:</span>
            <span>{fieldUnit.fiscalYear}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-32 flex-shrink-0">วันที่ออกหน่วย:</span>
            <span>{formatThaiDate(fieldUnit.eventDate)}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-32 flex-shrink-0">จำนวนชุด:</span>
            <span>{fieldUnit.numberOfSets} ชุด</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-32 flex-shrink-0">สถานที่:</span>
            <span>{fieldUnit.location || '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-32 flex-shrink-0">ผู้รับผิดชอบ:</span>
            <span>{fieldUnit.responsiblePerson}</span>
          </div>
          {fieldUnit.note && (
            <div className="col-span-2 flex gap-2">
              <span className="font-semibold w-32 flex-shrink-0">หมายเหตุ:</span>
              <span>{fieldUnit.note}</span>
            </div>
          )}
        </div>

        {/* Medicine table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-2 text-center w-8">ลำดับ</th>
              <th className="border border-gray-400 px-3 py-2 text-left">ชื่อยา</th>
              <th className="border border-gray-400 px-3 py-2 text-center">ความแรง</th>
              <th className="border border-gray-400 px-3 py-2 text-center">รูปแบบ</th>
              <th className="border border-gray-400 px-2 py-2 text-center">จำนวน/ชุด</th>
              <th className="border border-gray-400 px-2 py-2 text-center">จำนวนชุด</th>
              <th className="border border-gray-400 px-2 py-2 text-center">จำนวนรวม</th>
              <th className="border border-gray-400 px-2 py-2 text-center">หน่วย</th>
              <th className="border border-gray-400 px-2 py-2 text-center w-10">จัดยา</th>
              <th className="border border-gray-400 px-2 py-2 text-center w-10">ตรวจสอบ</th>
              <th className="border border-gray-400 px-3 py-2 text-left">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-gray-400 px-2 py-2 text-center">{idx + 1}</td>
                <td className="border border-gray-400 px-3 py-2">
                  <div className="font-medium">{item.drugNameSnapshot}</div>
                  {item.genericNameSnapshot && (
                    <div className="text-xs text-gray-500">{item.genericNameSnapshot}</div>
                  )}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center">{item.strengthSnapshot || '-'}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{item.dosageFormSnapshot || '-'}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">{item.qtyPerSet}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">{item.numberOfSets}</td>
                <td className="border border-gray-400 px-2 py-2 text-center font-semibold">{item.totalQty}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">{item.unitSnapshot}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">
                  <input type="checkbox" className="print:appearance-none print:w-4 print:h-4 print:border print:border-black" />
                </td>
                <td className="border border-gray-400 px-2 py-2 text-center">
                  <input type="checkbox" className="print:appearance-none print:w-4 print:h-4 print:border print:border-black" />
                </td>
                <td className="border border-gray-400 px-3 py-2 text-xs">{item.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-10 grid grid-cols-3 gap-8 text-sm">
          <div className="text-center">
            <div className="border-b border-black mb-1 h-10" />
            <p>ผู้จัดยา</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-1 h-10" />
            <p>ผู้ตรวจสอบ</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-1 h-10" />
            <p>วันที่</p>
          </div>
        </div>
      </div>
    </>
  )
}
