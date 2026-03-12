/**
 * ChangePasswordModal — パスワード変更モーダル
 *
 * 「パスワードを変更する」ボタンを押すと表示される。
 * 新しいパスワードを入力して保存すると Supabase に反映される。
 */

import { useState } from 'react'
import { supabase } from '../services/supabase'

type Props = {
  onClose: () => void  // モーダルを閉じるときに呼ぶ
}

function ChangePasswordModal({ onClose }: Props) {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)

  const handleSave = async () => {
    // 入力チェック
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

    // Supabase にパスワードを更新する
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの変更に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    // 成功メッセージを表示して2秒後に閉じる
    setSuccess(true)
    setLoading(false)
    setTimeout(() => onClose(), 2000)
  }

  return (
    // 背景（クリックで閉じる）
    <div className="modal-overlay" onClick={onClose}>

      {/* モーダル本体（クリックが背景に伝わらないよう stopPropagation する） */}
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">パスワードを変更する</h2>

        {/* エラーメッセージ */}
        {error && <p className="login-error">{error}</p>}

        {/* 成功メッセージ */}
        {success && (
          <p style={{ color: 'var(--accent)', textAlign: 'center', marginBottom: '12px' }}>
            パスワードを変更しました！
          </p>
        )}

        {!success && (
          <>
            {/* 新しいパスワード */}
            <div className="login-field">
              <label>新しいパスワード（8文字以上）</label>
              <div className="profile-input-wrapper">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="login-input"
                  placeholder="新しいパスワード"
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

            {/* パスワード確認 */}
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

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                className="btn-login"
                onClick={handleSave}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? '変更中...' : '保存する'}
              </button>
              <button
                className="btn-logout"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                キャンセル
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ChangePasswordModal
