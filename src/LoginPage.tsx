/**
 * LoginPage — ログイン画面
 *
 * メールアドレスとパスワードを入力してログインする。
 * ログイン成功後は App.tsx 側でメイン画面に切り替える。
 */

import { useState } from 'react'
import { supabase } from './services/supabase'

function LoginPage() {
  // 入力値の管理
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // パスワードの表示/非表示（デフォルトは表示）
  const [showPassword, setShowPassword] = useState(true)

  // ローディング中フラグ（ボタンの二重送信を防ぐ）
  const [loading,  setLoading]  = useState(false)

  // エラーメッセージ
  const [error,    setError]    = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }

    setLoading(true)
    setError(null)

    // Supabase にログインを依頼する
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // ログイン失敗（メール・パスワードが違うなど）
      setError('メールアドレスまたはパスワードが正しくありません')
    }

    setLoading(false)
    // ログイン成功時は App.tsx の useEffect が自動で画面を切り替える
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ロゴ */}
        <p className="swell login-logo">Swell</p>
        <p className="login-subtitle">勤怠管理システム</p>

        {/* エラーメッセージ */}
        {error && <p className="login-error">{error}</p>}

        {/* メールアドレス */}
        <div className="login-field">
          <label>メールアドレス</label>
          <input
            type="email"
            className="login-input"
            placeholder="例：haru@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        {/* パスワード */}
        <div className="login-field">
          <label>パスワード</label>
          <div className="profile-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder="パスワード"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button
              className="toggle-mask-btn"
              onClick={() => setShowPassword(v => !v)}
              title={showPassword ? '隠す' : '表示する'}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {/* ログインボタン */}
        <button
          className="btn-login"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

      </div>
    </div>
  )
}

export default LoginPage
