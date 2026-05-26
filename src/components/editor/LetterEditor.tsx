import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { FontSize } from '@tiptap/extension-text-style/font-size'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { useAuth } from '@/components/AuthProvider'
import { getSetting } from '@/lib/settings-store'
import { EditorShell } from './EditorShell'
import { EditorToolbar } from './EditorToolbar'
import { PaperTemplateSelector, getPaperBackground, type PaperTemplate } from './PaperTemplateSelector'
import { FontSelector, getFontFamily } from './FontSelector'
import { FontSizeSelector } from './FontSizeSelector'
import { FolderSelector } from './FolderSelector'
import { saveLetter, getCurrentFolderId } from '@/lib/store'

export function LetterEditor() {
  const { user } = useAuth()
  const [paperTemplate, setPaperTemplate] = useState<PaperTemplate>('blank')
  const [fontFamily, setFontFamily] = useState('serif')
  const [folderId, setFolderId] = useState(getCurrentFolderId)
  const [saved, setSaved] = useState(false)
  const savedId = useRef<string | null>(null)
  const navigate = useNavigate()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }), Underline,
      Image.configure({ inline: true }),
      TextAlign.configure({ types: ['paragraph'] }),
      TextStyle, FontFamily, FontSize,
      Placeholder.configure({ placeholder: '亲爱的...' }),
    ],
    editorProps: {
      attributes: {
        class: 'prose max-w-none min-h-[320px] px-8 py-6 focus:outline-none leading-relaxed',
        style: `font-family: ${getFontFamily(fontFamily)}`,
      },
    },
  })

  const handleSave = useCallback(async () => {
    const html = editor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    const l = await saveLetter({ content: html, paperTemplate, fontFamily, folderId, authorNickname: user?.nickname || '' })
    savedId.current = l.id
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, paperTemplate, fontFamily, folderId, user?.nickname])

  const handleSend = useCallback(async () => {
    const html = editor?.getHTML() ?? ''
    if (!html.trim() || html === '<p></p>') return
    if (!savedId.current) {
      await saveLetter({ content: html, paperTemplate, fontFamily, folderId, authorNickname: user?.nickname || '' })
    }
    navigate('/')
  }, [editor, paperTemplate, fontFamily, folderId, user?.nickname, navigate])

  return (
    <EditorShell title="写一封信" subtitle={getSetting('subtitle_letter')}
      bottomToolbar={
        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <EditorToolbar editor={editor} />
            <span className="w-px h-5 bg-warm-beige" />
            <FontSizeSelector editor={editor} />
            <span className="w-px h-5 bg-warm-beige" />
            <FolderSelector value={folderId} onChange={setFolderId} />
          </div>
          <PaperTemplateSelector value={paperTemplate} onChange={setPaperTemplate} />
          <FontSelector value={fontFamily} onChange={setFontFamily} />
        </div>
      }
      onSave={handleSave} onPreview={() => alert('预览功能将在后续开发')}
      onSend={handleSend} saveLabel={saved ? '已保存 ✓' : '保存'}>
      <div className={getPaperBackground(paperTemplate)}>
        <EditorContent editor={editor} />
      </div>
    </EditorShell>
  )
}
