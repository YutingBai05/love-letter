import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, Mail, Lock, LogIn } from 'lucide-react'
import { loginUser } from '@/lib/auth-store'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = () => {
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码')
      return
    }
    setLoading(true)
    const result = loginUser(email, password)
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
          <h1 className="text-2xl font-semibold text-ink-brown mt-3">欢迎回来</h1>
          <p className="text-warm-gray text-sm mt-1">登录 Love Letter</p>
        </div>

        <div className="bg-white/70 rounded-xl border border-warm-beige shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs text-warm-gray mb-1 block">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-warm-gray mb-1 block">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-warm-beige bg-white text-sm focus:outline-none focus:border-rose"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-rose text-white text-sm font-medium hover:bg-rose/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        <p className="text-center text-xs text-warm-gray">
          还没有账号？{' '}
          <Link to="/register" className="text-rose hover:underline">
            注册
          </Link>
        </p>
      </div>
    </div>
  )
}
