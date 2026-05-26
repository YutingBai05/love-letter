import { supabase } from './supabase'

const defaults: Record<string, string> = {
  subtitle_home: '珍藏每一次心动',
  subtitle_postcard: '短小精悍，直击内心',
  subtitle_letter: '笔墨之中，见字如面',
}

const cache: Record<string, string> = { ...defaults }

export async function loadSettings() {
  try {
    console.log('[Settings] Loading from Supabase...')
    const promise = supabase.from('settings').select('*')
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    const result = await Promise.race([promise, timeout])

    if (!result) {
      console.warn('[Settings] Load timed out, using defaults')
      return
    }

    const { data, error } = result
    if (error) {
      console.warn('[Settings] Load error:', error.message)
      return
    }

    if (data) {
      for (const row of data) {
        cache[row.key] = row.value
      }
      console.log('[Settings] Loaded', data.length, 'settings')
    }
  } catch (e) {
    console.warn('[Settings] Load failed:', e)
  }
}

export function getSetting(key: string): string {
  return cache[key] || defaults[key] || ''
}

export async function setSetting(key: string, value: string) {
  cache[key] = value
  try {
    console.log('[Settings] Saving:', key)
    const promise = supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    const result = await Promise.race([promise, timeout])

    if (!result) {
      console.warn('[Settings] Save timed out:', key)
      return
    }

    const { error } = result
    if (error) {
      console.error('[Settings] Save error:', key, error.message)
    } else {
      console.log('[Settings] Saved:', key)
    }
  } catch (e) {
    console.warn('[Settings] Save failed:', key, e)
  }
}

export async function setSettings(updates: Record<string, string>) {
  for (const [k, v] of Object.entries(updates)) {
    cache[k] = v
  }
  try {
    const rows = Object.entries(updates).map(([key, value]) => ({ key, value }))
    const promise = supabase.from('settings').upsert(rows, { onConflict: 'key' })
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    const result = await Promise.race([promise, timeout])

    if (!result) {
      console.warn('[Settings] Batch save timed out')
      return
    }

    const { error } = result
    if (error) {
      console.error('[Settings] Batch save error:', error.message)
    } else {
      console.log('[Settings] Batch saved:', Object.keys(updates).join(', '))
    }
  } catch (e) {
    console.warn('[Settings] Batch save failed:', e)
  }
}
