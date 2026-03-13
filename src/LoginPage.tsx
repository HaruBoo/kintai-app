/**
 * LoginPage — ログイン画面
 *
 * タブで「一般」「管理者」を切り替えると画面の色が変わる。
 * 「初回ログイン・パスワードをお忘れの方」はメールアドレスを入力して
 * パスワードリセットメールを受け取れる。
 */

import { useState } from 'react'
import { supabase } from './services/supabase'

// タブの種類
type LoginTab = 'employee' | 'admin'

// 画面の種類（ログイン or パスワードリセット）
type View = 'login' | 'reset'

function LoginPage() {
  // 現在選択中のタブ（一般 or 管理者）
  const [tab, setTab] = useState<LoginTab>('employee')

  // 表示中の画面
  const [view, setView] = useState<View>('login')

  // 入力値の管理
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // パスワードの表示/非表示
  const [showPassword, setShowPassword] = useState(false)

  // ローディング中フラグ（ボタンの二重送信を防ぐ）
  const [loading, setLoading] = useState(false)

  // エラーメッセージ・成功メッセージ
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 管理者タブが選ばれているか
  const isAdmin = tab === 'admin'

  // ログイン処理
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
      await supabase.auth.signOut()
      setError('管理者アカウントではありません')
      setLoading(false)
      return
    }

    // ④ ログイン時に選んだタブを記憶する（App.tsx で画面切り替えに使う）
    sessionStorage.setItem('loginTab', tab)
    setLoading(false)
  }

  // パスワードリセットメール送信
  const handleReset = async () => {
    if (!email) {
      setError('メールアドレスを入力してください')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    // アプリのURLにリダイレクトさせる（本番・開発どちらにも対応）
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) {
      setError('送信に失敗しました: ' + error.message)
    } else {
      setSuccess(`${email} にパスワード設定メールを送りました。メールのリンクをクリックしてください。`)
    }

    setLoading(false)
  }

  // パスワードリセット画面
  if (view === 'reset') {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="swell login-logo">Swell</p>
          <p className="login-subtitle">パスワードの設定・再設定</p>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
            登録済みのメールアドレスを入力してください。<br />
            パスワード設定用のリンクをメールで送ります。
          </p>

          {error   && <p className="login-error">{error}</p>}
          {success && <p className="admin-success" style={{ fontSize: '0.85rem' }}>{success}</p>}

          <div className="login-field">
            <label>メールアドレス</label>
            <input
              type="email"
              className="login-input"
              placeholder="例：username@example.inc"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              autoComplete="email"
            />
          </div>

          <button
            className="btn-login"
            onClick={handleReset}
            disabled={loading || !!success}
          >
            {loading ? '送信中...' : 'パスワード設定メールを送る'}
          </button>

          <button
            className="login-reset-link"
            onClick={() => { setView('login'); setError(null); setSuccess(null) }}
          >
            ← ログイン画面に戻る
          </button>
        </div>
      </div>
    )
  }

  // ログイン画面
  return (
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

        {/* 初回ログイン・パスワードリセットリンク */}
        <button
          className="login-reset-link"
          onClick={() => { setView('reset'); setError(null); setSuccess(null) }}
        >
          初回ログイン・パスワードをお忘れの方はこちら
        </button>

      </div>
    </div>
  )
}

export default LoginPage
