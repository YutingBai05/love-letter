import { useState, useCallback, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { getLatestPostcard, getRandomPostcard, getOnThisDayPostcard, markAsRead } from '@/lib/store'
import { getSetting } from '@/lib/settings-store'
import { PostcardCard } from '@/components/PostcardCard'

export function HomePage() {
  const [latest, setLatest] = useState<any>(null)
  const [random, setRandom] = useState<any>(null)
  const [onThisDay, setOnThisDay] = useState<any>(null)
  const [randomKey, setRandomKey] = useState(0)

  const loadData = useCallback(async () => {
    const [l, r, o] = await Promise.all([
      getLatestPostcard(),
      getRandomPostcard(),
      getOnThisDayPostcard(),
    ])
    setLatest(l)
    setRandom(r)
    setOnThisDay(o)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Mark displayed as read
  const markedIds = useRef(new Set<string>())
  useEffect(() => {
    [latest, random, onThisDay].filter(Boolean).forEach((p: any) => {
      if (p && !markedIds.current.has(p.id)) {
        markAsRead(p.id)
        markedIds.current.add(p.id)
      }
    })
  }, [latest?.id, random?.id, onThisDay?.id])

  const handleRefreshRandom = async () => {
    const r = await getRandomPostcard()
    setRandom(r)
    setRandomKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl font-semibold text-ink-brown">我们的信件</h1>
        <p className="text-warm-gray text-sm mt-1">{getSetting('subtitle_home')}</p>
      </div>

      <section className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-beige/50">
          <h2 className="text-sm font-medium text-warm-gray">最新明信片</h2>
        </div>
        <div className="p-1">
          {latest ? <PostcardCard postcard={latest} /> :
            <div className="h-32 flex items-center justify-center text-warm-gray text-sm">暂无明信片，去写一张吧 ✉️</div>}
        </div>
      </section>

      <section className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-beige/50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-warm-gray">随机一张</h2>
          {random && (
            <button onClick={handleRefreshRandom}
              className="flex items-center gap-0.5 text-xs text-rose hover:text-rose/80 transition-colors">
              <RefreshCw className="w-3 h-3" />换一张
            </button>
          )}
        </div>
        <div className="p-1" key={randomKey}>
          {random ? <PostcardCard postcard={random} /> :
            <div className="h-32 flex items-center justify-center text-warm-gray text-sm">暂无明信片</div>}
        </div>
      </section>

      {onThisDay && (
        <section className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-warm-beige/50">
            <h2 className="text-sm font-medium text-warm-gray">那年今日</h2>
          </div>
          <div className="p-1"><PostcardCard postcard={onThisDay} /></div>
        </section>
      )}
    </div>
  )
}
