import { supabase } from './supabase'
import type { QAQuestion, QAAnswer } from './types'
import { getSetting, setSetting } from './settings-store'

// ===== AI Settings (stored in Supabase settings table) =====

export type AIProvider = 'openai' | 'deepseek' | 'gemini'

const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; endpoint: string }> = {
  openai: { model: 'gpt-3.5-turbo', endpoint: 'https://api.openai.com/v1/chat/completions' },
  deepseek: { model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
  gemini: { model: 'gemini-2.0-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent' },
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI', deepseek: 'DeepSeek', gemini: 'Gemini',
}

export function getProviderLabel(provider: AIProvider): string {
  return PROVIDER_LABELS[provider]
}

export function getAIKey(provider: AIProvider): string {
  return getSetting(`ai_key_${provider}`)
}

export function setAIKey(provider: AIProvider, key: string) {
  setSetting(`ai_key_${provider}`, key)
}

export function getAIModel(provider: AIProvider): string {
  return getSetting(`ai_model_${provider}`) || PROVIDER_DEFAULTS[provider].model
}

export function setAIModel(provider: AIProvider, model: string) {
  setSetting(`ai_model_${provider}`, model)
}

export function getAIEndpoint(provider: AIProvider, model?: string): string {
  const m = model || getAIModel(provider)
  return PROVIDER_DEFAULTS[provider].endpoint.replace('{model}', m)
}

export function getConfiguredProviders(): AIProvider[] {
  return (['openai', 'deepseek', 'gemini'] as AIProvider[]).filter((p) => !!getAIKey(p))
}

// ===== Preset questions =====

const PRESET_QUESTIONS: Omit<QAQuestion, 'id'>[] = [
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
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) return

  const { data: existing } = await supabase.from('qa_questions').select('id').limit(1)
  if (existing && existing.length > 0) return

  const toInsert = PRESET_QUESTIONS.map((q) => ({
    category: q.category,
    question: q.question,
    created_by: userId,
  }))

  await supabase.from('qa_questions').insert(toInsert)
}

export async function getQuestions(): Promise<QAQuestion[]> {
  const { data } = await supabase.from('qa_questions').select('*').order('created_at', { ascending: true })
  return (data || []).map((q) => ({ id: q.id, category: q.category, question: q.question }))
}

export async function getCategories(): Promise<string[]> {
  const questions = await getQuestions()
  return [...new Set(questions.map((q) => q.category))].sort()
}

export async function addQuestion(category: string, question: string): Promise<QAQuestion> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) throw new Error('Not logged in')

  const { data, error } = await supabase.from('qa_questions').insert({
    category, question, created_by: userId,
  }).select().single()

  if (error) throw error
  return { id: data.id, category: data.category, question: data.question }
}

export async function deleteQuestion(id: string) {
  await supabase.from('qa_questions').delete().eq('id', id)
}

export async function importQuestions(items: { category: string; question: string }[]): Promise<number> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) return 0

  const existing = await getQuestions()
  let added = 0
  for (const item of items) {
    if (!item.category || !item.question) continue
    const exists = existing.some((q) => q.category === item.category && q.question === item.question)
    if (!exists) {
      await supabase.from('qa_questions').insert({
        category: item.category, question: item.question, created_by: userId,
      })
      added++
    }
  }
  return added
}

// ===== Answers =====

export async function getAnswers(): Promise<QAAnswer[]> {
  const { data } = await supabase.from('qa_answers').select('*').order('created_at', { ascending: false })
  return (data || []).map(mapAnswer)
}

export async function submitMyAnswer(questionId: string, myAnswer: string, myNickname: string): Promise<QAAnswer> {
  // Check if answer exists
  const { data: existing } = await supabase.from('qa_answers').select('*').eq('question_id', questionId).maybeSingle()

  if (existing) {
    const { data, error } = await supabase.from('qa_answers').update({
      my_answer: myAnswer,
      my_nickname: myNickname,
    }).eq('id', existing.id).select().single()
    if (error) throw error
    return mapAnswer(data)
  }

  // Get question info
  const { data: question } = await supabase.from('qa_questions').select('*').eq('id', questionId).single()

  const { data, error } = await supabase.from('qa_answers').insert({
    question_id: questionId,
    question: question?.question || '',
    category: question?.category || '',
    my_answer: myAnswer,
    my_nickname: myNickname,
  }).select().single()

  if (error) throw error
  return mapAnswer(data)
}

export async function submitPartnerAnswer(questionId: string, partnerAnswer: string, partnerNickname: string): Promise<QAAnswer> {
  const { data, error } = await supabase.from('qa_answers').update({
    partner_answer: partnerAnswer,
    partner_nickname: partnerNickname,
    answered_at: new Date().toISOString(),
  }).eq('question_id', questionId).select().single()

  if (error) throw error
  return mapAnswer(data)
}

export async function saveAIAnalysis(questionId: string, aiAnalysis: string) {
  await supabase.from('qa_answers').update({ ai_analysis: aiAnalysis }).eq('question_id', questionId)
}

export async function getAnsweredQAHistory(): Promise<QAAnswer[]> {
  const answers = await getAnswers()
  return answers.filter((a) => a.myAnswer && a.partnerAnswer)
}

function mapAnswer(r: Record<string, unknown>): QAAnswer {
  return {
    id: r.id as string,
    questionId: r.question_id as string,
    question: (r.question as string) || '',
    category: (r.category as string) || '',
    myAnswer: (r.my_answer as string) || '',
    myNickname: (r.my_nickname as string) || '',
    partnerAnswer: (r.partner_answer as string) || '',
    partnerNickname: (r.partner_nickname as string) || '',
    aiAnalysis: (r.ai_analysis as string) || null,
    createdAt: (r.created_at as string) || '',
    answeredAt: (r.answered_at as string) || null,
  }
}
