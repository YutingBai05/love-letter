import { useState, useCallback, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { getSession } from '@/lib/auth-store'
import {
  getFolders,
  getCurrentFolderId,
  setCurrentFolderId,
  getLatestPostcard,
  getRandomPostcard,
  getOnThisDayPostcard,
  markAsRead,
} from '@/lib/store'
import { PostcardCard } from '@/components/PostcardCard'

export function HomePage() {
  const user = getSession()
  const folders = getFolders(user?.role)
  const [currentFolder, setCurrentFolder] = useState(getCurrentFolderId)
  const [latest, setLatest] = useState(() => getLatestPostcard(currentFolder))
  const [random, setRandom] = useState(() => getRandomPostcard(currentFolder))
  const [onThisDay, setOnThisDay] = useState(() => getOnThisDayPostcard(currentFolder))
  const [randomKey, setRandomKey] = useState(0)
  const markedIds = useRef(new Set<string>())

  useEffect(() => {
    const ids = [latest, random, onThisDay].filter(Boolean).map((p) => p!.id)
    ids.forEach((id) => {
      if (!markedIds.current.has(id)) {
        markAsRead(id)
        markedIds.current.add(id)
      }
    })
  }, [latest?.id, random?.id, onThisDay?.id])

  const handleFolderChange = (folderId: string) => {
    setCurrentFolder(folderId)
    setCurrentFolderId(folderId)
    setLatest(getLatestPostcard(folderId))
    setRandom(getRandomPostcard(folderId))
    setOnThisDay(getOnThisDayPostcard(folderId))
    setRandomKey((k) => k + 1)
  }

  const handleRefreshRandom = useCallback(() => {
    setRandom(getRandomPostcard(currentFolder))
    setRandomKey((k) => k + 1)
  }, [currentFolder])

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl font-semibold text-ink-brown">我们的信件</h1>
        <p className="text-warm-gray text-sm mt-1">珍藏每一次心动</p>
      </div>

      {/* 文件夹选择器 */}
      <div className="flex justify-end">
        <select
          value={currentFolder}
          onChange={(e) => handleFolderChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-warm-beige bg-white text-sm text-ink-brown focus:outline-none focus:border-rose"
        >
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* 最新明信片 */}
      <section className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-beige/50">
          <h2 className="text-sm font-medium text-warm-gray">最新明信片</h2>
        </div>
        <div className="p-1">
          {latest ? (
            <PostcardCard postcard={latest} />
          ) : (
            <div className="h-32 flex items-center justify-center text-warm-gray text-sm">
              暂无明信片，去写一张吧 ✉️
            </div>
          )}
        </div>
      </section>

      {/* 随机明信片 */}
      <section className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-beige/50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-warm-gray">随机一张</h2>
          {random && (
            <button
              onClick={handleRefreshRandom}
              className="flex items-center gap-0.5 text-xs text-rose hover:text-rose/80 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              换一张
            </button>
          )}
        </div>
        <div className="p-1" key={randomKey}>
          {random ? (
            <PostcardCard postcard={random} />
          ) : (
            <div className="h-32 flex items-center justify-center text-warm-gray text-sm">
              暂无明信片
            </div>
          )}
        </div>
      </section>

      {/* 那年今日 */}
      {onThisDay && (
        <section className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-warm-beige/50">
            <h2 className="text-sm font-medium text-warm-gray">那年今日</h2>
          </div>
          <div className="p-1">
            <PostcardCard postcard={onThisDay} />
          </div>
        </section>
      )}
    </div>
  )
}
