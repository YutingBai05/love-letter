import { supabase } from './supabase'

const defaults: Record<string, string> = {
  subtitle_home: '珍藏每一次心动',
  subtitle_postcard: '短小精悍，直击内心',
  subtitle_letter: '笔墨之中，见字如面',
}

const cache: Record<string, string> = { ...defaults }
let loaded = false

export async function loadSettings() {
  if (loaded) return
  try {
    const { data, error } = await supabase.from('settings').select('*')
    if (error) throw error
    if (data) {
      for (const row of data) {
        cache[row.key] = row.value
      }
    }
    loaded = true
  } catch (e) {
    console.warn('[Settings] Load failed, using defaults:', e)
  }
}

export function getSetting(key: string): string {
  return cache[key] || defaults[key] || ''
}

export async function setSetting(key: string, value: string) {
  cache[key] = value
  const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
  if (error) console.warn('[Settings] Upsert error:', key, error.message)
}

export async function setSettings(updates: Record<string, string>) {
  for (const [k, v] of Object.entries(updates)) cache[k] = v
  const rows = Object.entries(updates).map(([key, value]) => ({ key, value }))
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
  if (error) console.warn('[Settings] Batch upsert error:', error.message)
}
