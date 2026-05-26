import type { Postcard, Letter } from './types'
import type { QAAnswer } from './types'
import { getPostcards, getPostcardsByFolder, getLetters, getLettersByFolder, getFolders } from './store'
import { getAnsweredQAHistory } from './qa-store'

function htmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src')
    const alt = img.getAttribute('alt') || '图片'
    if (src) {
      img.replaceWith(`\n![${alt}](${src})\n`)
    }
  })
  div.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  div.querySelectorAll('p').forEach((p) => {
    const text = p.textContent || ''
    p.replaceWith(text + '\n\n')
  })
  return div.textContent?.trim() || ''
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// --- Single item exports ---

export function exportPostcard(postcard: Postcard) {
  const dateStr = formatDate(postcard.createdAt)
  const content = htmlToText(postcard.content)
  const title = content.slice(0, 30).replace(/\n/g, ' ') || '无标题'

  const frontmatter = [
    '---',
    `date: ${dateStr}`,
    `type: 明信片`,
    `mood: ${postcard.mood || '无'}`,
    `author: ${postcard.authorNickname || '未知'}`,
    `folder: ${postcard.folderId}`,
    '---',
  ].join('\n')

  const markdown = `${frontmatter}\n\n# ${title}\n\n${content}`
  const filename = `${dateStr}_明信片_${title.replace(/[/\\?%*:|"<>]/g, '')}.md`

  downloadFile(filename, markdown)
}

export function exportLetter(letter: Letter) {
  const dateStr = formatDate(letter.createdAt)
  const content = htmlToText(letter.content)
  const title = content.slice(0, 30).replace(/\n/g, ' ') || '无标题'

  const frontmatter = [
    '---',
    `date: ${dateStr}`,
    `type: 信件`,
    `paper: ${letter.paperTemplate}`,
    `font: ${letter.fontFamily}`,
    `author: ${letter.authorNickname || '未知'}`,
    `folder: ${letter.folderId}`,
    '---',
  ].join('\n')

  const markdown = `${frontmatter}\n\n# ${title}\n\n${content}`
  const filename = `${dateStr}_信件_${title.replace(/[/\\?%*:|"<>]/g, '')}.md`

  downloadFile(filename, markdown)
}

export function exportQA(answer: QAAnswer) {
  const dateStr = formatDate(answer.createdAt)
  const myAnswer = htmlToText(answer.myAnswer)
  const partnerAnswer = htmlToText(answer.partnerAnswer)

  const frontmatter = [
    '---',
    `date: ${dateStr}`,
    `type: 问答`,
    `category: ${answer.category}`,
    '---',
  ].join('\n')

  const markdown = [
    frontmatter,
    '',
    `# ${answer.question}`,
    '',
    `## ${answer.myNickname || '我'}的回答`,
    '',
    myAnswer,
    '',
    `## ${answer.partnerNickname || '对方'}的回答`,
    '',
    partnerAnswer,
  ]

  if (answer.aiAnalysis) {
    markdown.push('', '## AI 分析', '', answer.aiAnalysis)
  }

  const title = answer.question.slice(0, 30).replace(/[/\\?%*:|"<>]/g, '')
  const filename = `${dateStr}_问答_${title}.md`

  downloadFile(filename, markdown.join('\n'))
}

// --- Batch exports ---

export async function exportAllByType() {
  const [postcards, letters, qas] = await Promise.all([
    getPostcards(), getLetters(), getAnsweredQAHistory()
  ])

  let combined = '# Love Letter 全量导出\n\n'

  if (postcards.length > 0) {
    combined += '## 明信片\n\n'
    postcards.forEach((p, i) => {
      const content = htmlToText(p.content)
      combined += `### ${i + 1}. ${formatDate(p.createdAt)}${p.mood ? ' ' + p.mood : ''}\n\n${content}\n\n---\n\n`
    })
  }

  if (letters.length > 0) {
    combined += '## 信件\n\n'
    letters.forEach((l, i) => {
      const content = htmlToText(l.content)
      combined += `### ${i + 1}. ${formatDate(l.createdAt)}\n\n${content}\n\n---\n\n`
    })
  }

  if (qas.length > 0) {
    combined += '## 问答\n\n'
    qas.forEach((a, i) => {
      combined += `### ${i + 1}. ${a.question}\n\n**我的回答：** ${htmlToText(a.myAnswer)}\n\n**对方的回答：** ${htmlToText(a.partnerAnswer)}\n\n`
      if (a.aiAnalysis) {
        combined += `**AI 分析：** ${a.aiAnalysis}\n\n`
      }
      combined += '---\n\n'
    })
  }

  const now = formatDate(new Date().toISOString())
  downloadFile(`${now}_LoveLetter_全量导出.md`, combined)
}

export async function exportByFolder(folderId: string) {
  const folders = await getFolders()
  const folder = folders.find((f: any) => f.id === folderId)
  const folderName = folder?.name || folderId
  const postcards = getPostcardsByFolder(folderId)
  const letters = getLettersByFolder(folderId)

  let combined = `# ${folderName} - 导出\n\n`

  if (postcards.length > 0) {
    combined += '## 明信片\n\n'
    postcards.forEach((p, i) => {
      const content = htmlToText(p.content)
      combined += `### ${i + 1}. ${formatDate(p.createdAt)}${p.mood ? ' ' + p.mood : ''}\n\n${content}\n\n---\n\n`
    })
  }

  if (letters.length > 0) {
    combined += '## 信件\n\n'
    letters.forEach((l, i) => {
      const content = htmlToText(l.content)
      combined += `### ${i + 1}. ${formatDate(l.createdAt)}\n\n${content}\n\n---\n\n`
    })
  }

  const now = formatDate(new Date().toISOString())
  downloadFile(`${now}_${folderName}_导出.md`, combined)
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
