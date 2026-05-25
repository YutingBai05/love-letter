import type { Postcard, Letter, Folder } from './types'
import { getNickname } from './auth-store'

const FOLDERS_KEY = 'love-letter-folders'
const POSTCARDS_KEY = 'love-letter-postcards'
const LETTERS_KEY = 'love-letter-letters'
const CURRENT_FOLDER_KEY = 'love-letter-current-folder'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// --- Folders ---

function defaultFolders(): Folder[] {
  return [
    { id: 'default', name: '日常', isLocked: false, createdBy: 'owner' },
    { id: 'love', name: '情话', isLocked: false, createdBy: 'owner' },
    { id: 'memory', name: '回忆', isLocked: false, createdBy: 'owner' },
  ]
}

function getAllFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY)
    if (!raw) {
      const defaults = defaultFolders()
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(raw)
  } catch {
    return defaultFolders()
  }
}

function saveFolders(folders: Folder[]) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
}

export function getFolders(userRole?: 'owner' | 'invitee'): Folder[] {
  const all = getAllFolders()
  if (!userRole) return all
  return all.filter((f) => {
    if (f.isLocked) return f.createdBy === userRole
    return true
  })
}

export function addFolder(name: string, createdBy: 'owner' | 'invitee'): Folder {
  const folders = getAllFolders()
  const folder: Folder = {
    id: generateId(),
    name,
    isLocked: false,
    createdBy,
  }
  folders.push(folder)
  saveFolders(folders)
  return folder
}

export function lockFolder(id: string) {
  const folders = getAllFolders()
  const f = folders.find((x) => x.id === id)
  if (f) {
    f.isLocked = true
    saveFolders(folders)
  }
}

export function unlockFolder(id: string) {
  const folders = getAllFolders()
  const f = folders.find((x) => x.id === id)
  if (f) {
    f.isLocked = false
    saveFolders(folders)
  }
}

export function deleteFolder(id: string) {
  const folders = getAllFolders().filter((f) => f.id !== id)
  saveFolders(folders)
}

export function canModifyFolder(folderId: string, userRole: 'owner' | 'invitee'): boolean {
  const folder = getAllFolders().find((f) => f.id === folderId)
  if (!folder) return false
  return folder.createdBy === userRole
}

// --- Current folder selection ---

export function getCurrentFolderId(): string {
  return localStorage.getItem(CURRENT_FOLDER_KEY) || 'default'
}

export function setCurrentFolderId(id: string) {
  localStorage.setItem(CURRENT_FOLDER_KEY, id)
}

// --- Postcards ---

export function getPostcards(): Postcard[] {
  try {
    const raw = localStorage.getItem(POSTCARDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getPostcardsByFolder(folderId: string): Postcard[] {
  return getPostcards()
    .filter((p) => p.folderId === folderId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function savePostcard(data: {
  folderId?: string
  content: string
  bgColor: string
  mood: string
}): Postcard {
  const postcards = getPostcards()
  const postcard: Postcard = {
    id: generateId(),
    folderId: data.folderId || getCurrentFolderId(),
    content: data.content,
    bgColor: data.bgColor,
    mood: data.mood,
    authorNickname: getNickname(),
    createdAt: new Date().toISOString(),
    read: false,
  }
  postcards.unshift(postcard)
  localStorage.setItem(POSTCARDS_KEY, JSON.stringify(postcards))
  return postcard
}

export function getLatestPostcard(folderId?: string): Postcard | null {
  const fid = folderId || getCurrentFolderId()
  const list = getPostcardsByFolder(fid)
  return list.length > 0 ? list[0] : null
}

export function getRandomPostcard(folderId?: string): Postcard | null {
  const fid = folderId || getCurrentFolderId()
  const list = getPostcardsByFolder(fid)
  if (list.length === 0) return null
  const idx = Math.floor(Math.random() * list.length)
  return list[idx]
}

export function getOnThisDayPostcard(folderId?: string): Postcard | null {
  const fid = folderId || getCurrentFolderId()
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(today.getFullYear() - 1)

  const targetStr = oneYearAgo.toISOString().slice(0, 10)

  return (
    getPostcardsByFolder(fid).find((p) => p.createdAt.slice(0, 10) === targetStr) ?? null
  )
}

export function getUnreadCount(): number {
  return getPostcards().filter((p) => !p.read).length
}

export function markAsRead(id: string) {
  const postcards = getPostcards()
  const idx = postcards.findIndex((p) => p.id === id)
  if (idx !== -1 && !postcards[idx].read) {
    postcards[idx].read = true
    localStorage.setItem(POSTCARDS_KEY, JSON.stringify(postcards))
  }
}

// --- Letters ---

export function getLetters(): Letter[] {
  try {
    const raw = localStorage.getItem(LETTERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getLettersByFolder(folderId: string): Letter[] {
  return getLetters()
    .filter((l) => l.folderId === folderId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function saveLetter(data: {
  folderId?: string
  content: string
  paperTemplate: string
  fontFamily: string
}): Letter {
  const letters = getLetters()
  const letter: Letter = {
    id: generateId(),
    folderId: data.folderId || getCurrentFolderId(),
    content: data.content,
    paperTemplate: data.paperTemplate,
    fontFamily: data.fontFamily,
    authorNickname: getNickname(),
    createdAt: new Date().toISOString(),
    read: false,
  }
  letters.unshift(letter)
  localStorage.setItem(LETTERS_KEY, JSON.stringify(letters))
  return letter
}

export function getLetterUnreadCount(): number {
  return getLetters().filter((l) => !l.read).length
}

export function markLetterAsRead(id: string) {
  const letters = getLetters()
  const idx = letters.findIndex((l) => l.id === id)
  if (idx !== -1 && !letters[idx].read) {
    letters[idx].read = true
    localStorage.setItem(LETTERS_KEY, JSON.stringify(letters))
  }
}
