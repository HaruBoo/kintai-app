/**
 * AdminAttendance — 勤怠確認タブ（管理者用）
 *
 * 機能:
 * - 社員を選択して、その月の勤怠データを閲覧できる
 * - 月の切り替えができる
 * - CSVダウンロード
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { getRowClass } from '../../utils/date'
import { downloadCSV } from '../../utils/csv'

// 社員の型
type UserRow = {
  id: string
  email: string
  name: string
}

// 勤怠レコードの型
type AttendanceRow = {
  date: string
  weekday: string
  clockIn: string
  clockOut: string
  breakTime: string
  workTime: string
  note: string
}

function AdminAttendance() {
  // 社員一覧
  const [users, setUsers]   = useState<UserRow[]>([])
  // 選択中の社員ID
  const [selectedId, setSelectedId] = useState<string>('')
  // 勤怠データ
  const [records, setRecords] = useState<AttendanceRow[]>([])

  // 表示月
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)

  // 読み込み中フラグ
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
      // 最初の社員を自動選択する
      if (data && data.length > 0) setSelectedId(data[0].id)
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [])

  // 選択中の社員・月が変わったら勤怠データを取得する
  const fetchRecords = useCallback(async () => {
    if (!selectedId) return
    setLoadingRecords(true)

    const prefix = `${viewYear}/${viewMonth}/`

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', selectedId)
      .like('date', `${prefix}%`)
      .order('date')

    if (error) {
      console.error('勤怠データの取得に失敗しました', error)
      setRecords([])
    } else {
      setRecords((data ?? []).map(row => ({
        date:      row.date,
        weekday:   row.weekday    ?? '',
        clockIn:   row.clock_in   ?? '-',
        clockOut:  row.clock_out  ?? '-',
        breakTime: row.break_time ?? '-',
        workTime:  row.work_time  ?? '-',
        note:      row.note       ?? '',
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

  // 勤務日数
  const workingDays = records.filter(r => r.clockIn !== '-').length

  // 選択中の社員名を取得する
  const selectedUser = users.find(u => u.id === selectedId)
  const displayName  = selectedUser?.name || selectedUser?.email || ''

  // 選択中の社員1人分をCSVダウンロード
  const handleDownloadCSV = () => {
    const header = ['日付', '曜日', '出勤', '退勤', '休憩', '実働', '備考']
    const rows   = records.map(r =>
      [r.date, r.weekday, r.clockIn, r.clockOut, r.breakTime, r.workTime, r.note]
    )
    const footer = [`勤務日数: ${workingDays}日`, '', '', '', '', '', '']
    downloadCSV(
      [header, ...rows, footer],
      `勤怠_${displayName}_${viewYear}年${viewMonth}月.csv`
    )
  }

  // 全社員分を1つのCSVにまとめてダウンロード
  const handleDownloadAllCSV = async () => {
    const prefix = `${viewYear}/${viewMonth}/`

    // 全社員の勤怠データを一括取得する
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .like('date', `${prefix}%`)
      .order('date')

    if (error || !data) return

    // user_id → 社員名 の対応表を作る
    const nameMap: Record<string, string> = {}
    users.forEach(u => { nameMap[u.id] = u.name || u.email })

    const header = ['社員名', '日付', '曜日', '出勤', '退勤', '休憩', '実働', '備考']
    const rows = data.map(row => [
      nameMap[row.user_id] ?? row.user_id,
      row.date,
      row.weekday    ?? '',
      row.clock_in   ?? '-',
      row.clock_out  ?? '-',
      row.break_time ?? '-',
      row.work_time  ?? '-',
      row.note       ?? '',
    ])

    downloadCSV(
      [header, ...rows],
      `勤怠_全社員_${viewYear}年${viewMonth}月.csv`
    )
  }

  if (loadingUsers) return <p className="admin-loading">読み込み中...</p>

  return (
    <div className="admin-attendance">
      <h2 className="admin-section-title">勤怠確認</h2>

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

        {/* 1人分ダウンロード */}
        <button
          className="admin-invite-btn"
          onClick={handleDownloadCSV}
          disabled={records.length === 0}
        >
          表をダウンロード
        </button>

        {/* 全社員一括ダウンロード */}
        <button
          className="admin-send-btn"
          onClick={handleDownloadAllCSV}
          disabled={users.length === 0}
        >
          全社員まとめてダウンロード
        </button>
      </div>

      {/* 勤怠テーブル */}
      {loadingRecords ? (
        <p className="admin-loading">読み込み中...</p>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
            勤務日数：{workingDays}日
          </p>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>日付</th><th>曜日</th><th>出勤</th><th>退勤</th><th>休憩</th><th>実働</th><th>備考</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      データがありません
                    </td>
                  </tr>
                ) : records.map((r, i) => (
                  <tr key={i} className={getRowClass(r.date, r.weekday)}>
                    <td>{r.date}</td>
                    <td>{r.weekday}</td>
                    <td>{r.clockIn}</td>
                    <td>{r.clockOut}</td>
                    <td>{r.breakTime}</td>
                    <td>{r.workTime}</td>
                    <td>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminAttendance
