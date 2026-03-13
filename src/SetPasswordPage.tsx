/**
 * SetPasswordPage — 初回パスワード設定画面
 *
 * 招待リンクからログインしたユーザーが最初に表示する画面。
 * パスワードを設定して「保存」を押すと通常の画面に移行する。
 */

import { useState } from 'react'
import { supabase } from './services/supabase'

// パスワード設定が完了したときに呼び出すコールバック
type Props = {
  onComplete: () => void
}

function SetPasswordPage({ onComplete }: Props) {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleSave = async () => {
    if (!password || !confirm) {
      setError('パスワードを入力してください')
      return
    }
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    setLoading(true)
    setError(null)

    // Supabase にパスワードを登録する
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの設定に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    // 成功したら通常画面に切り替える
    onComplete()
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="swell login-logo">Swell</p>
        <p className="login-subtitle">新しいパスワードを設定</p>

        {error && <p className="login-error">{error}</p>}

        <div className="login-field">
          <label>新しいパスワード（8文字以上）</label>
          <div className="profile-input-wrapper">
            <input
              type={showPass ? 'text' : 'password'}
              className="login-input"
              placeholder="パスワードを入力"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              className="toggle-mask-btn"
              onClick={() => setShowPass(v => !v)}
              title={showPass ? '隠す' : '表示する'}
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="login-field">
          <label>パスワード（確認）</label>
          <input
            type={showPass ? 'text' : 'password'}
            className="login-input"
            placeholder="もう一度入力"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <button
          className="btn-login"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '保存中...' : 'パスワードを設定する'}
        </button>
      </div>
    </div>
  )
}

export default SetPasswordPage
