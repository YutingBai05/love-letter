import { X } from 'lucide-react'

interface PreviewModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function PreviewModal({ open, onClose, title, children }: PreviewModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-warm-beige px-5 py-3 flex items-center justify-between rounded-t-2xl">
          <span className="text-sm font-medium text-ink-brown">{title}</span>
          <button onClick={onClose} className="text-warm-gray hover:text-ink-brown transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-1">{children}</div>
      </div>
    </div>
  )
}
