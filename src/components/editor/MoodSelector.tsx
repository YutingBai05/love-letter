import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'

const MOOD_EMOJIS = [
  '😊', '🥰', '😌', '😄', '😢', '😤',
  '🤔', '😴', '🎉', '💕', '🌟', '🌈',
  '🍀', '🎵', '☀️', '🌙', '🌸', '💭',
]

interface MoodSelectorProps {
  value: string
  onChange: (emoji: string) => void
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-warm-beige text-lg hover:bg-warm-beige/30 transition-colors"
      >
        {value || <Smile className="w-5 h-5 text-warm-gray" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-warm-beige p-3 z-20 w-48">
          <p className="text-xs text-warm-gray mb-2">选择心情</p>
          <div className="grid grid-cols-6 gap-1">
            {MOOD_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onChange(emoji)
                  setOpen(false)
                }}
                className={`text-xl p-1 rounded hover:bg-warm-beige/50 transition-colors ${
                  value === emoji ? 'bg-warm-beige' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
