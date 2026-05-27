import { useState, useEffect } from 'react'
import { getAppSettings } from '../firebase/firestore'
import type { AppSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS, updatedAt: new Date() })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAppSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { settings, loading, setSettings }
}
