/**
 * ProfilePage — プロフィール編集ページ（社員用）
 *
 * 機能:
 * - 名前・社員番号を Supabase から取得して表示する
 * - 編集して保存すると Supabase に反映される
 * - メールアドレスは表示のみ（変更不可）
 */

import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'

function ProfilePage() {
  const [name,    setName]    = useState('')
  const [empNo,   setEmpNo]   = useState('')
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  // ログイン中のユーザーのプロフィールを取得する
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)

      // ログイン中のユーザー情報を取得する
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // メールアドレスは Auth から取得する
      setEmail(user.email ?? '')

      // 名前・社員番号は profiles テーブルから取得する
      const { data } = await supabase
        .from('profiles')
        .select('name, emp_no')
        .eq('id', user.id)
        .single()

      if (data) {
        setName(data.name   ?? '')
        setEmpNo(data.emp_no ?? '')
      }

      setLoading(false)
    }
    fetchProfile()
  }, [])

  // 保存ボタンを押したときの処理
  const handleSave = async () => {
    setSaving(true)
    setMsg(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // profiles テーブルを更新する
    const { error } = await supabase
      .from('profiles')
      .update({ name, emp_no: empNo })
      .eq('id', user.id)

    if (error) {
      setMsg('保存に失敗しました: ' + error.message)
      setIsError(true)
    } else {
      setMsg('保存しました')
      setIsError(false)
    }

    setSaving(false)
  }

  if (loading) return <p className="admin-loading">読み込み中...</p>

  return (
    <div className="profile-page">
      <h2 className="section-title">プロフィール</h2>

      {/* メッセージ */}
      {msg && (
        <p className={isError ? 'admin-error' : 'admin-success'}>{msg}</p>
      )}

      <div className="profile-page-form">

        {/* メールアドレス（表示のみ） */}
        <div className="admin-form-row">
          <label>メールアドレス</label>
          <input
            type="text"
            className="admin-input"
            value={email}
            disabled
            style={{ opacity: 0.6, cursor: 'not-allowed' }}
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            ※ メールアドレスは変更できません
          </p>
        </div>

        {/* 氏名 */}
        <div className="admin-form-row">
          <label>氏名</label>
          <input
            type="text"
            className="admin-input"
            placeholder="例: 山田 太郎"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* 社員番号 */}
        <div className="admin-form-row">
          <label>社員番号</label>
          <input
            type="text"
            className="admin-input"
            placeholder="例: 0001"
            value={empNo}
            onChange={e => setEmpNo(e.target.value)}
          />
        </div>

        {/* 保存ボタン */}
        <button
          className="admin-send-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存する'}
        </button>

      </div>
    </div>
  )
}

export default ProfilePage
