import type { QAQuestion, QAAnswer } from './types'
import { getNickname, getPartner } from './auth-store'

const QUESTIONS_KEY = 'love-letter-qa-questions'
const ANSWERS_KEY = 'love-letter-qa-answers'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// --- Preset questions ---

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

// --- Questions bank ---

export function getQuestions(): QAQuestion[] {
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY)
    if (!raw) {
      const defaults: QAQuestion[] = PRESET_QUESTIONS.map((q) => ({
        ...q,
        id: generateId(),
      }))
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveQuestions(questions: QAQuestion[]) {
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions))
}

export function addQuestion(category: string, question: string): QAQuestion {
  const questions = getQuestions()
  const q: QAQuestion = { id: generateId(), category, question }
  questions.push(q)
  saveQuestions(questions)
  return q
}

export function deleteQuestion(id: string) {
  saveQuestions(getQuestions().filter((q) => q.id !== id))
}

export function importQuestions(items: { category: string; question: string }[]): number {
  const questions = getQuestions()
  let added = 0
  for (const item of items) {
    if (!item.category || !item.question) continue
    const exists = questions.some(
      (q) => q.category === item.category && q.question === item.question
    )
    if (!exists) {
      questions.push({ id: generateId(), category: item.category, question: item.question })
      added++
    }
  }
  saveQuestions(questions)
  return added
}

export function getCategories(): string[] {
  const cats = new Set(getQuestions().map((q) => q.category))
  return [...cats].sort()
}

// --- Answers ---

export function getAnswers(): QAAnswer[] {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAnswers(answers: QAAnswer[]) {
  localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers))
}

export function getOrCreateAnswer(questionId: string): QAAnswer {
  const answers = getAnswers()
  let answer = answers.find((a) => a.questionId === questionId)
  if (!answer) {
    const question = getQuestions().find((q) => q.id === questionId)
    if (!question) throw new Error('Question not found')
    answer = {
      id: generateId(),
      questionId: question.id,
      question: question.question,
      category: question.category,
      myAnswer: '',
      myNickname: '',
      partnerAnswer: '',
      partnerNickname: '',
      aiAnalysis: null,
      createdAt: new Date().toISOString(),
      answeredAt: null,
    }
    answers.push(answer)
    saveAnswers(answers)
  }
  return answer
}

export function submitMyAnswer(questionId: string, myAnswer: string): QAAnswer {
  const answers = getAnswers()
  let answer = answers.find((a) => a.questionId === questionId)
  const nickname = getNickname()
  if (!answer) {
    const question = getQuestions().find((q) => q.id === questionId)
    if (!question) throw new Error('Question not found')
    answer = {
      id: generateId(),
      questionId: question.id,
      question: question.question,
      category: question.category,
      myAnswer,
      myNickname: nickname,
      partnerAnswer: '',
      partnerNickname: '',
      aiAnalysis: null,
      createdAt: new Date().toISOString(),
      answeredAt: null,
    }
    answers.push(answer)
  } else {
    answer.myAnswer = myAnswer
    answer.myNickname = nickname
  }
  saveAnswers(answers)
  return answer
}

export function submitPartnerAnswer(questionId: string, partnerAnswer: string): QAAnswer {
  const answers = getAnswers()
  const answer = answers.find((a) => a.questionId === questionId)
  if (!answer) throw new Error('Answer not found')
  const partner = getPartner()
  const partnerNick = partner?.nickname || '对方'
  answer.partnerAnswer = partnerAnswer
  answer.partnerNickname = partnerNick
  answer.answeredAt = new Date().toISOString()
  saveAnswers(answers)
  return answer
}

export function saveAIAnalysis(questionId: string, aiAnalysis: string) {
  const answers = getAnswers()
  const answer = answers.find((a) => a.questionId === questionId)
  if (!answer) return
  answer.aiAnalysis = aiAnalysis
  saveAnswers(answers)
}

export function getAnsweredQAHistory(): QAAnswer[] {
  return getAnswers()
    .filter((a) => a.myAnswer && a.partnerAnswer)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// --- AI Settings ---
export type AIProvider = 'openai' | 'deepseek' | 'gemini'

const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; endpoint: string }> = {
  openai: { model: 'gpt-3.5-turbo', endpoint: 'https://api.openai.com/v1/chat/completions' },
  deepseek: { model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
  gemini: { model: 'gemini-2.0-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent' },
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
}

export function getProviderLabel(provider: AIProvider): string {
  return PROVIDER_LABELS[provider]
}

// Per-provider API keys
export function getAIKey(provider: AIProvider): string {
  return localStorage.getItem(`love-letter-ai-key-${provider}`) || ''
}

export function setAIKey(provider: AIProvider, key: string) {
  localStorage.setItem(`love-letter-ai-key-${provider}`, key)
}

export function getAnyAIKey(): { provider: AIProvider; key: string } | null {
  for (const p of ['openai', 'deepseek', 'gemini'] as AIProvider[]) {
    const key = getAIKey(p)
    if (key) return { provider: p, key }
  }
  return null
}

// Per-provider model
export function getAIModel(provider: AIProvider): string {
  return localStorage.getItem(`love-letter-ai-model-${provider}`) || PROVIDER_DEFAULTS[provider].model
}

export function setAIModel(provider: AIProvider, model: string) {
  localStorage.setItem(`love-letter-ai-model-${provider}`, model)
}

// Endpoint
export function getAIEndpoint(provider: AIProvider, model?: string): string {
  const m = model || getAIModel(provider)
  return PROVIDER_DEFAULTS[provider].endpoint.replace('{model}', m)
}

// Get list of configured providers (those with keys set)
export function getConfiguredProviders(): AIProvider[] {
  return (['openai', 'deepseek', 'gemini'] as AIProvider[]).filter((p) => !!getAIKey(p))
}
