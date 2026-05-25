export interface Postcard {
  id: string
  folderId: string
  content: string
  bgColor: string
  mood: string
  authorNickname: string
  createdAt: string
  read: boolean
}

export interface Letter {
  id: string
  folderId: string
  content: string
  paperTemplate: string
  fontFamily: string
  authorNickname: string
  createdAt: string
  read: boolean
}

export interface Folder {
  id: string
  name: string
  isLocked: boolean
  createdBy: 'owner' | 'invitee'
}

export interface QAQuestion {
  id: string
  category: string
  question: string
}

export interface QAAnswer {
  id: string
  questionId: string
  question: string
  category: string
  myAnswer: string
  myNickname: string
  partnerAnswer: string
  partnerNickname: string
  aiAnalysis: string | null
  createdAt: string
  answeredAt: string | null
}
