/**
 * AdminUsers — ユーザー管理タブ
 *
 * 機能:
 * - 登録済みユーザー一覧を表示（Supabase の profiles テーブルから取得）
 * - ロール（admin / employee）を変更できる
 * - アカウントを削除できる（Edge Function 経由）
 * - 新規ユーザーを招待できる（Edge Function 経由）
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'

// ユーザーの型
type UserRow = {
  id: string
  email: string
  name: string
  role: 'admin' | 'leader' | 'employee'
}

// Edge Function を呼び出す共通関数
async function callEdgeFunction(functionName: string, body: object) {
  // 現在のセッション（ログイントークン）を取得する
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { error: 'ログインしていません' }

  // トークンを明示的に渡して呼び出す
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error) return { error: error.message }
  return data
}

function AdminUsers() {
  // ユーザー一覧
  const [users, setUsers] = useState<UserRow[]>([])
  // 読み込み中フラグ
  const [loading, setLoading] = useState(true)
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null)

  // 新規招待フォーム
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<'admin' | 'leader' | 'employee'>('employee')
  const [inviting,    setInviting]    = useState(false)
  const [inviteMsg,   setInviteMsg]   = useState<string | null>(null)

  // ユーザー一覧を取得する
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .order('name')

    if (error) {
      setError('ユーザー一覧の取得に失敗しました: ' + error.message)
    } else {
      setUsers((data ?? []) as UserRow[])
    }

    setLoading(false)
  }, [])

  // 初回読み込み
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ロールを変更する
  const changeRole = async (userId: string, newRole: 'admin' | 'leader' | 'employee') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert('ロールの変更に失敗しました: ' + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  // ユーザーを削除する（Edge Function 経由）
  const deleteUser = async (userId: string, displayName: string) => {
    if (!window.confirm(`${displayName} を削除しますか？\nこの操作は取り消せません。`)) return

    const result = await callEdgeFunction('delete-user', { userId })

    if (result.error) {
      alert('削除に失敗しました: ' + result.error)
    } else {
      // 一覧から該当ユーザーを取り除く
      setUsers(prev => prev.filter(u => u.id !== userId))
    }
  }

  // 新規ユーザーを招待する（Edge Function 経由）
  const inviteUser = async () => {
    if (!inviteEmail) {
      setInviteMsg('メールアドレスを入力してください')
      return
    }

    setInviting(true)
    setInviteMsg(null)

    const result = await callEdgeFunction('invite-user', {
      email: inviteEmail,
      role: inviteRole,
    })

    if (result.error) {
      setInviteMsg('招待に失敗しました: ' + result.error)
    } else {
      setInviteMsg(`${inviteEmail} に招待メールを送りました`)
      setInviteEmail('')
      fetchUsers()
    }

    setInviting(false)
  }

  if (loading) return <p className="admin-loading">読み込み中...</p>
  if (error)   return <p className="admin-error">{error}</p>

  return (
    <div className="admin-users">
      <h2 className="admin-section-title">ユーザー一覧</h2>

      {/* ユーザーテーブル */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>氏名</th>
            <th>メールアドレス</th>
            <th>ロール</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: '#aaa' }}>
                ユーザーがいません
              </td>
            </tr>
          ) : users.map(user => (
            <tr key={user.id}>
              <td>{user.name || '（未設定）'}</td>
              <td>{user.email || '—'}</td>
              <td>
                <select
                  className="admin-role-select"
                  value={user.role}
                  onChange={e => changeRole(user.id, e.target.value as 'admin' | 'leader' | 'employee')}
                >
                  <option value="employee">従業員</option>
                  <option value="leader">リーダー</option>
                  <option value="admin">管理者</option>
                </select>
              </td>
              <td>
                <button
                  className="admin-delete-btn"
                  onClick={() => deleteUser(user.id, user.name || user.email)}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 新規招待フォーム */}
      <h2 className="admin-section-title" style={{ marginTop: '2rem' }}>
        新規ユーザーを招待
      </h2>

      {inviteMsg && (
        <p className={inviteMsg.includes('失敗') ? 'admin-error' : 'admin-success'}>
          {inviteMsg}
        </p>
      )}

      <div className="admin-invite-form">
        <input
          type="email"
          className="admin-input"
          placeholder="招待するメールアドレス"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
        />
        <select
          className="admin-role-select"
          value={inviteRole}
          onChange={e => setInviteRole(e.target.value as 'admin' | 'leader' | 'employee')}
        >
          <option value="employee">従業員</option>
          <option value="leader">リーダー</option>
          <option value="admin">管理者</option>
        </select>
        <button
          className="admin-invite-btn"
          onClick={inviteUser}
          disabled={inviting}
        >
          {inviting ? '送信中...' : '招待メールを送る'}
        </button>
      </div>
    </div>
  )
}

export default AdminUsers
