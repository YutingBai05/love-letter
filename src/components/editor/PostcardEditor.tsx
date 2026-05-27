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
import { useAuth } from '@/components/AuthProvider'
import { getSetting } from '@/lib/settings-store'
import { EditorShell } from './EditorShell'
import { PreviewModal } from './PreviewModal'
import { EditorToolbar } from './EditorToolbar'
import { ColorPicker } from './ColorPicker'
import { MoodSelector } from './MoodSelector'
import { FontSizeSelector } from './FontSizeSelector'
import { FolderSelector } from './FolderSelector'
import { savePostcard, getCurrentFolderId } from '@/lib/store'

const MAX_CHARS = 300

export function PostcardEditor() {
  const { user } = useAuth()
  const [bgColor, setBgColor] = useState('#FFF8F0')
  const [mood, setMood] = useState('')
  const [folderId, setFolderId] = useState(getCurrentFolderId)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const savedId = useRef<string | null>(null)
  const isTrimming = useRef(false)
  const navigate = useNavigate()

  const editor = useEditor({
    extensions: [
      StarterKit, Underline,
      Image.configure({ inline: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle, FontSize,
      CharacterCount.configure({ limit: MAX_CHARS }),
      Placeholder.configure({ placeholder: '写下此刻想说的话...' }),
    ],
    editorProps: { attributes: { class: 'prose prose-sm max-w-none min-h-[240px] px-6 py-4 focus:outline-none' } },
    onUpdate: ({ editor: ed }) => {
      if (isTrimming.current) return
      const count = ed.storage.characterCount?.characters?.() ?? 0
      if (count > MAX_CHARS) {
        isTrimming.current = true
        const overBy = count - MAX_CHARS
        ed.commands.deleteRange({ from: ed.state.doc.content.size - overBy, to: ed.state.doc.content.size })
        isTrimming.current = false
      }
    },
  })

  const charCount = editor?.storage.characterCount?.characters?.() ?? 0
  const isOverLimit = charCount > MAX_CHARS

  const handleSave = useCallback(async () => {
    const html = editor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    setError('')
    try {
      const p = await savePostcard({ content: html, bgColor, mood, folderId, authorNickname: user?.nickname || '' })
      savedId.current = p.id
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }, [editor, bgColor, mood, folderId, user?.nickname])

  const handleSend = useCallback(async () => {
    const html = editor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    setError('')
    try {
      if (!savedId.current) {
        await savePostcard({ content: html, bgColor, mood, folderId, authorNickname: user?.nickname || '' })
      }
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败')
    }
  }, [editor, bgColor, mood, folderId, user?.nickname, navigate])

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-2">
          {error}
        </div>
      )}
      <EditorShell title="写一张明信片" subtitle={getSetting('subtitle_postcard')}
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
      onSave={handleSave} onPreview={() => setPreview(true)}
      onSend={handleSend} sendDisabled={isOverLimit || charCount === 0}
      saveLabel={saved ? '已保存 ✓' : '保存'}>
      <div style={{ backgroundColor: bgColor }} className="transition-colors duration-300">
        <EditorContent editor={editor} />
      </div>
      <div className="px-6 py-2 border-t border-warm-beige flex items-center justify-between text-xs">
        <span className={isOverLimit ? 'text-red-500 font-medium' : 'text-warm-gray'}>{charCount} / {MAX_CHARS} 字</span>
        {isOverLimit && <span className="text-red-500">已超出字数限制</span>}
      </div>
    </EditorShell>
      <PreviewModal open={preview} onClose={() => setPreview(false)} title="明信片预览">
        <div style={{ backgroundColor: bgColor }} className="min-h-[200px] p-6 rounded-xl">
          {mood && <div className="text-right text-2xl mb-3">{mood}</div>}
          <EditorContent editor={editor} />
        </div>
      </PreviewModal>
    </>
  )
}
