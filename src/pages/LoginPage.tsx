import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithUsername } from '../firebase/auth'
import { isFirebaseConfigured } from '../firebase/config'
import { writeActivityLog } from '../firebase/firestore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { toast } from 'sonner'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const configured = isFirebaseConfigured()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim()) { setError('กรุณากรอกชื่อผู้ใช้'); return }
    if (!password) { setError('กรุณากรอกรหัสผ่าน'); return }
    setError('')
    setLoading(true)
    try {
      const profile = await loginWithUsername(username.trim(), password)
      await writeActivityLog('login', `เข้าสู่ระบบสำเร็จ`, profile.uid, profile.username)
      toast.success(`ยินดีต้อนรับ ${profile.displayName}`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ'
      setError(msg.includes('invalid-credential') ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #e8f4ef 0%, #fbfdfc 48%, #fff7ed 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <img
            src="/logo.svg"
            alt="RxKit"
            className="w-16 h-16 rounded-2xl shadow-lg shadow-primary/25"
          />
          <div className="text-center">
            <h1 className="text-xl font-bold text-ink">ยาออกหน่วย</h1>
            <p className="text-sm text-muted">ระบบจัดเตรียมยาออกหน่วย</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-hairline rounded-xl shadow-xl shadow-primary/10 p-6">
          {!configured && (
            <div className="mb-4 p-3 bg-warning-bg border border-warning/20 rounded-md">
              <p className="text-xs text-warning-text font-medium">
                Firebase ยังไม่ได้ตั้งค่า กรุณาสร้างไฟล์ .env และระบุค่า VITE_FIREBASE_*
              </p>
            </div>
          )}

          <h2 className="text-sm font-semibold text-ink mb-5">เข้าสู่ระบบ</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="username"
              label="ชื่อผู้ใช้"
              placeholder="ชื่อผู้ใช้"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={!configured}
            />
            <Input
              id="password"
              label="รหัสผ่าน"
              type="password"
              placeholder="ระบุรหัสผ่าน"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={!configured}
            />

            {error && (
              <p className="text-xs text-error-text bg-error-bg border border-error/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!configured}
              className="w-full mt-1"
            >
              เข้าสู่ระบบ
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-soft mt-6">
          RxKit v1.0 · ระบบจัดยาออกหน่วย
        </p>
      </div>
    </div>
  )
}
