import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { getPostcards, getLetters, getFolders, markAsRead, markLetterAsRead } from '@/lib/store'
import { getAnsweredQAHistory } from '@/lib/qa-store'
import { getSession } from '@/lib/auth-store'
import { PostcardCard } from '@/components/PostcardCard'
import { exportPostcard, exportLetter, exportQA } from '@/lib/export'
import type { Letter, QAAnswer } from '@/lib/types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function LetterCard({ letter }: { letter: Letter }) {
  const getPaperClass = (tpl: string) => {
    switch (tpl) {
      case 'lined':
        return 'bg-[repeating-linear-gradient(transparent,transparent_27px,#d4c5b0_27px,#d4c5b0_28px)]'
      case 'grid':
        return 'bg-[repeating-linear-gradient(#d4c5b0_0,#d4c5b0_1px,transparent_1px,transparent_20px),repeating-linear-gradient(90deg,#d4c5b0_0,#d4c5b0_1px,transparent_1px,transparent_20px)]'
      default:
        return 'bg-white'
    }
  }

  return (
    <div className={`rounded-xl p-5 min-h-[120px] ${getPaperClass(letter.paperTemplate)} border border-warm-beige`}>
      <div
        className="prose prose-sm max-w-none text-ink-brown line-clamp-4"
        dangerouslySetInnerHTML={{ __html: letter.content }}
      />
      <div className="mt-3 flex items-center justify-between text-xs text-warm-gray">
        <div className="flex items-center gap-2">
          {letter.authorNickname && (
            <span className="font-medium text-ink-brown">{letter.authorNickname}</span>
          )}
          <span>{formatDate(letter.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); exportLetter(letter) }}
            className="flex items-center gap-1 text-warm-gray hover:text-rose transition-colors"
            title="导出 Markdown"
          >
            <Download className="w-3 h-3" />
            导出
          </button>
          <span>✉️ 信件</span>
        </div>
      </div>
    </div>
  )
}

function QACard({ answer }: { answer: QAAnswer }) {
  return (
    <div className="rounded-xl p-5 bg-white/70 border border-warm-beige">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gold font-medium">问答</span>
        <span className="text-xs text-warm-gray">{answer.category}</span>
        <span className="text-xs text-warm-gray">{formatDate(answer.createdAt)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); exportQA(answer) }}
          className="ml-auto flex items-center gap-1 text-xs text-warm-gray hover:text-rose transition-colors"
          title="导出 Markdown"
        >
          <Download className="w-3 h-3" />
          导出
        </button>
      </div>
      <p className="text-sm font-medium text-ink-brown mb-3">{answer.question}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-warm-beige/30 rounded p-3">
          <p className="text-xs text-warm-gray mb-1">{answer.myNickname || '我的'}的回答</p>
          <div
            className="prose prose-xs max-w-none text-ink-brown line-clamp-3"
            dangerouslySetInnerHTML={{ __html: answer.myAnswer }}
          />
        </div>
        <div className="bg-warm-beige/30 rounded p-3">
          <p className="text-xs text-warm-gray mb-1">{answer.partnerNickname || '对方'}的回答</p>
          <div
            className="prose prose-xs max-w-none text-ink-brown line-clamp-3"
            dangerouslySetInnerHTML={{ __html: answer.partnerAnswer }}
          />
        </div>
      </div>
      {answer.aiAnalysis && (
        <details className="mt-3">
          <summary className="text-xs text-gold cursor-pointer hover:underline">AI 分析</summary>
          <div className="mt-2 text-xs text-ink-brown whitespace-pre-wrap leading-relaxed bg-gold/5 rounded p-3">
            {answer.aiAnalysis}
          </div>
        </details>
      )}
    </div>
  )
}

type Tab = 'postcards' | 'letters' | 'qa'

export function LibraryPage() {
  const [tab, setTab] = useState<Tab>('postcards')
  const [folderFilter, setFolderFilter] = useState('all')
  const user = getSession()
  const folders = getFolders(user?.role)
  const allPostcards = getPostcards()
  const allLetters = getLetters()
  const allQA = getAnsweredQAHistory()

  const filteredPostcards = useMemo(() => {
    const list = folderFilter === 'all'
      ? [...allPostcards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : allPostcards.filter((p) => p.folderId === folderFilter)
    return list
  }, [folderFilter, allPostcards])

  const filteredLetters = useMemo(() => {
    const list = folderFilter === 'all'
      ? [...allLetters].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : allLetters.filter((l) => l.folderId === folderFilter)
    return list
  }, [folderFilter, allLetters])

  const filteredQA = useMemo(() => {
    return allQA
  }, [allQA])

  const handleReadAll = () => {
    if (tab === 'postcards') {
      filteredPostcards.forEach((p) => markAsRead(p.id))
    } else if (tab === 'letters') {
      filteredLetters.forEach((l) => markLetterAsRead(l.id))
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h1 className="text-2xl font-semibold text-ink-brown">文库</h1>
        <p className="text-warm-gray text-sm mt-1">所有的明信片、信件与问答</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-warm-beige/50 rounded-lg p-1">
        {([
          ['postcards', '明信片', allPostcards.length] as const,
          ['letters', '信件', allLetters.length] as const,
          ['qa', '问答', allQA.length] as const,
        ]).map(([v, label, count]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === v ? 'bg-white text-rose shadow-sm' : 'text-warm-gray hover:text-ink-brown'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Filter + actions */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-warm-beige bg-white text-xs text-ink-brown focus:outline-none focus:border-rose"
        >
          <option value="all">全部</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        {tab !== 'qa' && (
          <button
            onClick={handleReadAll}
            className="text-xs text-rose hover:text-rose/80 transition-colors"
          >
            全部标为已读
          </button>
        )}
      </div>

      {/* Content list */}
      <div className="space-y-3">
        {tab === 'postcards' && (
          filteredPostcards.length === 0 ? (
            <div className="text-center py-12 text-warm-gray text-sm">
              还没有明信片，去写一张吧
            </div>
          ) : (
            filteredPostcards.map((p) => (
              <div key={p.id}>
                <div onClick={() => markAsRead(p.id)}>
                  <PostcardCard postcard={p} />
                </div>
                <div className="flex items-center gap-3 mt-1 ml-1">
                  {!p.read && (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-500 text-[10px]">
                      未读
                    </span>
                  )}
                  <button
                    onClick={() => exportPostcard(p)}
                    className="flex items-center gap-1 text-xs text-warm-gray hover:text-rose transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    导出
                  </button>
                </div>
              </div>
            ))
          )
        )}

        {tab === 'letters' && (
          filteredLetters.length === 0 ? (
            <div className="text-center py-12 text-warm-gray text-sm">
              还没有信件，去写一封吧
            </div>
          ) : (
            filteredLetters.map((l) => (
              <div key={l.id} onClick={() => markLetterAsRead(l.id)}>
                <LetterCard letter={l} />
                {!l.read && (
                  <span className="inline-block ml-2 px-1.5 py-0.5 rounded bg-red-100 text-red-500 text-[10px]">
                    未读
                  </span>
                )}
              </div>
            ))
          )
        )}

        {tab === 'qa' && (
          allQA.length === 0 ? (
            <div className="text-center py-12 text-warm-gray text-sm">
              还没有完成的问答，去答一题吧
            </div>
          ) : (
            filteredQA.map((a) => (
              <QACard key={a.id} answer={a} />
            ))
          )
        )}
      </div>
    </div>
  )
}
