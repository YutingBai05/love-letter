import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, Mail, Lock, UserPlus, Key } from 'lucide-react'
import { registerUser } from '@/lib/auth-store'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<'owner' | 'invitee'>('owner')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async () => {
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码')
      return
    }
    if (password.length < 4) {
      setError('密码至少 4 位')
      return
    }
    if (role === 'invitee' && !inviteCode.trim()) {
      setError('被邀请方需要输入邀请码')
      return
    }
    setLoading(true)
    const result = await registerUser(email, password, nickname, role, inviteCode.trim() || undefined)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Heart className="w-10 h-10 text-rose mx-auto" fill="currentColor" />
          <h1 className="text-2xl font-semibold text-ink-brown mt-3">创建账号</h1>
          <p className="text-warm-gray text-sm mt-1">加入 Love Letter</p>
        </div>

        <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs text-warm-gray mb-2 block">角色</label>
            <div className="flex gap-2">
              {(['owner', 'invitee'] as const).map((r) => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    role === r ? 'border-rose bg-rose/10 text-rose' : 'border-warm-beige text-warm-gray hover:border-warm-gray'
                  }`}>
                  {r === 'owner' ? '邀请方' : '被邀请方'}
                </button>
              ))}
            </div>
          </div>

          {role === 'invitee' && (
            <div>
              <label className="text-xs text-warm-gray mb-1 block">邀请码</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray" />
                <input type="text" value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="LL-..." className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose uppercase" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-warm-gray mb-1 block">昵称</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
              placeholder="你的昵称（可选）"
              className="w-full px-3 py-2.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose" />
          </div>

          <div>
            <label className="text-xs text-warm-gray mb-1 block">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()} />
            </div>
          </div>

          <div>
            <label className="text-xs text-warm-gray mb-1 block">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 4 位"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()} />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button onClick={handleRegister} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-rose text-white text-sm font-medium hover:bg-rose/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />{loading ? '注册中...' : '注册'}
          </button>
        </div>

        <p className="text-center text-xs text-warm-gray">
          已有账号？<Link to="/login" className="text-rose hover:underline">登录</Link>
        </p>
      </div>
    </div>
  )
}
