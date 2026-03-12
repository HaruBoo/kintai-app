/**
 * AdminTransport — 交通費確認タブ（管理者用）
 *
 * 機能:
 * - 社員を選択してその月の交通費データを閲覧できる
 * - 月の切り替えができる
 * - CSVダウンロード
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { downloadCSV } from '../../utils/csv'

// 社員の型
type UserRow = {
  id: string
  email: string
  name: string
}

// 交通費レコードの型
type TransportRow = {
  date: string
  from: string
  to: string
  amount: string
  receiptDate: string
  receiptAmount: string
}

function AdminTransport() {
  const [users,      setUsers]      = useState<UserRow[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [records,    setRecords]    = useState<TransportRow[]>([])

  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)

  const [loadingUsers,   setLoadingUsers]   = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)

  // 社員一覧を取得する
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('role', 'employee')
        .order('name')
      setUsers((data ?? []) as UserRow[])
      if (data && data.length > 0) setSelectedId(data[0].id)
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [])

  // 選択中の社員・月が変わったら交通費データを取得する
  const fetchRecords = useCallback(async () => {
    if (!selectedId) return
    setLoadingRecords(true)

    const prefix = `${viewYear}/${viewMonth}/`

    const { data, error } = await supabase
      .from('transport')
      .select('*')
      .eq('user_id', selectedId)
      .like('date', `${prefix}%`)
      .order('created_at')

    if (error) {
      console.error('交通費データの取得に失敗しました', error)
      setRecords([])
    } else {
      setRecords((data ?? []).map(row => ({
        date:          row.date,
        from:          row.from_station   ?? '',
        to:            row.to_station     ?? '',
        amount:        row.amount         ?? '',
        receiptDate:   row.receipt_date   ?? '',
        receiptAmount: row.receipt_amount ?? '',
      })))
    }

    setLoadingRecords(false)
  }, [selectedId, viewYear, viewMonth])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // 月を前後に移動する
  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  // 合計金額
  const total = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  // 選択中の社員名
  const selectedUser = users.find(u => u.id === selectedId)
  const displayName  = selectedUser?.name || selectedUser?.email || ''

  // CSVダウンロード
  const handleDownloadCSV = () => {
    const header = ['日付', '出発駅', '到着駅', '費用（円）', '領収書購入日', '領収書金額（円）']
    const rows   = records.map(r =>
      [r.date, r.from, r.to, r.amount, r.receiptDate, r.receiptAmount]
    )
    const footer = ['', '', '合計', String(total), '', '']
    downloadCSV(
      [header, ...rows, footer],
      `交通費_${displayName}_${viewYear}年${viewMonth}月.csv`
    )
  }

  if (loadingUsers) return <p className="admin-loading">読み込み中...</p>

  return (
    <div className="admin-transport">
      <h2 className="admin-section-title">交通費確認</h2>

      {/* 社員選択・月切り替え */}
      <div className="admin-attendance-toolbar">

        {/* 社員選択プルダウン */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-heading)' }}>
            社員
          </label>
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

        {/* 月切り替え */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="month-btn" onClick={prevMonth}>◀</button>
          <span className="month-label">{viewYear}年{viewMonth}月</span>
          <button className="month-btn" onClick={nextMonth}>▶</button>
        </div>

        {/* CSVダウンロード */}
        <button
          className="admin-invite-btn"
          onClick={handleDownloadCSV}
          disabled={records.length === 0}
        >
          表をダウンロード
        </button>
      </div>

      {/* 交通費テーブル */}
      {loadingRecords ? (
        <p className="admin-loading">読み込み中...</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>出発駅</th>
                  <th>到着駅</th>
                  <th>費用（円）</th>
                  <th>領収書購入日</th>
                  <th>領収書金額（円）</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      データがありません
                    </td>
                  </tr>
                ) : records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.from}</td>
                    <td>{r.to}</td>
                    <td>¥{Number(r.amount).toLocaleString()}</td>
                    <td>{r.receiptDate || '—'}</td>
                    <td>{r.receiptAmount ? `¥${Number(r.receiptAmount).toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              {records.length > 0 && (
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={3}>合計</td>
                    <td>¥{total.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminTransport
