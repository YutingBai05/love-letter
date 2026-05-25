import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

const FONT_SIZES = [
  { label: '小', value: '14px' },
  { label: '中', value: '16px' },
  { label: '大', value: '20px' },
  { label: '特大', value: '24px' },
  { label: '标题', value: '32px' },
]

interface FontSizeSelectorProps {
  editor: Editor | null
}

export function FontSizeSelector({ editor }: FontSizeSelectorProps) {
  const getCurrentSize = useCallback(() => {
    if (!editor) return ''
    const attrs = editor.getAttributes('textStyle')
    return (attrs?.fontSize as string) || ''
  }, [editor])

  if (!editor) return null

  const currentSize = getCurrentSize()

  return (
    <div className="flex items-center gap-1">
      {FONT_SIZES.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            if (currentSize === value) {
              editor.chain().focus().unsetFontSize().run()
            } else {
              editor.chain().focus().setFontSize(value).run()
            }
          }}
          className={cn(
            'px-2 py-1 text-xs rounded border transition-colors',
            currentSize === value
              ? 'border-rose bg-rose/10 text-rose'
              : 'border-warm-beige text-warm-gray hover:border-warm-gray'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
