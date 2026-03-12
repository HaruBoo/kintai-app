/**
 * LoginPage — ログイン画面
 *
 * タブで「一般」「管理者」を切り替えると画面の色が変わる。
 * （実際の認証処理はどちらも同じ。色はあくまで見た目の区別）
 */

import { useState } from 'react'
import { supabase } from './services/supabase'

// タブの種類
type LoginTab = 'employee' | 'admin'

function LoginPage() {
  // 現在選択中のタブ（一般 or 管理者）
  const [tab, setTab] = useState<LoginTab>('employee')

  // 入力値の管理
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // パスワードの表示/非表示
  const [showPassword, setShowPassword] = useState(false)

  // ローディング中フラグ（ボタンの二重送信を防ぐ）
  const [loading,  setLoading]  = useState(false)

  // エラーメッセージ
  const [error,    setError]    = useState<string | null>(null)

  // 管理者タブが選ばれているか
  const isAdmin = tab === 'admin'

  const handleLogin = async () => {
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }

    setLoading(true)
    setError(null)

    // ① Supabase でパスワード認証
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    // ② profiles テーブルから実際のロールを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const actualRole = profile?.role === 'admin' ? 'admin' : 'employee'

    // ③ 選択したタブと実際のロールを照合
    if (tab === 'admin' && actualRole !== 'admin') {
      // 「管理者」タブでログインしたが、実際は一般ユーザー
      await supabase.auth.signOut()
      setError('管理者アカウントではありません')
      setLoading(false)
      return
    }

    // ④ ログイン時に選んだタブを記憶する（App.tsx で画面切り替えに使う）
    sessionStorage.setItem('loginTab', tab)
    setLoading(false)
  }

  return (
    // isAdmin のときは login-page--admin クラスを付与して色を切り替える
    <div className={`login-page ${isAdmin ? 'login-page--admin' : ''}`}>
      <div className="login-card">

        {/* タブ（一般 / 管理者） */}
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'employee' ? 'login-tab--active' : ''}`}
            onClick={() => { setTab('employee'); setError(null) }}
          >
            一般
          </button>
          <button
            className={`login-tab ${tab === 'admin' ? 'login-tab--active' : ''}`}
            onClick={() => { setTab('admin'); setError(null) }}
          >
            管理者
          </button>
        </div>

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
            placeholder="例：username@example.inc"
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
