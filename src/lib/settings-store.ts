const BASE = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const defaults: Record<string, string> = {
  subtitle_home: '珍藏每一次心动',
  subtitle_postcard: '短小精悍，直击内心',
  subtitle_letter: '笔墨之中，见字如面',
}

const cache: Record<string, string> = { ...defaults }

async function fetchApi(path: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const resp = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal })
    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`${resp.status}: ${err}`)
    }
    return resp.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function loadSettings() {
  try {
    console.log('[Settings] Loading via REST...')
    const data = await fetchApi('/settings?select=*')
    if (Array.isArray(data)) {
      for (const row of data) {
        cache[row.key] = row.value
      }
      console.log('[Settings] Loaded', data.length, 'items')
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
    await fetchApi('/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
      headers: { Prefer: 'resolution=merge-duplicates' },
    })
    console.log('[Settings] Saved:', key)
  } catch (e) {
    console.warn('[Settings] Save failed:', key, e)
  }
}

export async function setSettings(updates: Record<string, string>) {
  for (const [k, v] of Object.entries(updates)) cache[k] = v
  try {
    const rows = Object.entries(updates).map(([key, value]) => ({ key, value }))
    for (const row of rows) {
      await fetchApi('/settings', {
        method: 'POST',
        body: JSON.stringify(row),
        headers: { Prefer: 'resolution=merge-duplicates' },
      })
    }
    console.log('[Settings] Batch saved:', Object.keys(updates).join(', '))
  } catch (e) {
    console.warn('[Settings] Batch save failed:', e)
  }
}
