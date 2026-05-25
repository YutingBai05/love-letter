const USERS_KEY = 'love-letter-users'
const SESSION_KEY = 'love-letter-session'
const INVITES_KEY = 'love-letter-invites'

export interface AppUser {
  id: string
  email: string
  nickname: string
  passwordHash: string
  role: 'owner' | 'invitee'
  pairedWith: string | null
}

interface InviteCode {
  code: string
  createdBy: string
  expiresAt: string
  used: boolean
  usedBy: string | null
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return 'h_' + Math.abs(hash).toString(36)
}

// --- Users ---

function getUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function registerUser(
  email: string,
  password: string,
  nickname: string,
  role: 'owner' | 'invitee',
  inviteCode?: string
): { user: AppUser; error?: string } {
  const users = getUsers()
  const lcEmail = email.toLowerCase().trim()

  if (users.some((u) => u.email === lcEmail)) {
    return { error: '该邮箱已注册', user: null! }
  }

  let pairedWith: string | null = null

  if (role === 'invitee') {
    if (!inviteCode) {
      return { error: '被邀请方需要邀请码才能注册', user: null! }
    }
    const invite = getInviteByCode(inviteCode)
    if (!invite) {
      return { error: '邀请码无效', user: null! }
    }
    if (invite.used) {
      return { error: '邀请码已被使用', user: null! }
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return { error: '邀请码已过期', user: null! }
    }
    // Find the owner
    const owner = users.find((u) => u.id === invite.createdBy)
    if (!owner || owner.pairedWith) {
      return { error: '该邀请码对应的用户已配对', user: null! }
    }
    pairedWith = invite.createdBy
    // Mark invite as used
    markInviteUsed(inviteCode, lcEmail)
    // Pair the owner with this user
    owner.pairedWith = lcEmail
  }

  const user: AppUser = {
    id: generateId(),
    email: lcEmail,
    nickname: nickname.trim() || lcEmail.split('@')[0],
    passwordHash: simpleHash(password),
    role,
    pairedWith,
  }

  users.push(user)
  saveUsers(users)

  // Also update owner's pairedWith
  if (pairedWith) {
    const owner = users.find((u) => u.email === pairedWith)
    if (owner) {
      owner.pairedWith = lcEmail
      saveUsers(users)
    }
  }

  // Auto login
  setSession(user)
  return { user }
}

export function loginUser(email: string, password: string): { user: AppUser; error?: string } {
  const users = getUsers()
  const lcEmail = email.toLowerCase().trim()
  const user = users.find((u) => u.email === lcEmail)

  if (!user) {
    return { error: '邮箱未注册', user: null! }
  }
  if (user.passwordHash !== simpleHash(password)) {
    return { error: '密码错误', user: null! }
  }

  setSession(user)
  return { user }
}

// --- Session ---

export function getSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    const users = getUsers()
    return users.find((u) => u.id === session.userId) || null
  } catch {
    return null
  }
}

function setSession(user: AppUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, loginAt: Date.now() }))
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

// --- Invites ---

function getInvites(): InviteCode[] {
  try {
    const raw = localStorage.getItem(INVITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveInvites(invites: InviteCode[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites))
}

function getInviteByCode(code: string): InviteCode | null {
  return getInvites().find((i) => i.code === code) || null
}

function markInviteUsed(code: string, usedBy: string) {
  const invites = getInvites()
  const invite = invites.find((i) => i.code === code)
  if (invite) {
    invite.used = true
    invite.usedBy = usedBy
    saveInvites(invites)
  }
}

export function generateInviteCode(): string {
  const user = getSession()
  if (!user || user.role !== 'owner') throw new Error('只有邀请方可以生成邀请码')

  // Invalidate old unused invites
  const invites = getInvites().filter(
    (i) => i.createdBy !== user.id || i.used
  )

  const code = 'LL-' + generateId().toUpperCase()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  invites.push({
    code,
    createdBy: user.id,
    expiresAt,
    used: false,
    usedBy: null,
  })

  saveInvites(invites)
  return code
}

export function getMyInviteCode(): string | null {
  const user = getSession()
  if (!user || user.role !== 'owner') return null

  const invites = getInvites()
  const active = invites.find(
    (i) => i.createdBy === user.id && !i.used && new Date(i.expiresAt) > new Date()
  )
  return active?.code || null
}

// --- Partner ---

export function getPartner(): AppUser | null {
  const user = getSession()
  if (!user || !user.pairedWith) return null
  const users = getUsers()
  return users.find((u) => u.email === user.pairedWith) || null
}

export function getPartnerEmail(): string | null {
  const user = getSession()
  return user?.pairedWith || null
}

// --- Nickname ---

export function getNickname(): string {
  const user = getSession()
  return user?.nickname || user?.email?.split('@')[0] || ''
}

export function setNickname(nickname: string) {
  const user = getSession()
  if (!user) return
  const users = getUsers()
  const u = users.find((x) => x.id === user.id)
  if (u) {
    u.nickname = nickname.trim() || user.email.split('@')[0]
    saveUsers(users)
    setSession(u)
  }
}
