/**
 * AdminTeams — チーム管理タブ（管理者用）
 *
 * 機能:
 * - チームの作成・名前変更・削除
 * - メンバーの追加・取り外し（リーダー・従業員のみ対象）
 * - 未所属メンバーの一覧表示・チーム割り当て
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'

// チームの型
type Team = { id: string; name: string }

// ユーザーの型
type UserRow = {
  id: string
  email: string
  name: string
  role: string
  team_id: string | null
}

function AdminTeams() {
  const [teams,   setTeams]   = useState<Team[]>([])
  const [users,   setUsers]   = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  // チーム作成フォーム
  const [newTeamName, setNewTeamName] = useState('')
  const [creating,    setCreating]    = useState(false)

  // チーム名インライン編集
  const [editTeamId,   setEditTeamId]   = useState<string | null>(null)
  const [editTeamName, setEditTeamName] = useState('')

  // チームとユーザー一覧をまとめて取得する
  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: teamsData }, { data: usersData }] = await Promise.all([
      supabase.from('teams').select('id, name').order('created_at'),
      supabase.from('profiles').select('id, email, name, role, team_id').order('name'),
    ])
    setTeams((teamsData ?? []) as Team[])
    setUsers((usersData ?? []) as UserRow[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // チームを作成する
  const handleCreate = async () => {
    if (!newTeamName.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('teams')
      .insert({ name: newTeamName.trim() })
      .select()
      .single()
    if (error) {
      alert('作成に失敗しました: ' + error.message)
    } else {
      setTeams(prev => [...prev, data as Team])
      setNewTeamName('')
    }
    setCreating(false)
  }

  // チーム名を更新する
  const handleRename = async (teamId: string) => {
    if (!editTeamName.trim()) { setEditTeamId(null); return }
    const { error } = await supabase
      .from('teams')
      .update({ name: editTeamName.trim() })
      .eq('id', teamId)
    if (error) {
      alert('更新に失敗しました: ' + error.message)
    } else {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: editTeamName.trim() } : t))
      setEditTeamId(null)
    }
  }

  // チームを削除する（メンバーの team_id は NULL になる）
  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`「${teamName}」を削除しますか？\nメンバーのチーム割り当ては解除されます。`)) return
    const { error } = await supabase.from('teams').delete().eq('id', teamId)
    if (error) {
      alert('削除に失敗しました: ' + error.message)
    } else {
      setTeams(prev => prev.filter(t => t.id !== teamId))
      setUsers(prev => prev.map(u => u.team_id === teamId ? { ...u, team_id: null } : u))
    }
  }

  // ユーザーのチームを変更する（null = 未所属）
  const handleAssign = async (userId: string, teamId: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ team_id: teamId })
      .eq('id', userId)
    if (error) {
      alert('割り当てに失敗しました: ' + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, team_id: teamId } : u))
    }
  }

  if (loading) return <p className="admin-loading">読み込み中...</p>

  // 管理者以外のユーザーのみ対象にする
  const targetUsers = users.filter(u => u.role !== 'admin')
  // 未所属ユーザー
  const unassignedUsers = targetUsers.filter(u => !u.team_id)

  return (
    <div className="admin-teams">
      <h2 className="admin-section-title">チーム管理</h2>

      {/* チーム作成フォーム */}
      <div className="admin-invite-form" style={{ marginBottom: '28px' }}>
        <input
          className="admin-input"
          placeholder="新しいチーム名を入力"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button
          className="admin-invite-btn"
          onClick={handleCreate}
          disabled={creating || !newTeamName.trim()}
        >
          {creating ? '作成中...' : '＋ チームを作成'}
        </button>
      </div>

      {/* チームが存在しない場合 */}
      {teams.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
          チームがありません。上のフォームから作成してください。
        </p>
      )}

      {/* チームカード一覧 */}
      {teams.map(team => {
        const members = targetUsers.filter(u => u.team_id === team.id)

        // 追加できるユーザー（このチーム以外の全員）
        const addable = targetUsers.filter(u => u.team_id !== team.id)

        return (
          <div key={team.id} className="team-card">

            {/* チームヘッダー */}
            <div className="team-card-header">
              {editTeamId === team.id ? (
                <span className="date-edit" style={{ flex: 1 }}>
                  <input
                    className="admin-input"
                    value={editTeamName}
                    onChange={e => setEditTeamName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRename(team.id)}
                    autoFocus
                  />
                  <button className="btn-delete-yes" onClick={() => handleRename(team.id)}>確定</button>
                  <button className="btn-delete-no" onClick={() => setEditTeamId(null)}>取消</button>
                </span>
              ) : (
                <>
                  <span className="team-name">{team.name}</span>
                  <span className="team-member-count">{members.length}人</span>
                  <button
                    className="admin-invite-btn"
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setEditTeamId(team.id); setEditTeamName(team.name) }}
                  >
                    名前を変更
                  </button>
                  <button
                    className="admin-delete-btn"
                    onClick={() => handleDelete(team.id, team.name)}
                  >
                    削除
                  </button>
                </>
              )}
            </div>

            {/* メンバー一覧 */}
            <div className="team-members">
              {members.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '8px 0' }}>
                  メンバーがいません
                </p>
              ) : members.map(u => (
                <div key={u.id} className="team-member-row">
                  <span className="team-member-name">{u.name || u.email}</span>
                  <span className={`team-member-role role-${u.role}`}>
                    {u.role === 'leader' ? 'リーダー' : '従業員'}
                  </span>
                  <button
                    className="btn-delete-no"
                    style={{ fontSize: '0.78rem', padding: '2px 10px' }}
                    onClick={() => handleAssign(u.id, null)}
                  >
                    外す
                  </button>
                </div>
              ))}
            </div>

            {/* メンバー追加ドロップダウン */}
            {addable.length > 0 && (
              <div className="team-add-member">
                <select
                  className="admin-role-select"
                  value=""
                  onChange={e => { if (e.target.value) handleAssign(e.target.value, team.id) }}
                >
                  <option value="" disabled>＋ メンバーを追加...</option>
                  {/* 未所属ユーザー */}
                  {addable.filter(u => !u.team_id).length > 0 && (
                    <optgroup label="未所属">
                      {addable.filter(u => !u.team_id).map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </optgroup>
                  )}
                  {/* 他チームから移動 */}
                  {addable.filter(u => u.team_id).length > 0 && (
                    <optgroup label="他のチームから移動">
                      {addable.filter(u => u.team_id).map(u => {
                        const currentTeam = teams.find(t => t.id === u.team_id)
                        return (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email}（{currentTeam?.name}）
                          </option>
                        )
                      })}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
          </div>
        )
      })}

      {/* 未所属メンバー一覧 */}
      {unassignedUsers.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <h3 className="admin-section-title" style={{ fontSize: '0.95rem' }}>
            未所属のメンバー（{unassignedUsers.length}人）
          </h3>
          <div className="team-card">
            <div className="team-members">
              {unassignedUsers.map(u => (
                <div key={u.id} className="team-member-row">
                  <span className="team-member-name">{u.name || u.email}</span>
                  <span className={`team-member-role role-${u.role}`}>
                    {u.role === 'leader' ? 'リーダー' : '従業員'}
                  </span>
                  {teams.length > 0 && (
                    <select
                      className="admin-role-select"
                      value=""
                      onChange={e => { if (e.target.value) handleAssign(u.id, e.target.value) }}
                    >
                      <option value="" disabled>チームを割り当て...</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTeams
