import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontSize } from '@tiptap/extension-text-style/font-size'

import { EditorShell } from './EditorShell'
import { EditorToolbar } from './EditorToolbar'
import { ColorPicker } from './ColorPicker'
import { MoodSelector } from './MoodSelector'
import { FontSizeSelector } from './FontSizeSelector'
import { FolderSelector } from './FolderSelector'
import { savePostcard, getCurrentFolderId } from '@/lib/store'

const MAX_CHARS = 300

export function PostcardEditor() {
  const [bgColor, setBgColor] = useState('#FFF8F0')
  const [mood, setMood] = useState('')
  const [folderId, setFolderId] = useState(getCurrentFolderId)
  const [saved, setSaved] = useState(false)
  const savedId = useRef<string | null>(null)
  const isTrimming = useRef(false)
  const navigate = useNavigate()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontSize,
      CharacterCount.configure({ limit: MAX_CHARS }),
      Placeholder.configure({ placeholder: '写下此刻想说的话...' }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[240px] px-6 py-4 focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isTrimming.current) return
      const count = ed.storage.characterCount?.characters?.() ?? 0
      if (count > MAX_CHARS) {
        isTrimming.current = true
        const overBy = count - MAX_CHARS
        ed.commands.deleteRange({
          from: ed.state.doc.content.size - overBy,
          to: ed.state.doc.content.size,
        })
        isTrimming.current = false
      }
    },
  })

  const charCount = editor?.storage.characterCount?.characters?.() ?? 0
  const isOverLimit = charCount > MAX_CHARS

  const handleSave = useCallback(() => {
    const html = editor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    const p = savePostcard({ content: html, bgColor, mood, folderId })
    savedId.current = p.id
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, bgColor, mood, folderId])

  const handlePreview = useCallback(() => {
    alert('预览功能将在后续开发')
  }, [])

  const handleSend = useCallback(() => {
    const html = editor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    if (!savedId.current) {
      const p = savePostcard({ content: html, bgColor, mood, folderId })
      savedId.current = p.id
    }
    navigate('/')
  }, [editor, bgColor, mood, folderId, navigate])

  return (
    <EditorShell
      title="写一张明信片"
      subtitle="短小精悍，直击内心"
      topRight={<MoodSelector value={mood} onChange={setMood} />}
      bottomToolbar={
        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <EditorToolbar editor={editor} />
            <span className="w-px h-5 bg-warm-beige" />
            <FontSizeSelector editor={editor} />
            <span className="w-px h-5 bg-warm-beige" />
            <FolderSelector value={folderId} onChange={setFolderId} />
          </div>
          <ColorPicker value={bgColor} onChange={setBgColor} />
        </div>
      }
      onSave={handleSave}
      onPreview={handlePreview}
      onSend={handleSend}
      sendDisabled={isOverLimit || charCount === 0}
      saveLabel={saved ? '已保存 ✓' : '保存'}
    >
      <div style={{ backgroundColor: bgColor }} className="transition-colors duration-300">
        <EditorContent editor={editor} />
      </div>
      <div className="px-6 py-2 border-t border-warm-beige flex items-center justify-between text-xs">
        <span className={isOverLimit ? 'text-red-500 font-medium' : 'text-warm-gray'}>
          {charCount} / {MAX_CHARS} 字
        </span>
        {isOverLimit && (
          <span className="text-red-500">已超出字数限制</span>
        )}
      </div>
    </EditorShell>
  )
}
