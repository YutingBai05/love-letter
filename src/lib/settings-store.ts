import { supabase } from './supabase'

const defaults: Record<string, string> = {
  subtitle_home: '珍藏每一次心动',
  subtitle_postcard: '短小精悍，直击内心',
  subtitle_letter: '笔墨之中，见字如面',
}

let cache: Record<string, string> = { ...defaults }
let loaded = false

export async function loadSettings() {
  try {
    const { data } = await supabase.from('settings').select('*')
    if (data) {
      for (const row of data) {
        cache[row.key] = row.value
      }
    }
  } catch (e) {
    console.warn('[Settings] Failed to load from Supabase, using defaults')
  }
  loaded = true
}

export function getSetting(key: string): string {
  return cache[key] || defaults[key] || ''
}

export async function setSetting(key: string, value: string) {
  cache[key] = value
  await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
}

export async function setSettings(updates: Record<string, string>) {
  for (const [k, v] of Object.entries(updates)) {
    cache[k] = v
  }
  const rows = Object.entries(updates).map(([key, value]) => ({ key, value }))
  await supabase.from('settings').upsert(rows, { onConflict: 'key' })
}
