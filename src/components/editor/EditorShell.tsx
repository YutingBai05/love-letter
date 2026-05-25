import type { ReactNode } from 'react'
import { Save, Eye, Send } from 'lucide-react'

interface EditorShellProps {
  title: string
  subtitle?: string
  topRight?: ReactNode
  bottomToolbar?: ReactNode
  children: ReactNode
  onSave?: () => void
  onPreview?: () => void
  onSend?: () => void
  sendDisabled?: boolean
  saveLabel?: string
}

export function EditorShell({
  title,
  subtitle,
  topRight,
  bottomToolbar,
  children,
  onSave,
  onPreview,
  onSend,
  sendDisabled,
  saveLabel,
}: EditorShellProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-brown">{title}</h1>
          {subtitle && (
            <p className="text-warm-gray text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {topRight}
      </div>

      {/* Editor area */}
      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm overflow-hidden">
        {children}
      </div>

      {/* Bottom toolbar */}
      {bottomToolbar && (
        <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-3">
          {bottomToolbar}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-warm-beige text-sm text-ink-brown hover:bg-warm-beige/50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveLabel || '保存'}
        </button>
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-warm-beige text-sm text-ink-brown hover:bg-warm-beige/50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          预览
        </button>
        <button
          onClick={onSend}
          disabled={sendDisabled}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose text-white text-sm hover:bg-rose/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          发送
        </button>
      </div>
    </div>
  )
}
