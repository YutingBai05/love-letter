import { supabase } from './supabase'
import type { QAQuestion, QAAnswer } from './types'
import { getSetting, setSetting } from './settings-store'

const REST_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`
const REST_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function headers(extra?: Record<string, string>) {
  return {
    apikey: REST_KEY,
    Authorization: `Bearer ${REST_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function restGet(path: string) {
  const resp = await fetch(`${REST_URL}${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`REST ${resp.status}`)
  return resp.json()
}

async function restPost(path: string, body: any) {
  const resp = await fetch(`${REST_URL}${path}`, {
    method: 'POST',
    headers: headers(body ? { Prefer: 'return=representation' } : {}),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`REST ${resp.status}`)
  if (resp.status === 201) return resp.json()
  return null
}

async function restPatch(path: string, body: any) {
  const resp = await fetch(`${REST_URL}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`REST ${resp.status}`)
}

async function restDelete(path: string) {
  const resp = await fetch(`${REST_URL}${path}`, {
    method: 'DELETE',
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) throw new Error(`REST ${resp.status}`)
}

// ===== AI Settings =====
export type AIProvider = 'openai' | 'deepseek' | 'gemini'

const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; endpoint: string }> = {
  openai: { model: 'gpt-3.5-turbo', endpoint: 'https://api.openai.com/v1/chat/completions' },
  deepseek: { model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
  gemini: { model: 'gemini-2.0-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent' },
}

const PROVIDER_LABELS: Record<AIProvider, string> = { openai: 'OpenAI', deepseek: 'DeepSeek', gemini: 'Gemini' }

export function getProviderLabel(p: AIProvider) { return PROVIDER_LABELS[p] }
export function getAIKey(p: AIProvider) { return getSetting(`ai_key_${p}`) }
export function setAIKey(p: AIProvider, k: string) { setSetting(`ai_key_${p}`, k) }
export function getAIModel(p: AIProvider) { return getSetting(`ai_model_${p}`) || PROVIDER_DEFAULTS[p].model }
export function setAIModel(p: AIProvider, m: string) { setSetting(`ai_model_${p}`, m) }
export function getAIEndpoint(p: AIProvider, m?: string) { return PROVIDER_DEFAULTS[p].endpoint.replace('{model}', m || getAIModel(p)) }
export function getConfiguredProviders(): AIProvider[] { return (['openai', 'deepseek', 'gemini'] as AIProvider[]).filter((p) => !!getAIKey(p)) }

// ===== Preset questions =====
const PRESET_QUESTIONS = [
  { category: '关于我们', question: '我们第一次见面时，对方做了什么让你印象深刻的事？' },
  { category: '关于我们', question: '你觉得我们的关系中最珍贵的部分是什么？' },
  { category: '关于我们', question: '哪一刻让你觉得"就是这个人了"？' },
  { category: '关于我们', question: '你最喜欢我们一起做的哪件事？' },
  { category: '关于我们', question: '用一个词形容我们的关系，你会选什么？' },
  { category: '未来', question: '你希望我们一年后的生活在做什么？' },
  { category: '未来', question: '有没有一个地方你特别想和我一起去？是哪里？' },
  { category: '未来', question: '如果我们一起养一只宠物，你希望是什么？' },
  { category: '未来', question: '你希望我们的关系在哪些方面可以变得更好？' },
  { category: '未来', question: '未来某一天，你希望我们住在什么样的房子里？' },
  { category: '回忆', question: '最让你开心的那个约会，发生了什么？' },
  { category: '回忆', question: '我们吵过最严重的一次架，你现在怎么看？' },
  { category: '回忆', question: '对方说过的最让你感动的一句话是什么？' },
  { category: '回忆', question: '你觉得我们从认识到现在，最大的变化是什么？' },
  { category: '回忆', question: '有没有一个瞬间，你觉得对方特别可爱？' },
  { category: '假设', question: '如果能拥有一种超能力，你希望是什么，会用来为我们做什么？' },
  { category: '假设', question: '如果我们被困在荒岛上一个月，你觉得谁会先崩溃？' },
  { category: '假设', question: '如果我们交换一天身体，你最想替对方做什么？' },
  { category: '假设', question: '如果只能保留一段记忆，你会选择哪段？' },
  { category: '假设', question: '如果时间可以倒流，你会改变我们之间的哪件事？' },
]

// ===== Questions =====
export async function seedPresetQuestions() {
  const s = await getSessionData()
  if (!s?.data?.session?.user?.id) return
  try {
    const existing = await restGet('/qa_questions?select=id&limit=1')
    if (existing?.length > 0) return
  } catch { return }

  for (const q of PRESET_QUESTIONS) {
    try {
      await restPost('/qa_questions', { category: q.category, question: q.question, created_by: s.data.session.user.id })
    } catch {}
  }
}

export async function getQuestions(): Promise<QAQuestion[]> {
  try {
    const data = await restGet('/qa_questions?select=*&order=created_at.asc')
    console.log('[QA] Questions loaded:', data?.length)
    return (data || []).map((q: any) => ({ id: q.id, category: q.category, question: q.question }))
  } catch (e) {
    console.error('[QA] getQuestions error:', e)
    return []
  }
}

export async function getCategories(): Promise<string[]> {
  const qs = await getQuestions()
  return [...new Set(qs.map((q) => q.category))].sort()
}

export async function addQuestion(cat: string, question: string): Promise<QAQuestion> {
  const s = await getSessionData()
  if (!s?.data?.session?.user?.id) throw new Error('Not logged in')
  const data = await restPost('/qa_questions', { category: cat, question, created_by: s.data.session.user.id })
  return { id: data[0].id, category: cat, question }
}

export async function deleteQuestion(id: string) {
  await restDelete(`/qa_questions?id=eq.${id}`)
}

export async function importQuestions(items: { category: string; question: string }[]): Promise<number> {
  const s = await getSessionData()
  if (!s?.data?.session?.user?.id) return 0
  const existing = await getQuestions()
  let added = 0
  for (const item of items) {
    if (!item.category || !item.question) continue
    if (!existing.some((q) => q.category === item.category && q.question === item.question)) {
      try { await restPost('/qa_questions', { category: item.category, question: item.question, created_by: s.data.session.user.id }); added++ } catch {}
    }
  }
  return added
}

// ===== Answers =====
export async function getAnswers(): Promise<QAAnswer[]> {
  try {
    const data = await restGet('/qa_answers?select=*&order=created_at.desc')
    return (data || []).map(mapAnswer)
  } catch { return [] }
}

export async function submitMyAnswer(qid: string, myAnswer: string, myNickname: string): Promise<QAAnswer> {
  const existing = await restGet(`/qa_answers?select=id&question_id=eq.${qid}`)
  if (existing?.length > 0) {
    const id = existing[0].id
    await restPatch(`/qa_answers?id=eq.${id}`, { my_answer: myAnswer, my_nickname: myNickname })
    const updated = await restGet(`/qa_answers?id=eq.${id}`)
    return mapAnswer(updated[0])
  }
  const question = await restGet(`/qa_questions?id=eq.${qid}`)
  const data = await restPost('/qa_answers', {
    question_id: qid, question: question?.[0]?.question || '', category: question?.[0]?.category || '',
    my_answer: myAnswer, my_nickname: myNickname,
  })
  return mapAnswer(data[0])
}

export async function submitPartnerAnswer(qid: string, partnerAnswer: string, partnerNickname: string): Promise<QAAnswer> {
  const existing = await restGet(`/qa_answers?select=id&question_id=eq.${qid}`)
  const id = existing[0].id
  await restPatch(`/qa_answers?id=eq.${id}`, {
    partner_answer: partnerAnswer, partner_nickname: partnerNickname,
    answered_at: new Date().toISOString(),
  })
  const data = await restGet(`/qa_answers?id=eq.${id}`)
  return mapAnswer(data[0])
}

export async function saveAIAnalysis(qid: string, aiAnalysis: string) {
  const existing = await restGet(`/qa_answers?select=id&question_id=eq.${qid}`)
  if (existing?.length > 0) {
    await restPatch(`/qa_answers?id=eq.${existing[0].id}`, { ai_analysis: aiAnalysis })
  }
}

export async function getAnsweredQAHistory(): Promise<QAAnswer[]> {
  const answers = await getAnswers()
  console.log('[QA] All answers:', answers.length)
  const withAny = answers.filter((a) => a.myAnswer || a.partnerAnswer)
  console.log('[QA] With any answer:', withAny.length)
  return withAny
}

export async function getPendingForMe(questionIds: string[]): Promise<QAAnswer[]> {
  if (questionIds.length === 0) return []
  const all = await getAnswers()
  return all.filter((a) => a.partnerAnswer && !a.myAnswer)
}

// ===== Helpers =====
async function getSessionData() {
  const promise = supabase.auth.getSession()
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 5000))
  const result = await Promise.race([promise, timeout])
  return result || null
}

function mapAnswer(r: any): QAAnswer {
  return {
    id: r.id,
    questionId: r.question_id,
    question: r.question || '',
    category: r.category || '',
    myAnswer: r.my_answer || '',
    myNickname: r.my_nickname || '',
    partnerAnswer: r.partner_answer || '',
    partnerNickname: r.partner_nickname || '',
    aiAnalysis: r.ai_analysis || null,
    createdAt: r.created_at || '',
    answeredAt: r.answered_at || null,
  }
}
