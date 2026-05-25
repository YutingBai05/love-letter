import { getFolders } from '@/lib/store'
import { getSession } from '@/lib/auth-store'

interface FolderSelectorProps {
  value: string
  onChange: (folderId: string) => void
}

export function FolderSelector({ value, onChange }: FolderSelectorProps) {
  const user = getSession()
  const folders = getFolders(user?.role)

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-warm-gray">文件夹</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 rounded-lg border border-warm-beige bg-white text-xs text-ink-brown focus:outline-none focus:border-rose"
      >
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.isLocked ? '🔒 ' : ''}{f.name}
          </option>
        ))}
      </select>
    </div>
  )
}
