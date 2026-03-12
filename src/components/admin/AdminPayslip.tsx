/**
 * AdminPayslip — 給与明細管理タブ（管理者用）
 *
 * 機能:
 * - 社員を選択して給与明細ファイル（PDF等）をアップロード
 * - アップロード済みの給与明細一覧を表示・削除できる
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'

// 社員の型
type UserRow = {
  id: string
  email: string
  name: string
}

// 給与明細レコードの型
type PayslipRow = {
  id: string
  year: number
  month: number
  file_path: string
  comment: string | null
  admin_note: string | null
  created_at: string
}

function AdminPayslip() {
  const [users,        setUsers]        = useState<UserRow[]>([])
  const [selectedId,   setSelectedId]   = useState<string>('')
  const [year,         setYear]         = useState(new Date().getFullYear())
  const [month,        setMonth]        = useState(new Date().getMonth() + 1)
  const [file,         setFile]         = useState<File | null>(null)
  const [comment,      setComment]      = useState('')
  const [adminNote,    setAdminNote]    = useState('')
  const [uploading,    setUploading]    = useState(false)
  const [msg,          setMsg]          = useState<string | null>(null)
  const [isError,      setIsError]      = useState(false)
  const [payslips,     setPayslips]     = useState<PayslipRow[]>([])
  const [loadingList,  setLoadingList]  = useState(false)

  // 社員一覧を取得する
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('role', 'employee')
        .order('name')
      const list = (data ?? []) as UserRow[]
      setUsers(list)
      if (list.length > 0) setSelectedId(list[0].id)
    }
    fetchUsers()
  }, [])

  // 選択中の社員の給与明細一覧を取得する
  const fetchPayslips = useCallback(async () => {
    if (!selectedId) return
    setLoadingList(true)
    const { data } = await supabase
      .from('payslips')
      .select('*')
      .eq('user_id', selectedId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    setPayslips((data ?? []) as PayslipRow[])
    setLoadingList(false)
  }, [selectedId])

  useEffect(() => {
    fetchPayslips()
  }, [fetchPayslips])

  // ファイルをアップロードして DB に保存する
  const handleUpload = async () => {
    if (!selectedId) { showMsg('社員を選択してください', true); return }
    if (!file)       { showMsg('ファイルを選択してください', true); return }

    setUploading(true)
    setMsg(null)

    // Storage に保存するパスを決める
    // 例: {user_id}/2025/3/給与明細.pdf
    const filePath = `${selectedId}/${year}/${month}/${file.name}`

    // Supabase Storage にファイルをアップロードする
    const { error: uploadError } = await supabase.storage
      .from('payslips')
      .upload(filePath, file, { upsert: true })  // upsert: 同名ファイルは上書き

    if (uploadError) {
      showMsg('アップロードに失敗しました: ' + uploadError.message, true)
      setUploading(false)
      return
    }

    // payslips テーブルにレコードを保存する
    const { error: dbError } = await supabase
      .from('payslips')
      .upsert({
        user_id:    selectedId,
        year,
        month,
        file_path:  filePath,
        comment:    comment  || null,
        admin_note: adminNote || null,
      }, { onConflict: 'user_id,year,month' })  // 同じ社員・年月は上書き

    if (dbError) {
      showMsg('DB への保存に失敗しました: ' + dbError.message, true)
      setUploading(false)
      return
    }

    showMsg(`${year}年${month}月の給与明細をアップロードしました`, false)
    setFile(null)
    setComment('')
    setAdminNote('')
    setUploading(false)
    fetchPayslips()  // 一覧を更新する
  }

  // 給与明細を削除する
  const handleDelete = async (payslip: PayslipRow) => {
    if (!confirm(`${payslip.year}年${payslip.month}月の給与明細を削除しますか？`)) return

    // Storage からファイルを削除する
    await supabase.storage.from('payslips').remove([payslip.file_path])

    // DB からレコードを削除する
    await supabase.from('payslips').delete().eq('id', payslip.id)

    fetchPayslips()
  }

  // メッセージ表示のヘルパー
  const showMsg = (text: string, error: boolean) => {
    setMsg(text)
    setIsError(error)
  }

  // 選択中の社員名
  const selectedUser = users.find(u => u.id === selectedId)
  const displayName  = selectedUser?.name || selectedUser?.email || ''

  return (
    <div className="admin-payslip">
      <h2 className="admin-section-title">給与明細管理</h2>

      {/* メッセージ */}
      {msg && (
        <p className={isError ? 'admin-error' : 'admin-success'}>{msg}</p>
      )}

      {/* アップロードフォーム */}
      <div className="admin-payslip-form">

        {/* 社員選択 */}
        <div className="admin-form-row">
          <label>社員</label>
          <select
            className="admin-role-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            {users.length === 0 ? (
              <option value="">社員がいません</option>
            ) : users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </div>

        {/* 対象年月 */}
        <div className="admin-form-row">
          <label>対象年月</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              className="admin-input"
              style={{ width: '80px' }}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              min={2000}
              max={2100}
            />
            <span>年</span>
            <select
              className="admin-role-select"
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
        </div>

        {/* ファイル選択 */}
        <div className="admin-form-row">
          <label>給与明細ファイル（PDF等）</label>
          <input
            type="file"
            accept=".pdf,.xlsx,.csv"
            className="admin-file-input"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              選択中: {file.name}
            </p>
          )}
        </div>

        {/* 社員向けコメント */}
        <div className="admin-form-row">
          <label>コメント（社員に表示）</label>
          <textarea
            className="admin-textarea"
            placeholder="給与明細と一緒に社員に伝えたいこと"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
          />
        </div>

        {/* 管理者メモ */}
        <div className="admin-form-row">
          <label>管理者メモ（社員には見えない）</label>
          <textarea
            className="admin-textarea"
            placeholder="管理者向けのメモ"
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            rows={2}
          />
        </div>

        {/* アップロードボタン */}
        <button
          className="admin-send-btn"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'アップロード中...' : 'アップロードする'}
        </button>
      </div>

      {/* アップロード済み一覧 */}
      <h3 className="admin-section-title" style={{ marginTop: '32px', fontSize: '1rem' }}>
        {displayName} のアップロード済み給与明細（{payslips.length}件）
      </h3>

      {loadingList ? (
        <p className="admin-loading">読み込み中...</p>
      ) : payslips.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>まだアップロードされていません</p>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>年月</th>
                <th>コメント</th>
                <th>アップロード日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id}>
                  <td>{p.year}年{p.month}月</td>
                  <td>{p.comment || '—'}</td>
                  <td>{new Date(p.created_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    <button
                      className="admin-delete-btn"
                      onClick={() => handleDelete(p)}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPayslip
