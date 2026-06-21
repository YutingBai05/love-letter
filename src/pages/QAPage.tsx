import { useState, useMemo, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Shuffle, Send, Eye, Sparkles, Trash2, Plus, Upload, History, MessageCircle, BookOpen, RefreshCw } from 'lucide-react'
import {
  getQuestions, getCategories, getAnsweredQAHistory, getPendingForMe, getWaitingForPartner,
  submitMyAnswer, submitPartnerAnswer, saveAIAnalysis,
  addQuestion, deleteQuestion, importQuestions,
  getAIKey, getAIModel, getAIEndpoint, getConfiguredProviders, getProviderLabel,
  seedPresetQuestions,
  type AIProvider,
} from '@/lib/qa-store'
import type { QAQuestion, QAAnswer } from '@/lib/types'
import { useAuth } from '@/components/AuthProvider'
import { getPartner } from '@/lib/auth-store'

type View = 'answer' | 'history' | 'manage'
type Step = 'idle' | 'picked' | 'myAnswered' | 'partnerAnswering' | 'revealed' | 'analyzed'

function HistoryCard({ answer }: { answer: QAAnswer }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="relative">
      <div className="absolute -left-[25px] top-2 w-3 h-3 rounded-full bg-rose" />
      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-rose font-medium">{answer.category}</span>
          <span className="text-xs text-warm-gray">{new Date(answer.createdAt).toLocaleDateString('zh-CN')}</span>
        </div>
        <p className="text-sm font-medium text-ink-brown mb-3">{answer.question}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-warm-beige/30 rounded p-3">
            <p className="text-xs text-warm-gray mb-1">{answer.myNickname || '我'}的回答</p>
            <div className={`prose prose-xs max-w-none text-ink-brown ${expanded ? '' : 'line-clamp-3'}`}
              dangerouslySetInnerHTML={{ __html: answer.myAnswer }} />
          </div>
          <div className="bg-warm-beige/30 rounded p-3">
            <p className="text-xs text-warm-gray mb-1">{answer.partnerNickname || '对方'}的回答</p>
            <div className={`prose prose-xs max-w-none text-ink-brown ${expanded ? '' : 'line-clamp-3'}`}
              dangerouslySetInnerHTML={{ __html: answer.partnerAnswer }} />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-0.5 text-xs text-warm-gray hover:text-rose transition-colors">
            {expanded ? '收起 ▲' : '展开全部 ▼'}
          </button>
          {answer.aiAnalysis && (
            <details className="text-xs">
              <summary className="text-gold cursor-pointer hover:underline">AI 分析</summary>
              <div className="mt-1 text-xs text-ink-brown whitespace-pre-wrap leading-relaxed bg-gold/5 rounded p-2">{answer.aiAnalysis}</div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

export function QAPage() {
  const { user } = useAuth()
  const [view, setView] = useState<View>('answer')
  const [step, setStep] = useState<Step>('idle')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentQuestion, setCurrentQuestion] = useState<QAQuestion | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState<QAAnswer | null>(null)
  const [revealPartner, setRevealPartner] = useState(false)
  const [aiText, setAiText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  // Data
  const [questions, setQuestions] = useState<QAQuestion[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [history, setHistory] = useState<QAAnswer[]>([])
  const [dataVersion, setDataVersion] = useState(0)

  // Management
  const [newCategory, setNewCategory] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [addCategory, setAddCategory] = useState('关于我们')
  const [importMsg, setImportMsg] = useState('')

  const [pendingForMe, setPendingForMe] = useState<QAAnswer[]>([])
  const [waitingForPartner, setWaitingForPartner] = useState<QAAnswer[]>([])

  const refreshData = useCallback(async () => {
    const [qs, cats, hist] = await Promise.all([getQuestions(), getCategories(), getAnsweredQAHistory()])
    console.log('[QA] Questions:', qs.length, 'Categories:', cats, 'History:', hist.length)
    setQuestions(qs)
    setCategories(cats)
    setHistory(hist)
    if (cats.length > 0 && !cats.includes(addCategory)) setAddCategory(cats[0])
    const role = user?.role || 'owner'
    const [pending, waiting] = await Promise.all([getPendingForMe(role), getWaitingForPartner(role)])
    setPendingForMe(pending)
    setWaitingForPartner(waiting)
  }, [addCategory])

  useEffect(() => { seedPresetQuestions().then(refreshData) }, [dataVersion, refreshData])

  const myEditor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: '写下你的回答...' })],
    editorProps: { attributes: { class: 'prose prose-sm max-w-none min-h-[120px] px-4 py-3 focus:outline-none' } },
  })

  const partnerEditor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "输入对方的回答..." })],
    editorProps: { attributes: { class: 'prose prose-sm max-w-none min-h-[120px] px-4 py-3 focus:outline-none' } },
  })

  const answeredIds = useMemo(() => new Set(history.map((a) => a.questionId)), [history])

  const unansweredQuestions = useMemo(() => {
    const byCategory = selectedCategory === 'all' ? questions : questions.filter((q) => q.category === selectedCategory)
    return byCategory.filter((q) => !answeredIds.has(q.id))
  }, [questions, selectedCategory, answeredIds])

  const pickRandomQuestion = useCallback(() => {
    if (unansweredQuestions.length === 0) return
    const q = unansweredQuestions[Math.floor(Math.random() * unansweredQuestions.length)]
    setCurrentQuestion(q)
    setStep('picked')
    setRevealPartner(false)
    setAiText('')
    myEditor?.commands.clearContent()
    partnerEditor?.commands.clearContent()
  }, [unansweredQuestions, myEditor, partnerEditor])

  const [submitError, setSubmitError] = useState('')

  const handleSubmitMyAnswer = useCallback(async () => {
    if (!currentQuestion) return
    const html = myEditor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    setSubmitError('')
    try {
      const answer = await submitMyAnswer(currentQuestion.id, html, user?.nickname || '', user?.role)
      setCurrentAnswer(answer)
      setDataVersion((v) => v + 1)
      // If both sides now answered → go to revealed; otherwise wait
      if (answer.myAnswer && answer.partnerAnswer) {
        setStep('revealed')
      } else {
        setStep('myAnswered')
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '提交失败')
    }
  }, [currentQuestion, myEditor, user?.nickname, user?.role])

  const handleSubmitPartnerAnswer = useCallback(async () => {
    if (!currentQuestion) return
    const html = partnerEditor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    setSubmitError('')
    try {
      const partner = await getPartner()
      const answer = await submitPartnerAnswer(currentQuestion.id, html, partner?.nickname || '对方')
      setCurrentAnswer(answer)
      setStep('revealed')
      setDataVersion((v) => v + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '提交失败')
    }
  }, [currentQuestion, partnerEditor])

  const [systemPrompt, setSystemPrompt] = useState(
    '你是一个感情分析助手。分析情侣对同一个问题的两份回答，用中文输出：\n1) 相似度评分（0-100%）\n2) 两人的差异点\n3) 从回答中看出对方可能希望你注意的事\n4) 一个 follow-up 问题\n格式简洁，每个部分用标题分隔。'
  )

  const buildUserPrompt = useCallback(() => {
    if (!currentAnswer) return ''
    return `问题：${currentAnswer.question}\n\n我的回答：${currentAnswer.myAnswer.replace(/<[^>]+>/g, '')}\n\n对方的回答：${currentAnswer.partnerAnswer.replace(/<[^>]+>/g, '')}`
  }, [currentAnswer])

  const handleAnalyze = useCallback(async (provider: AIProvider, customSystemPrompt?: string) => {
    if (!currentAnswer) return
    setAnalyzing(true)
    const key = getAIKey(provider)
    const model = getAIModel(provider)
    const endpoint = getAIEndpoint(provider, model)

    const sysPrompt = customSystemPrompt || systemPrompt
    const userContent = buildUserPrompt()

    try {
      let body: string, headers: Record<string, string>, url = endpoint
      if (provider === 'gemini') {
        url = `${url}?key=${encodeURIComponent(key)}`
        headers = { 'Content-Type': 'application/json' }
        body = JSON.stringify({ systemInstruction: { parts: [{ text: sysPrompt }] }, contents: [{ role: 'user', parts: [{ text: userContent }] }] })
      } else {
        headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
        body = JSON.stringify({ model, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userContent }] })
      }

      const resp = await fetch(url, { method: 'POST', headers, body })
      const data = await resp.json()
      if (!resp.ok) { setAiText(`❌ API 错误 (${resp.status}): ${data.error?.message || JSON.stringify(data)}`); setStep('analyzed'); setAnalyzing(false); return }

      const result = provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.[0]?.text : data.choices?.[0]?.message?.content
      setAiText(result || '分析失败')
      saveAIAnalysis(currentAnswer.questionId, result || '')
    } catch (e) {
      setAiText(`❌ 请求失败: ${e instanceof Error ? e.message : String(e)}`)
    }
    setStep('analyzed')
    setAnalyzing(false)
  }, [currentAnswer, systemPrompt, buildUserPrompt])

  const handleAddQuestion = async () => {
    if (!newQuestion.trim() || !addCategory) return
    await addQuestion(addCategory, newQuestion.trim())
    setNewQuestion('')
    setDataVersion((v) => v + 1)
  }

  const handleAddCategoryAndQuestion = async () => {
    if (!newQuestion.trim() || !newCategory.trim()) return
    await addQuestion(newCategory.trim(), newQuestion.trim())
    setNewQuestion('')
    setNewCategory('')
    setDataVersion((v) => v + 1)
  }

  const handleImportQuestions = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!Array.isArray(data)) { setImportMsg('❌ 格式错误：需要 JSON 数组'); return }
        const count = await importQuestions(data)
        setImportMsg(`✓ 成功导入 ${count} 道题目`)
        setDataVersion((v) => v + 1)
        setTimeout(() => setImportMsg(''), 4000)
      } catch { setImportMsg('❌ 文件解析失败') }
    }
    input.click()
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h1 className="text-2xl font-semibold text-ink-brown">我想问个问题</h1>
        <p className="text-warm-gray text-sm mt-1">通过问答，更了解彼此</p>
      </div>

      <div className="flex gap-2 bg-warm-beige/50 rounded-lg p-1">
        {([['answer', '答题', MessageCircle], ['history', '历史', History], ['manage', '题库', BookOpen]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${view === v ? 'bg-white text-rose shadow-sm' : 'text-warm-gray hover:text-ink-brown'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ===== ANSWER VIEW ===== */}
      {view === 'answer' && (
        <div className="space-y-4">
          {step === 'idle' && (
            <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-warm-beige bg-white text-sm text-ink-brown">
                  <option value="all">全部分类</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="text-xs text-warm-gray">{unansweredQuestions.length} 道未答</span>
              </div>
              <button onClick={pickRandomQuestion} disabled={unansweredQuestions.length === 0}
                className="w-full py-8 rounded-xl border-2 border-dashed border-warm-beige hover:border-rose transition-colors flex flex-col items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed">
                <Shuffle className="w-8 h-8 text-rose" />
                <span className="text-sm text-ink-brown font-medium">随机抽一道题</span>
                <span className="text-xs text-warm-gray">
                  {unansweredQuestions.length > 0 ? `从未答的 ${unansweredQuestions.length} 道题中随机抽取` : '🎉 全部答完了！'}
                </span>
              </button>
            </div>
          )}

          {/* 等我回答：对方已答，我还没答 */}
          {step === 'idle' && pendingForMe.length > 0 && (
            <div className="bg-white/70 rounded-xl border border-rose/30 shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-warm-beige bg-rose/5">
                <span className="text-xs font-medium text-ink-brown">对方已回答，等你回复</span>
              </div>
              <div className="divide-y divide-warm-beige/50">
                {pendingForMe.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setCurrentQuestion(questions.find((q) => q.id === a.questionId) || null)
                      setCurrentAnswer(a)
                      setStep('picked')
                      setRevealPartner(true)
                      setAiText('')
                      myEditor?.commands.clearContent()
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-warm-beige/20 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs text-rose font-medium">{a.category}</span>
                      <p className="text-sm text-ink-brown mt-0.5">{a.question}</p>
                    </div>
                    <span className="text-xs text-rose shrink-0 ml-2">去回答 →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 等对方：我已答，对方还没答 */}
          {step === 'idle' && waitingForPartner.length > 0 && (
            <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-warm-beige">
                <span className="text-xs font-medium text-ink-brown">我已回答，等对方回复</span>
              </div>
              <div className="divide-y divide-warm-beige/50">
                {waitingForPartner.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setCurrentQuestion(questions.find((q) => q.id === a.questionId) || null)
                      setCurrentAnswer(a)
                      setStep('myAnswered')
                      setRevealPartner(false)
                      setAiText('')
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-warm-beige/20 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs text-warm-gray font-medium">{a.category}</span>
                      <p className="text-sm text-ink-brown mt-0.5">{a.question}</p>
                    </div>
                    <span className="text-xs text-warm-gray shrink-0 ml-2">查看 →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
              {submitError}
            </div>
          )}

          {(step !== 'idle') && currentQuestion && (
            <>
              <div className="bg-rose/5 rounded-xl border border-rose/20 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose font-medium">{currentQuestion.category}</span>
                  {step === 'picked' && unansweredQuestions.length > 1 && (
                    <button onClick={pickRandomQuestion} className="flex items-center gap-1 text-xs text-rose hover:text-rose/80 transition-colors">
                      <RefreshCw className="w-3 h-3" />换一个
                    </button>
                  )}
                </div>
                <p className="mt-2 text-ink-brown text-lg font-medium">{currentQuestion.question}</p>
              </div>

              {step === 'picked' && (
                <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
                  <div className="px-4 py-2 border-b border-warm-beige bg-warm-beige/30">
                    <span className="text-xs text-warm-gray font-medium">我的回答</span>
                  </div>
                  <EditorContent editor={myEditor} />
                  <div className="px-4 py-3 border-t border-warm-beige flex justify-end">
                    <button onClick={handleSubmitMyAnswer} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose text-white text-sm">
                      <Send className="w-4 h-4" />提交我的回答
                    </button>
                  </div>
                </div>
              )}

              {step === 'myAnswered' && (
                <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 text-rose">
                    <div className="w-2 h-2 rounded-full bg-rose animate-pulse" />
                    <span className="text-sm font-medium">等待对方回答...</span>
                  </div>
                  <div className="bg-warm-beige/30 rounded-lg p-4">
                    <p className="text-xs text-warm-gray mb-1">{currentAnswer?.myNickname || '我'}的回答（已提交）</p>
                    <div className="prose prose-sm max-w-none text-ink-brown" dangerouslySetInnerHTML={{ __html: currentAnswer?.myAnswer || '' }} />
                  </div>
                  <button onClick={() => setStep('partnerAnswering')}
                    className="w-full py-3 rounded-lg border border-warm-beige text-sm text-warm-gray hover:border-rose hover:text-rose transition-colors">
                    模拟对方回答 →
                  </button>
                </div>
              )}

              {step === 'partnerAnswering' && (
                <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
                  <div className="px-4 py-2 border-b border-warm-beige bg-warm-beige/30">
                    <span className="text-xs text-warm-gray font-medium">对方的回答</span>
                  </div>
                  <EditorContent editor={partnerEditor} />
                  <div className="px-4 py-3 border-t border-warm-beige flex justify-end">
                    <button onClick={handleSubmitPartnerAnswer} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose text-white text-sm">
                      <Send className="w-4 h-4" />提交对方回答
                    </button>
                  </div>
                </div>
              )}

              {step === 'revealed' && currentAnswer && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4">
                      <p className="text-xs text-warm-gray mb-2">{currentAnswer.myNickname || '我'}的回答</p>
                      <div className="prose prose-sm max-w-none text-ink-brown" dangerouslySetInnerHTML={{ __html: currentAnswer.myAnswer }} />
                    </div>
                    <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4">
                      <p className="text-xs text-warm-gray mb-2">{currentAnswer.partnerNickname || '对方'}的回答</p>
                      {revealPartner ? (
                        <div className="prose prose-sm max-w-none text-ink-brown" dangerouslySetInnerHTML={{ __html: currentAnswer.partnerAnswer }} />
                      ) : (
                        <button onClick={() => setRevealPartner(true)}
                          className="flex items-center gap-2 text-sm text-warm-gray hover:text-rose transition-colors py-8 justify-center w-full">
                          <Eye className="w-5 h-5" />点击揭示对方答案
                        </button>
                      )}
                    </div>
                  </div>

                  {revealPartner && (
                      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-5 space-y-3">
                        <Sparkles className="w-6 h-6 text-gold mx-auto" />
                        <p className="text-sm text-ink-brown text-center font-medium">AI 分析</p>

                        <div>
                          <label className="text-xs text-warm-gray">System Prompt（可修改）</label>
                          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={4}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-warm-beige bg-white text-xs leading-relaxed focus:outline-none focus:border-rose resize-none" />
                        </div>

                        <details className="text-xs">
                          <summary className="text-warm-gray cursor-pointer hover:text-ink-brown">查看 User Prompt</summary>
                          <pre className="mt-1 p-2 bg-warm-beige/30 rounded text-xs whitespace-pre-wrap">{buildUserPrompt()}</pre>
                        </details>

                        {getConfiguredProviders().length === 0 ? (
                          <p className="text-xs text-warm-gray text-center">暂无已配置的 AI 提供商</p>
                        ) : (
                          <div className="flex gap-2 justify-center flex-wrap">
                            {getConfiguredProviders().map((p) => (
                              <button key={p} onClick={() => handleAnalyze(p, systemPrompt)} disabled={analyzing}
                                className="px-4 py-2 rounded-lg bg-gold text-white text-sm font-medium disabled:opacity-50 hover:bg-gold/90 transition-colors">
                                {analyzing ? '分析中...' : `用 ${getProviderLabel(p)} 分析`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                  )}
                </div>
              )}

              {/* ANALYZED: show result + editable prompt for re-call */}
              {step === 'analyzed' && currentAnswer && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4">
                      <p className="text-xs text-warm-gray mb-2">{currentAnswer.myNickname || '我'}的回答</p>
                      <div className="prose prose-sm max-w-none text-ink-brown" dangerouslySetInnerHTML={{ __html: currentAnswer.myAnswer }} />
                    </div>
                    <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4">
                      <p className="text-xs text-warm-gray mb-2">{currentAnswer.partnerNickname || '对方'}的回答</p>
                      <div className="prose prose-sm max-w-none text-ink-brown" dangerouslySetInnerHTML={{ __html: currentAnswer.partnerAnswer }} />
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-xl border border-gold/30 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-gold" /><h3 className="text-sm font-medium text-ink-brown">AI 分析结果</h3></div>
                    <div className="prose prose-sm max-w-none text-ink-brown whitespace-pre-wrap leading-relaxed">{aiText}</div>
                  </div>

                  <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4 space-y-3">
                    <p className="text-xs font-medium text-ink-brown">修改 Prompt 重新分析</p>
                    <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-warm-beige bg-white text-xs leading-relaxed focus:outline-none focus:border-rose resize-none" />
                    {getConfiguredProviders().length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {getConfiguredProviders().map((p) => (
                          <button key={p} onClick={() => handleAnalyze(p, systemPrompt)} disabled={analyzing}
                            className="px-3 py-1.5 rounded-lg bg-gold text-white text-xs font-medium disabled:opacity-50 hover:bg-gold/90 transition-colors">
                            {analyzing ? '分析中...' : `用 ${getProviderLabel(p)} 重新分析`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => { setStep('idle'); setCurrentQuestion(null); setCurrentAnswer(null); setRevealPartner(false); setAiText(''); setSubmitError(''); setSystemPrompt('你是一个感情分析助手。分析情侣对同一个问题的两份回答，用中文输出：\n1) 相似度评分（0-100%）\n2) 两人的差异点\n3) 从回答中看出对方可能希望你注意的事\n4) 一个 follow-up 问题\n格式简洁，每个部分用标题分隔。') }}
                    className="w-full py-3 rounded-lg border border-rose text-rose text-sm hover:bg-rose/5 transition-colors">再来一题</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== HISTORY VIEW ===== */}
      {view === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-warm-gray text-sm">还没有完成过问答，去答一题吧</div>
          ) : (
            <div className="relative pl-6 border-l-2 border-warm-beige space-y-5">
              {history.map((a) => (
                <HistoryCard key={a.id} answer={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== MANAGE VIEW ===== */}
      {view === 'manage' && (
        <div className="space-y-4">
          <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-medium text-ink-brown">添加题目</h3>
            <select value={addCategory} onChange={(e) => setAddCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-warm-beige bg-white text-sm">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="输入新题目..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()} />
              <button onClick={handleAddQuestion} className="px-3 py-1.5 rounded-lg bg-rose text-white text-sm"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="border-t border-warm-beige pt-3 flex gap-2">
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="新分类名称..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategoryAndQuestion()} />
              <button onClick={handleAddCategoryAndQuestion} className="px-3 py-1.5 rounded-lg border border-rose text-rose text-sm whitespace-nowrap">新建分类并添加</button>
            </div>
          </div>

          <div className="bg-white/70 rounded-xl border border-dashed border-gold/50 shadow-sm p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div><h3 className="text-sm font-medium text-ink-brown">导入题库</h3>
                <p className="text-xs text-warm-gray mt-0.5">上传 JSON 文件，格式：[{'{'} "category": "分类", "question": "问题" {'}'}, ...]</p></div>
              <button onClick={handleImportQuestions} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-white text-sm hover:bg-gold/90 transition-colors">
                <Upload className="w-4 h-4" />上传
              </button>
            </div>
            {importMsg && <p className={`text-xs ${importMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{importMsg}</p>}
          </div>

          {categories.map((cat) => {
            const catQuestions = questions.filter((q) => q.category === cat)
            return (
              <div key={cat} className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b border-warm-beige bg-warm-beige/30 flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-brown">{cat}</span>
                  <span className="text-xs text-warm-gray">{catQuestions.length} 题</span>
                </div>
                <div className="divide-y divide-warm-beige/50">
                  {catQuestions.map((q) => (
                    <div key={q.id} className="px-4 py-2 flex items-center justify-between">
                      <span className="text-sm text-ink-brown">{q.question}</span>
                      <button onClick={async () => { await deleteQuestion(q.id); setDataVersion((v) => v + 1) }}
                        className="text-warm-gray hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
