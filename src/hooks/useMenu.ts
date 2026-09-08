import { useEffect, useRef, useState } from 'react'
import type { MenuItem } from '../types'
import { fetchMenu, updateMenu } from '../lib/api'

// Single source of truth is the server-side canonical menu. Every device
// (owner tablet AND customer phone) loads from /api/menu, so an owner's edit
// on one device is visible on every other device immediately on next load.
export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const firstRun = useRef(true)

  const reload = async () => {
    try {
      const menu = await fetchMenu()
      setItems(menu)
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

  // Persist owner edits to the server so all devices stay in sync.
  const save = async (next: MenuItem[]) => {
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
