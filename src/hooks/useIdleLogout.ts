import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { logout } from '../firebase/auth'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const WARN_BEFORE_MS = 60 * 1000
const THROTTLE_MS = 2000
const STORAGE_KEY = 'rxkit:lastActivity'
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'] as const

export function useIdleLogout(enabled: boolean) {
  const warnTimerRef = useRef<number | null>(null)
  const logoutTimerRef = useRef<number | null>(null)
  const lastRecordRef = useRef(0)
  const warnedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const clearTimers = () => {
      if (warnTimerRef.current !== null) window.clearTimeout(warnTimerRef.current)
      if (logoutTimerRef.current !== null) window.clearTimeout(logoutTimerRef.current)
      warnTimerRef.current = null
      logoutTimerRef.current = null
    }

    const doLogout = async () => {
      clearTimers()
      try {
        await logout()
      } finally {
        try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
        toast.error('ออกจากระบบอัตโนมัติ เนื่องจากไม่ได้ใช้งานเกิน 30 นาที')
      }
    }

    const scheduleFrom = (remainingMs: number) => {
      clearTimers()
      warnedRef.current = false
      const warnIn = remainingMs - WARN_BEFORE_MS
      if (warnIn > 0) {
        warnTimerRef.current = window.setTimeout(() => {
          warnedRef.current = true
          toast.warning('ระบบจะออกจากระบบใน 1 นาที หากไม่มีการใช้งาน')
        }, warnIn)
      }
      logoutTimerRef.current = window.setTimeout(doLogout, Math.max(remainingMs, 0))
    }

    const recordActivity = () => {
      const now = Date.now()
      lastRecordRef.current = now
      try { localStorage.setItem(STORAGE_KEY, String(now)) } catch { /* ignore */ }
      scheduleFrom(IDLE_TIMEOUT_MS)
    }

    const onActivity = () => {
      const now = Date.now()
      if (now - lastRecordRef.current < THROTTLE_MS) return
      recordActivity()
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      const ts = Number(e.newValue)
      if (!ts) return
      lastRecordRef.current = ts
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - ts)
      scheduleFrom(remaining)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const stored = Number(localStorage.getItem(STORAGE_KEY) || 0)
      if (!stored) return recordActivity()
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - stored)
      if (remaining <= 0) {
        void doLogout()
      } else {
        lastRecordRef.current = stored
        scheduleFrom(remaining)
      }
    }

    // เริ่มต้น — เคารพ last activity ที่อาจถูกเซ็ตจาก tab อื่น
    const stored = Number(localStorage.getItem(STORAGE_KEY) || 0)
    const now = Date.now()
    if (stored && now - stored < IDLE_TIMEOUT_MS) {
      lastRecordRef.current = stored
      scheduleFrom(IDLE_TIMEOUT_MS - (now - stored))
    } else {
      recordActivity()
    }

    ACTIVITY_EVENTS.forEach(ev =>
      window.addEventListener(ev, onActivity, { passive: true })
    )
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])
}
