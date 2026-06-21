import { supabase } from './supabase'
import type { Postcard, Letter, Folder } from './types'

const REST_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`
const REST_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function restGet(path: string) {
  const resp = await fetch(`${REST_URL}${path}`, {
    headers: { apikey: REST_KEY, Authorization: `Bearer ${REST_KEY}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`REST ${resp.status}`)
  return resp.json()
}

async function getUserId(): Promise<string | null> {
  const promise = supabase.auth.getSession()
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 5000))
  const result = await Promise.race([promise, timeout])
  if (!result) return null
  return result.data.session?.user?.id || null
}

// ===== Folders =====

export async function getFolders(userRole?: 'owner' | 'invitee'): Promise<Folder[]> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) return []

  let query = supabase.from('folders').select('*').order('created_at', { ascending: true })

  // If paired, also get partner's folders
  const { data: profile } = await supabase.from('profiles').select('paired_with').eq('id', userId).single()
  const partnerId = profile?.paired_with

  if (partnerId) {
    query = query.or(`user_id.eq.${userId},user_id.eq.${partnerId}`)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data } = await query

  const folders: Folder[] = (data || []).map((f) => ({
    id: f.id,
    name: f.name,
    isLocked: f.is_locked,
    createdBy: f.created_by,
  }))

  // Filter locked folders
  if (userRole) {
    return folders.filter((f) => {
      if (f.isLocked) return f.createdBy === userRole
      return true
    })
  }

  return folders
}

export async function addFolder(name: string, createdBy: 'owner' | 'invitee'): Promise<Folder> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) throw new Error('Not logged in')

  const { data, error } = await supabase.from('folders').insert({
    name,
    created_by: createdBy,
    is_locked: false,
    user_id: userId,
  }).select().single()

  if (error) throw error

  return {
    id: data.id,
    name: data.name,
    isLocked: data.is_locked,
    createdBy: data.created_by,
  }
}

export async function lockFolder(id: string) {
  await supabase.from('folders').update({ is_locked: true }).eq('id', id)
}

export async function unlockFolder(id: string) {
  await supabase.from('folders').update({ is_locked: false }).eq('id', id)
}

export async function deleteFolder(id: string) {
  await supabase.from('folders').delete().eq('id', id)
}

export async function canModifyFolder(folderId: string, userRole: 'owner' | 'invitee'): Promise<boolean> {
  const { data } = await supabase.from('folders').select('created_by').eq('id', folderId).single()
  return data?.created_by === userRole
}

// ===== Postcards =====

export async function getPostcards(): Promise<Postcard[]> {
  const userId = await getUserId()
  console.log('[Store] getPostcards userId:', userId)
  if (!userId) return []

  let partnerId: string | null = null
  try { const p = await restGet(`/profiles?select=paired_with&id=eq.${userId}`); partnerId = p?.[0]?.paired_with || null } catch {}
  console.log('[Store] getPostcards partnerId:', partnerId)

  const filter = partnerId
    ? `author_id=in.(${userId},${partnerId})`
    : `author_id=eq.${userId}`
  console.log('[Store] getPostcards filter:', filter)

  try {
    const data = await restGet(`/postcards?select=*&order=created_at.desc&${filter}`)
    console.log('[Store] getPostcards result:', data?.length, 'postcards')
    return (data || []).map(mapPostcard)
  } catch (e) {
    console.error('[Store] getPostcards error:', e)
    return []
  }
}

export async function getPostcardsByFolder(folderId: string): Promise<Postcard[]> {
  const all = await getPostcards()
  return all.filter((p) => p.folderId === folderId)
}

export async function savePostcard(data: {
  folderId?: string
  content: string
  bgColor: string
  mood: string
  authorNickname: string
}): Promise<Postcard> {
  const userId = await getUserId()
  if (!userId) throw new Error('Not logged in')

  console.log('[Store] savePostcard userId:', userId, 'nickname:', data.authorNickname)

  const folderId = data.folderId && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(data.folderId) ? data.folderId : null

  const resp = await fetch(`${REST_URL}/postcards`, {
    method: 'POST',
    headers: {
      apikey: REST_KEY,
      Authorization: `Bearer ${REST_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      folder_id: folderId,
      content: data.content,
      bg_color: data.bgColor,
      mood: data.mood,
      author_nickname: data.authorNickname,
      author_id: userId,
      read: false,
      created_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!resp.ok) {
    const err = await resp.text()
    console.error('[Store] savePostcard REST error:', resp.status, err)
    throw new Error(`保存失败: ${resp.status}`)
  }

  const result = await resp.json()
  console.log('[Store] Postcard saved:', result[0]?.id)
  return mapPostcard(result[0])
}

export async function getLatestPostcard(folderId?: string): Promise<Postcard | null> {
  const all = await getPostcards()
  const filtered = folderId ? all.filter((p) => p.folderId === folderId) : all
  return filtered[0] || null
}

export async function getRandomPostcard(folderId?: string): Promise<Postcard | null> {
  const all = await getPostcards()
  const filtered = folderId ? all.filter((p) => p.folderId === folderId) : all
  if (filtered.length === 0) return null
  return filtered[Math.floor(Math.random() * filtered.length)]
}

export async function getOnThisDayPostcard(folderId?: string): Promise<Postcard | null> {
  const all = await getPostcards()
  const filtered = folderId ? all.filter((p) => p.folderId === folderId) : all
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(today.getFullYear() - 1)
  const targetStr = oneYearAgo.toISOString().slice(0, 10)
  return filtered.find((p) => p.createdAt.slice(0, 10) === targetStr) || null
}

export async function getUnreadCount(): Promise<number> {
  const all = await getPostcards()
  return all.filter((p) => !p.read).length
}

export async function markAsRead(id: string) {
  await supabase.from('postcards').update({ read: true }).eq('id', id)
}

// ===== Letters =====

export async function getLetters(): Promise<Letter[]> {
  const userId = await getUserId()
  if (!userId) return []

  let partnerId: string | null = null
  try { const p = await restGet(`/profiles?select=paired_with&id=eq.${userId}`); partnerId = p?.[0]?.paired_with || null } catch {}

  const filter = partnerId
    ? `author_id=in.(${userId},${partnerId})`
    : `author_id=eq.${userId}`

  try {
    const data = await restGet(`/letters?select=*&order=created_at.desc&${filter}`)
    return (data || []).map(mapLetter)
  } catch { return [] }
}

export async function getLettersByFolder(folderId: string): Promise<Letter[]> {
  const all = await getLetters()
  return all.filter((l) => l.folderId === folderId)
}

export async function saveLetter(data: {
  folderId?: string
  content: string
  paperTemplate: string
  fontFamily: string
  authorNickname: string
}): Promise<Letter> {
  const userId = await getUserId()
  if (!userId) throw new Error('Not logged in')

  const folderId = data.folderId && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(data.folderId) ? data.folderId : null

  const resp = await fetch(`${REST_URL}/letters`, {
    method: 'POST',
    headers: {
      apikey: REST_KEY,
      Authorization: `Bearer ${REST_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      folder_id: folderId,
      content: data.content,
      paper_template: data.paperTemplate,
      font_family: data.fontFamily,
      author_nickname: data.authorNickname,
      author_id: userId,
      read: false,
      created_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`保存失败: ${resp.status}`)
  }

  const result = await resp.json()
  return mapLetter(result[0])
}

export async function getLetterUnreadCount(): Promise<number> {
  const all = await getLetters()
  return all.filter((l) => !l.read).length
}

export async function markLetterAsRead(id: string) {
  await supabase.from('letters').update({ read: true }).eq('id', id)
}

// ===== Helpers =====

function mapPostcard(r: Record<string, unknown>): Postcard {
  return {
    id: r.id as string,
    folderId: (r.folder_id as string) || '',
    content: (r.content as string) || '',
    bgColor: (r.bg_color as string) || '#FFF8F0',
    mood: (r.mood as string) || '',
    authorNickname: (r.author_nickname as string) || '',
    createdAt: (r.created_at as string) || '',
    read: (r.read as boolean) || false,
  }
}

function mapLetter(r: Record<string, unknown>): Letter {
  return {
    id: r.id as string,
    folderId: (r.folder_id as string) || '',
    content: (r.content as string) || '',
    paperTemplate: (r.paper_template as string) || 'blank',
    fontFamily: (r.font_family as string) || 'serif',
    authorNickname: (r.author_nickname as string) || '',
    createdAt: (r.created_at as string) || '',
    read: (r.read as boolean) || false,
  }
}

// Legacy sync helper for current folder
export function getCurrentFolderId(): string {
  return localStorage.getItem('love-letter-current-folder') || 'default'
}

export function setCurrentFolderId(id: string) {
  localStorage.setItem('love-letter-current-folder', id)
}
