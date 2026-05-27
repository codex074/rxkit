import { useState, useEffect } from 'react'
import { getAppSettings, updateAppSettings } from '../firebase/firestore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { toast } from 'sonner'
import type { AppSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS, updatedAt: new Date() })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAppSettings().then(s => { setSettings(s); setLoading(false) })
  }, [])

  function set(key: keyof AppSettings, value: string | number) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateAppSettings({
        hospitalName: settings.hospitalName,
        labelWidthMm: settings.labelWidthMm,
        labelHeightMm: settings.labelHeightMm,
        labelColumns: settings.labelColumns,
        labelRows: settings.labelRows,
        labelGapMm: settings.labelGapMm,
        labelMarginTopMm: settings.labelMarginTopMm,
        labelMarginLeftMm: settings.labelMarginLeftMm,
        labelFontSizePx: settings.labelFontSizePx,
      })
      toast.success('บันทึกการตั้งค่าสำเร็จ')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={24} /></div>

  function numField(key: keyof AppSettings) {
    return {
      type: 'number' as const,
      value: String(settings[key] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, Number(e.target.value)),
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">ตั้งค่าระบบ</h1>
        <p className="text-sm text-muted mt-0.5">ข้อมูลโรงพยาบาลและการตั้งค่าฉลากยา</p>
      </div>

      {/* Hospital */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-ink mb-4">ข้อมูลโรงพยาบาล</h2>
        <Input
          label="ชื่อโรงพยาบาล / หน่วยงาน"
          value={settings.hospitalName}
          onChange={e => set('hospitalName', e.target.value)}
        />
      </Card>

      {/* Label config */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-ink mb-4">การตั้งค่าฉลากยา</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="ความกว้างฉลาก (mm)" {...numField('labelWidthMm')} min="20" />
          <Input label="ความสูงฉลาก (mm)" {...numField('labelHeightMm')} min="10" />
          <Input label="จำนวนคอลัมน์" {...numField('labelColumns')} min="1" max="6" />
          <Input label="จำนวนแถว" {...numField('labelRows')} min="1" max="20" />
          <Input label="ช่องว่างระหว่างฉลาก (mm)" {...numField('labelGapMm')} min="0" />
          <Input label="ระยะขอบบน (mm)" {...numField('labelMarginTopMm')} min="0" />
          <Input label="ระยะขอบซ้าย (mm)" {...numField('labelMarginLeftMm')} min="0" />
          <Input label="ขนาดตัวอักษร (px)" {...numField('labelFontSizePx')} min="6" max="20" />
        </div>

        {/* Preview */}
        <div className="mt-5 p-4 bg-surface-soft rounded-lg">
          <p className="text-xs font-medium text-muted mb-3">ตัวอย่างขนาดฉลาก</p>
          <div
            style={{
              width: `${Math.min(settings.labelWidthMm * 2, 280)}px`,
              height: `${Math.min(settings.labelHeightMm * 2, 140)}px`,
              fontSize: `${settings.labelFontSizePx}px`,
              border: '1px solid #ccc',
              padding: '6px',
              backgroundColor: 'white',
              fontFamily: 'Sarabun, sans-serif',
            }}
          >
            <div style={{ fontWeight: 700, borderBottom: '1px solid #ccc', paddingBottom: 2, marginBottom: 2 }}>
              {settings.hospitalName}
            </div>
            <div style={{ fontWeight: 700 }}>ชื่อยาตัวอย่าง 500 mg</div>
            <div style={{ color: '#555' }}>เม็ด</div>
            <div>รับประทาน 1 เม็ด วันละ 3 ครั้ง</div>
            <div style={{ borderTop: '1px solid #ccc', marginTop: 2, paddingTop: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span>จำนวน: <strong>30 เม็ด</strong></span>
              <span style={{ color: '#555' }}>ปฐมพยาบาล</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>บันทึกการตั้งค่า</Button>
      </div>
    </div>
  )
}
