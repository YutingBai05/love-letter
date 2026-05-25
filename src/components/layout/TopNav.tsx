import { Heart } from 'lucide-react'

export function TopNav() {
  return (
    <header className="sticky top-0 z-10 bg-warm-cream/90 backdrop-blur border-b border-warm-beige">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-center gap-2">
        <Heart className="w-5 h-5 text-rose" fill="currentColor" />
        <span className="text-lg font-semibold text-ink-brown tracking-wide">
          Love Letter
        </span>
      </div>
    </header>
  )
}
