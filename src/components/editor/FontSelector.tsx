import { cn } from '@/lib/utils'

const FONTS = [
  { value: 'serif', label: '系统衬线', family: 'Georgia, "Noto Serif SC", "Source Han Serif SC", serif' },
  { value: 'sans', label: '系统无衬线', family: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif' },
  { value: 'songti', label: '思源宋体', family: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif' },
  { value: 'kaiti', label: '楷体', family: '"KaiTi", "STKaiti", "AR PL UKai CN", serif' },
  { value: 'wenyi', label: '手写体', family: '"ZCOOL KuaiLe", "Ma Shan Zheng", "Liu Jian Mao Cao", cursive' },
  { value: 'mono', label: '等宽字体', family: '"Courier New", "Source Code Pro", monospace' },
]

interface FontSelectorProps {
  value: string
  onChange: (font: string) => void
}

export function getFontFamily(fontValue: string): string {
  return FONTS.find((f) => f.value === fontValue)?.family ?? FONTS[0].family
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-warm-gray">字体</span>
      <div className="flex flex-wrap gap-2">
        {FONTS.map(({ value: fv, label, family }) => (
          <button
            key={fv}
            onClick={() => onChange(fv)}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-sm transition-colors',
              value === fv
                ? 'border-rose bg-rose/10 text-rose'
                : 'border-warm-beige text-warm-gray hover:border-warm-gray'
            )}
            style={{ fontFamily: family }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
