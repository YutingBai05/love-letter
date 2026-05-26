import { supabase } from './supabase'

const defaults: Record<string, string> = {
  subtitle_home: '珍藏每一次心动',
  subtitle_postcard: '短小精悍，直击内心',
  subtitle_letter: '笔墨之中，见字如面',
}

const cache: Record<string, string> = {}

function loadFromLocal(): Record<string, string> {
  try {
    const raw = localStorage.getItem('love-letter-settings')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToLocal(data: Record<string, string>) {
  localStorage.setItem('love-letter-settings', JSON.stringify(data))
}

export async function loadSettings() {
  // Start with defaults
  Object.assign(cache, defaults)

  // Load from localStorage (always works)
  const local = loadFromLocal()
  Object.assign(cache, local)

  // Try Supabase (may fail silently)
  try {
    const promise = supabase.from('settings').select('*')
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 4000))
    const result = await Promise.race([promise, timeout])

    if (result && !result.error && result.data) {
      for (const row of result.data) {
        cache[row.key] = row.value
      }
      // Sync Supabase data back to localStorage
      saveToLocal(cache)
    }
  } catch {
    // Supabase unavailable, localStorage data already loaded
  }
}

export function getSetting(key: string): string {
  return cache[key] || defaults[key] || ''
}

export async function setSetting(key: string, value: string) {
  cache[key] = value
  saveToLocal(cache)

  // Fire-and-forget to Supabase
  supabase.from('settings').upsert({ key, value }, { onConflict: 'key' }).then(({ error }) => {
    if (error) console.warn('[Settings] Upsert error:', key, error.message)
  }).catch(() => {})
}

export async function setSettings(updates: Record<string, string>) {
  for (const [k, v] of Object.entries(updates)) {
    cache[k] = v
  }
  saveToLocal(cache)

  const rows = Object.entries(updates).map(([key, value]) => ({ key, value }))
  supabase.from('settings').upsert(rows, { onConflict: 'key' }).then(({ error }) => {
    if (error) console.warn('[Settings] Batch upsert error:', error.message)
  }).catch(() => {})
}
