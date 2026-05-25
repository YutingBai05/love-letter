import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Save, Sparkles, LogOut, Copy, User, Users, Shield, Lock, Unlock, FolderPlus, Trash2 } from 'lucide-react'
import { getAIKey, setAIKey, getAIModel, setAIModel, type AIProvider } from '@/lib/qa-store'
import { getSession, logout, generateInviteCode, getMyInviteCode, getPartnerEmail, getNickname, setNickname } from '@/lib/auth-store'

const DEFAULT_ABOUT = '灵感来源于几米的漫画《我只能为你画一张小卡片》。每一张卡片都是在心里藏了很久的话，就像现在的我一样。'
import { getFolders, addFolder, lockFolder, unlockFolder, deleteFolder, canModifyFolder } from '@/lib/store'
import { exportAllByType, exportByFolder } from '@/lib/export'

const PROVIDERS: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'gemini', label: 'Gemini', placeholder: 'AIza...' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const user = getSession()
  const partnerEmail = getPartnerEmail()

  // AI tab
  const [activeTab, setActiveTab] = useState<AIProvider>('openai')
  const savedKey = getAIKey(activeTab)
  const savedModel = getAIModel(activeTab)
  const [key, setKey] = useState(savedKey)
  const [model, setModel] = useState(savedModel)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  // Invite
  const [inviteCode, setInviteCode] = useState(getMyInviteCode)
  const [copied, setCopied] = useState(false)

  // Nickname
  const [nickname, setNicknameState] = useState(getNickname)
  const [nicknameSaved, setNicknameSaved] = useState(false)

  // About
  const [about, setAbout] = useState(() => localStorage.getItem('love-letter-about') || DEFAULT_ABOUT)
  const [editingAbout, setEditingAbout] = useState(false)
  const [aboutSaved, setAboutSaved] = useState(false)

  // Folder management
  const userRole = user?.role || 'owner'
  const allFolders = getFolders()
  const [newFolderName, setNewFolderName] = useState('')
  const [folderRefresh, setFolderRefresh] = useState(0)
  const refresh = () => setFolderRefresh((n) => n + 1)

  const handleSaveAI = () => {
    setAIKey(activeTab, key.trim())
    setAIModel(activeTab, model.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const switchTab = (provider: AIProvider) => {
    setActiveTab(provider)
    setKey(getAIKey(provider))
    setModel(getAIModel(provider))
    setShowKey(false)
    setSaved(false)
  }

  const handleGenerateInvite = () => {
    const code = generateInviteCode()
    setInviteCode(code)
  }

  const handleCopyInvite = () => {
    if (inviteCode) {
      const link = `${window.location.origin}/register?code=${inviteCode}`
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return
    addFolder(newFolderName.trim(), userRole)
    setNewFolderName('')
    refresh()
  }

  const handleToggleLock = (id: string, isLocked: boolean) => {
    if (isLocked) unlockFolder(id)
    else lockFolder(id)
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h1 className="text-2xl font-semibold text-ink-brown">设置</h1>
        <p className="text-warm-gray text-sm mt-1">管理你的偏好与账户</p>
      </div>

      {/* User info card */}
      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-rose" />
          <span className="text-sm font-medium text-ink-brown">账户信息</span>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-warm-gray">邮箱</span>
            <span className="text-ink-brown">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-warm-gray">昵称</span>
            <div className="flex items-center gap-2">
              <input
                value={nickname}
                onChange={(e) => setNicknameState(e.target.value)}
                className="w-24 px-2 py-1 rounded border border-warm-beige bg-white text-sm text-ink-brown text-right focus:outline-none focus:border-rose"
              />
              <button
                onClick={() => { setNickname(nickname); setNicknameSaved(true); setTimeout(() => setNicknameSaved(false), 1500) }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  nicknameSaved ? 'bg-green-500 text-white' : 'text-rose hover:bg-rose/5'
                }`}
              >
                {nicknameSaved ? '✓' : '保存'}
              </button>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-warm-gray">角色</span>
            <span className="text-ink-brown">{user?.role === 'owner' ? '邀请方' : '被邀请方'}</span>
          </div>
          {partnerEmail ? (
            <div className="flex justify-between">
              <span className="text-warm-gray">对方</span>
              <span className="text-ink-brown">{partnerEmail}</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-warm-gray">配对状态</span>
              <span className="text-orange-500">未配对</span>
            </div>
          )}
        </div>

        {/* Invite section (owner only) */}
        {user?.role === 'owner' && (
          <div className="border-t border-warm-beige pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium text-ink-brown">邀请对方</span>
            </div>
            {inviteCode ? (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteCode}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-warm-beige bg-warm-beige/30 text-sm text-ink-brown font-mono"
                />
                <button
                  onClick={handleCopyInvite}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    copied ? 'bg-green-500 text-white' : 'border border-rose text-rose hover:bg-rose/5'
                  }`}
                >
                  {copied ? '已复制 ✓' : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateInvite}
                className="w-full py-2 rounded-lg border border-gold text-gold text-sm hover:bg-gold/5 transition-colors"
              >
                生成邀请码
              </button>
            )}
            <p className="text-xs text-warm-gray">
              邀请码 7 天有效，对方注册后自动配对
            </p>
          </div>
        )}

        {/* Logout */}
        <div className="border-t border-warm-beige pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>

      {/* Folder management */}
      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose" />
          <span className="text-sm font-medium text-ink-brown">文件夹管理</span>
        </div>

        {/* Add folder */}
        <div className="flex gap-2">
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="新文件夹名称..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
            onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
          />
          <button onClick={handleAddFolder} className="px-3 py-1.5 rounded-lg bg-rose text-white text-sm">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Folder list */}
        <div className="divide-y divide-warm-beige/50" key={folderRefresh}>
          {allFolders.map((f) => {
            const canModify = canModifyFolder(f.id, userRole)
            return (
              <div key={f.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {f.isLocked && <Lock className="w-3 h-3 text-orange-400" />}
                  <span className="text-sm text-ink-brown">{f.name}</span>
                  <span className="text-xs text-warm-gray">
                    ({f.createdBy === 'owner' ? '邀请方' : '被邀请方'})
                  </span>
                </div>
                {canModify && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleLock(f.id, f.isLocked)}
                      className="p-1 rounded text-warm-gray hover:text-ink-brown transition-colors"
                      title={f.isLocked ? '解锁' : '锁定'}
                    >
                      {f.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => { deleteFolder(f.id); refresh() }}
                      className="p-1 rounded text-warm-gray hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-warm-gray">
          锁定后仅创建者可见文件夹内容。双方都能看到锁的标识。
        </p>
      </div>

      {/* AI Settings */}
      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-ink-brown">AI 分析设置</span>
        </div>

        <div className="flex gap-2">
          {PROVIDERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                activeTab === id
                  ? 'border-rose bg-rose/10 text-rose'
                  : 'border-warm-beige text-warm-gray hover:border-warm-gray'
              }`}
            >
              {label}
              {getAIKey(id) ? ' ✓' : ''}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={activeTab === 'gemini' ? 'gemini-2.0-flash' : activeTab === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo'}
          className="w-full px-3 py-2 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
        />

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={activeTab === 'gemini' ? 'AIza...' : 'sk-...'}
              className="w-full px-3 py-2 pr-10 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-gray hover:text-ink-brown"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleSaveAI}
            className={`px-4 py-2 rounded-lg text-white text-sm transition-colors ${
              saved ? 'bg-green-500' : 'bg-rose hover:bg-rose/90'
            }`}
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
        {saved && <p className="text-xs text-green-600">设置已保存</p>}
      </div>

      {/* Export */}
      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4 space-y-3">
        <div>
          <span className="text-sm font-medium text-ink-brown">导出数据</span>
          <p className="text-xs text-warm-gray mt-1">
            Markdown 格式，带 YAML frontmatter，兼容 Obsidian
          </p>
        </div>

        <button
          onClick={exportAllByType}
          className="w-full py-2 rounded-lg border border-rose text-rose text-sm hover:bg-rose/5 transition-colors"
        >
          全量导出（所有明信片 + 信件 + 问答）
        </button>

        <div className="border-t border-warm-beige pt-2">
          <p className="text-xs text-warm-gray mb-2">按文件夹导出</p>
          <div className="space-y-1.5">
            {allFolders.map((f) => (
              <button
                key={f.id}
                onClick={() => exportByFolder(f.id)}
                className="w-full py-1.5 rounded-lg border border-warm-beige text-sm text-ink-brown hover:border-rose hover:text-rose transition-colors text-left px-3"
              >
                {f.isLocked ? '🔒 ' : '📁 '}{f.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-brown">关于</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-gray">Love Letter v0.1</span>
            {user?.role === 'owner' && (
              <button
                onClick={() => setEditingAbout(!editingAbout)}
                className="text-xs text-rose hover:underline"
              >
                {editingAbout ? '取消' : '编辑'}
              </button>
            )}
          </div>
        </div>
        {editingAbout ? (
          <div className="space-y-2">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-warm-beige bg-white text-sm leading-relaxed focus:outline-none focus:border-rose resize-none"
            />
            <button
              onClick={() => {
                localStorage.setItem('love-letter-about', about.trim())
                setEditingAbout(false)
                setAboutSaved(true)
                setTimeout(() => setAboutSaved(false), 1500)
              }}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                aboutSaved ? 'bg-green-500 text-white' : 'bg-rose text-white hover:bg-rose/90'
              }`}
            >
              {aboutSaved ? '已保存 ✓' : '保存'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-warm-gray leading-relaxed">
            {about || DEFAULT_ABOUT}
          </p>
        )}
      </div>
    </div>
  )
}
