import { useEffect, useRef, useState } from 'react'
import { fetchMenu, updateMenu } from '../lib/api'
import { DEFAULT_MENU } from '../lib/mockData'

export function useMenu() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('sprig_restaurant_menu')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return DEFAULT_MENU
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const firstRun = useRef(true)

  const reload = async () => {
    try {
      const menu = await fetchMenu()
      if (menu && menu.length > 0) {
        setItems(menu)
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      void reload()
    }
  }, [])

  // Persist owner edits to server & local storage
  const save = async (next) => {
    setItems(next)
    setSaving(true)
    try {
      const ok = await updateMenu(next)
      if (!ok) setError('Menu changes could not be saved on the server')
    } finally {
      setSaving(false)
    }
  }

  return { items, loading, error, save, reload, saving }
}
