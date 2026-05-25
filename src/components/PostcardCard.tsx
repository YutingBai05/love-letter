import type { Postcard } from '@/lib/types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}

interface PostcardCardProps {
  postcard: Postcard
  compact?: boolean
}

export function PostcardCard({ postcard, compact }: PostcardCardProps) {
  return (
    <div
      className="rounded-xl p-5 min-h-[120px] relative overflow-hidden"
      style={{ backgroundColor: postcard.bgColor || '#FFF8F0' }}
    >
      {/* mood badge */}
      {postcard.mood && (
        <span className="absolute top-3 right-3 text-xl">{postcard.mood}</span>
      )}

      {/* content */}
      <div
        className={`prose prose-sm max-w-none text-ink-brown ${
          compact ? 'line-clamp-3' : ''
        }`}
        dangerouslySetInnerHTML={{ __html: postcard.content }}
      />

      {/* author + date */}
      <div className="mt-3 text-xs text-warm-gray flex items-center gap-2">
        {postcard.authorNickname && (
          <span className="font-medium text-ink-brown">{postcard.authorNickname}</span>
        )}
        <span>{formatDate(postcard.createdAt)}</span>
      </div>
    </div>
  )
}
