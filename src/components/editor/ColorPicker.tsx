import { useState, useEffect } from 'react'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSetting, setSetting } from '@/lib/settings-store'

const PRESET_COLORS = [
  '#FFF8F0', // warm cream
  '#F5E6D3', // warm beige
  '#FFE4E1', // misty rose
  '#E8F4E8', // sage green
  '#E8EEF4', // dusty blue
  '#FFFACD', // lemon chiffon
  '#F5E6E0', // blush
  '#E6E6FA', // lavender
  '#FFF0F5', // lavender blush
  '#F0FFF0', // honeydew
  '#FDF5E6', // old lace
  '#F0F0F0', // light gray
]

function loadCustomColors(): string[] {
  try {
    const stored = getSetting('custom_colors')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCustomColors(colors: string[]) {
  setSetting('custom_colors', JSON.stringify(colors))
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customColors, setCustomColors] = useState<string[]>(loadCustomColors)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    saveCustomColors(customColors)
  }, [customColors])

  const handleAddCustom = () => {
    const input = document.createElement('input')
    input.type = 'color'
    input.value = '#FFF8F0'
    input.click()
    input.onchange = () => {
      const newColor = input.value
      if (![...PRESET_COLORS, ...customColors].includes(newColor)) {
        setCustomColors((prev) => [...prev, newColor])
        onChange(newColor)
      }
    }
  }

  const allColors = [...PRESET_COLORS, ...customColors]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-warm-gray">背景颜色</span>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs text-rose hover:text-rose/80"
        >
          {showPicker ? '收起' : '展开'}
        </button>
      </div>
      {showPicker && (
        <div className="flex flex-wrap gap-2">
          {allColors.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={cn(
                'w-7 h-7 rounded-full border-2 transition-all hover:scale-110',
                value === color
                  ? 'border-rose scale-110 shadow-md'
                  : 'border-warm-beige'
              )}
              style={{ backgroundColor: color }}
            >
              {value === color && (
                <Check className="w-3 h-3 m-auto text-rose drop-shadow" />
              )}
            </button>
          ))}
          <button
            onClick={handleAddCustom}
            className="w-7 h-7 rounded-full border-2 border-dashed border-warm-gray flex items-center justify-center hover:border-rose transition-colors"
          >
            <Plus className="w-3 h-3 text-warm-gray" />
          </button>
        </div>
      )}
    </div>
  )
}
