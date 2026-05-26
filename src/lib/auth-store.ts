import { supabase } from './supabase'

export interface AppUser {
  id: string
  email: string
  nickname: string
  role: 'owner' | 'invitee'
  pairedWith: string | null
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'LL-'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ===== Auth =====

export async function registerUser(
  email: string,
  password: string,
  nickname: string,
  role: 'owner' | 'invitee',
  inviteCode?: string
): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const lcEmail = email.toLowerCase().trim()
    const displayNickname = nickname.trim() || lcEmail.split('@')[0]

    console.log('[Register] Starting signup for:', lcEmail)

    const signUpPromise = supabase.auth.signUp({ email: lcEmail, password })
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
    const raceResult = await Promise.race([signUpPromise, timeoutPromise])

    if (!raceResult) {
      console.log('[Register] signUp timed out, checking session...')
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionUserId = sessionData.session?.user?.id
      if (sessionUserId) {
        return getUserFromSession(sessionUserId, lcEmail).then((r) => ({ user: r.user }))
      }
      return { user: null, error: '注册超时，请重试' }
    }

    const { data: authData, error: authError } = raceResult
    console.log('[Register] Signup response:', authError ? 'error: ' + authError.message : 'success, userId: ' + authData.user?.id)

    if (authError) {
      return { user: null, error: authError.message }
    }

    const userId = authData.user?.id
    if (!userId) {
      return { user: null, error: '注册失败，请重试' }
    }

    // Build user object immediately (even without profile)
    const user: AppUser = {
      id: userId,
      email: lcEmail,
      nickname: displayNickname,
      role,
      pairedWith: null,
    }

    let pairedWith: string | null = null

    if (role === 'invitee') {
      if (!inviteCode) return { user: null, error: '被邀请方需要邀请码' }
      const { data: invite } = await supabase.from('invite_codes').select('*').eq('code', inviteCode).maybeSingle()
      if (!invite) return { user: null, error: '邀请码无效' }
      if (invite.used) return { user: null, error: '邀请码已被使用' }
      if (new Date(invite.expires_at) < new Date()) return { user: null, error: '邀请码已过期' }
      pairedWith = invite.created_by
      user.pairedWith = pairedWith
      await supabase.from('invite_codes').update({ used: true, used_by: userId }).eq('code', inviteCode)
      await supabase.from('profiles').update({ paired_with: userId }).eq('id', pairedWith)
    }

    // Try to create profile (non-blocking - user is already valid)
    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId, email: lcEmail, nickname: displayNickname, role, paired_with: pairedWith,
      })
      if (profileError) {
        console.warn('[Register] Profile insert error (non-fatal):', profileError.message)
      }
    } catch (e) {
      console.warn('[Register] Profile insert failed (non-fatal):', e)
    }

    console.log('[Register] Success, returning user')
    return { user }
  } catch (e) {
    console.error('[Register] Unexpected error:', e)
    return { user: null, error: e instanceof Error ? e.message : '注册出错' }
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const lcEmail = email.toLowerCase().trim()
    console.log('[Login] Starting for:', lcEmail)

    // signInWithPassword may hang in some Supabase versions; use race with timeout
    const signInPromise = supabase.auth.signInWithPassword({ email: lcEmail, password })
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))

    const result = await Promise.race([signInPromise, timeoutPromise])

    if (!result) {
      // Timeout: check if session was established anyway via onAuthStateChange
      console.log('[Login] signInWithPassword timed out, checking session...')
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionUserId = sessionData.session?.user?.id
      if (!sessionUserId) return { user: null, error: '登录超时，请重试' }
      // Session exists despite timeout - proceed
      return getUserFromSession(sessionUserId, lcEmail)
    }

    const { data, error } = result
    console.log('[Login] Signin response:', error ? 'error: ' + error.message : 'success, userId: ' + data.user?.id)

    if (error) {
      return { user: null, error: error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message }
    }

    const userId = data.user?.id
    if (!userId) return { user: null, error: '登录失败' }

    return getUserFromSession(userId, lcEmail)
  } catch (e) {
    console.error('[Login] Unexpected error:', e)
    return { user: null, error: e instanceof Error ? e.message : '登录出错' }
  }
}

// ===== Session =====

export async function getSession(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  if (!userId) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (!profile) return null

  return {
    id: userId,
    email: profile.email,
    nickname: profile.nickname,
    role: profile.role,
    pairedWith: profile.paired_with,
  }
}

export async function logout() {
  await supabase.auth.signOut()
}

// ===== Invites =====

export async function generateInviteCode(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  if (!userId) throw new Error('请先登录')

  // Invalidate old unused invites
  await supabase.from('invite_codes')
    .update({ used: true })
    .eq('created_by', userId)
    .eq('used', false)

  const code = generateCode()
  await supabase.from('invite_codes').insert({
    code,
    created_by: userId,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  return code
}

export async function getMyInviteCode(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  if (!userId) return null

  const { data: invite } = await supabase
    .from('invite_codes')
    .select('code')
    .eq('created_by', userId)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return invite?.code || null
}

// ===== Partner =====

export async function getPartner(): Promise<AppUser | null> {
  const session = await getSession()
  if (!session?.pairedWith) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.pairedWith).single()
  if (!profile) return null

  return {
    id: profile.id,
    email: profile.email,
    nickname: profile.nickname,
    role: profile.role,
    pairedWith: profile.paired_with,
  }
}

export async function getPartnerEmail(): Promise<string | null> {
  const session = await getSession()
  if (!session?.pairedWith) return null

  const { data: profile } = await supabase.from('profiles').select('email').eq('id', session.pairedWith).single()
  return profile?.email || null
}

// ===== Nickname =====

export async function getNickname(): Promise<string> {
  const session = await getSession()
  return session?.nickname || session?.email?.split('@')[0] || ''
}

export async function setNickname(nickname: string) {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  if (!userId) return

  await supabase.from('profiles').update({ nickname: nickname.trim() }).eq('id', userId)
}

// Export for compatibility with sync calls (used in UI init)
export function getSessionSync(): AppUser | null {
  return null
}

// ===== Helper =====

async function getUserFromSession(userId: string, email: string): Promise<{ user: AppUser; error?: undefined }> {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  console.log('[Login] Profile lookup:', profile ? 'found' : 'not found')

  const user: AppUser = {
    id: userId,
    email: profile?.email || email,
    nickname: profile?.nickname || email.split('@')[0],
    role: profile?.role || 'owner',
    pairedWith: profile?.paired_with || null,
  }

  if (!profile) {
    console.log('[Login] Profile missing, attempting to create...')
    try {
      await supabase.from('profiles').insert({
        id: userId, email, nickname: user.nickname, role: 'owner',
      })
      // Create default folders for new user
      const defaults = [
        { name: '日常', created_by: 'owner', user_id: userId, is_locked: false },
        { name: '情话', created_by: 'owner', user_id: userId, is_locked: false },
        { name: '回忆', created_by: 'owner', user_id: userId, is_locked: false },
      ]
      await supabase.from('folders').insert(defaults)
    } catch (e) {
      console.warn('[Login] Profile/folder insert failed (non-fatal):', e)
    }
  }

  console.log('[Login] Success')
  return { user }
}
