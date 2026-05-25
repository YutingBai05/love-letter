import { cn } from '@/lib/utils'

export type PaperTemplate = 'blank' | 'lined' | 'grid'

const templates: { value: PaperTemplate; label: string; preview: string }[] = [
  { value: 'blank', label: '空白纸', preview: '□' },
  { value: 'lined', label: '横线纸', preview: '≡' },
  { value: 'grid', label: '方格纸', preview: '⊞' },
]

interface PaperTemplateSelectorProps {
  value: PaperTemplate
  onChange: (template: PaperTemplate) => void
}

const bgMap: Record<PaperTemplate, string> = {
  blank: 'bg-white',
  lined: 'bg-[repeating-linear-gradient(transparent,transparent_27px,#d4c5b0_27px,#d4c5b0_28px)]',
  grid: 'bg-[repeating-linear-gradient(#d4c5b0_0,#d4c5b0_1px,transparent_1px,transparent_20px),repeating-linear-gradient(90deg,#d4c5b0_0,#d4c5b0_1px,transparent_1px,transparent_20px)]',
}

export function getPaperBackground(template: PaperTemplate): string {
  return bgMap[template]
}

export function PaperTemplateSelector({ value, onChange }: PaperTemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-warm-gray">信纸模板</span>
      <div className="flex gap-2">
        {templates.map(({ value: tpl, label, preview }) => (
          <button
            key={tpl}
            onClick={() => onChange(tpl)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors',
              value === tpl
                ? 'border-rose bg-rose/10 text-rose'
                : 'border-warm-beige text-warm-gray hover:border-warm-gray'
            )}
          >
            <span className="text-base">{preview}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
