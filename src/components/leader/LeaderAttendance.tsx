/**
 * LeaderAttendance — チーム勤怠確認・日次承認タブ（リーダー用）
 *
 * 機能:
 * - チーム社員の月別勤怠を表示
 * - 提出された日（daily_submissions）を行ごとに承認・差し戻し
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { downloadCSV } from '../../utils/csv'
import { getRowClass } from '../../utils/date'

// 社員の型
type UserRow = { id: string; email: string; name: string }

// 勤怠レコードの型
type AttendanceRow = {
  date: string; weekday: string; workType: string
  clockIn: string; clockOut: string; breakTime: string; workTime: string; note: string
}

// 日次提出の型
type DailySub = { status: 'submitted' | 'approved' | 'rejected'; reject_reason: string | null }

function LeaderAttendance() {
  const [users,          setUsers]          = useState<UserRow[]>([])
  const [selectedId,     setSelectedId]     = useState<string>('')
  const [records,        setRecords]        = useState<AttendanceRow[]>([])
  const [viewYear,       setViewYear]       = useState(new Date().getFullYear())
  const [viewMonth,      setViewMonth]      = useState(new Date().getMonth() + 1)
  const [loadingUsers,   setLoadingUsers]   = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [reviewing,      setReviewing]      = useState(false)

  // 日次提出状態（日付 → DailySub のマップ）
  const [dailyStatuses,  setDailyStatuses]  = useState<Map<string, DailySub>>(new Map())

  // 差し戻し入力（どの日の差し戻しボックスが開いているか）
  const [rejectDate,  setRejectDate]  = useState<string | null>(null)
  const [rejectValue, setRejectValue] = useState('')

  // 自分のチームの社員一覧を取得する
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingUsers(false); return }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single()

      const teamId = myProfile?.team_id ?? null
      if (!teamId) { setUsers([]); setLoadingUsers(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('role', 'employee')
        .eq('team_id', teamId)
        .order('name')

      const list = (data ?? []) as UserRow[]
      setUsers(list)
      if (list.length > 0) setSelectedId(list[0].id)
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [])

  // 勤怠データを取得する
  const fetchRecords = useCallback(async () => {
    if (!selectedId) return
    setLoadingRecords(true)
    const prefix = `${viewYear}/${viewMonth}/`
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', selectedId)
      .like('date', `${prefix}%`)
      .order('date')
    setRecords((data ?? []).map(row => ({
      date:      row.date,
      weekday:   row.weekday    ?? '',
      workType:  row.work_type  ?? '',
      clockIn:   row.clock_in   ?? '-',
      clockOut:  row.clock_out  ?? '-',
      breakTime: row.break_time ?? '-',
      workTime:  row.work_time  ?? '-',
      note:      row.note       ?? '',
    })))
    setLoadingRecords(false)
  }, [selectedId, viewYear, viewMonth])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // 日次提出状態を取得する
  const fetchDailySubmissions = useCallback(async () => {
    if (!selectedId) return
    const prefix = `${viewYear}/${viewMonth}/`
    const { data } = await supabase
      .from('daily_submissions')
      .select('date, status, reject_reason')
      .eq('user_id', selectedId)
      .like('date', `${prefix}%`)
    const map = new Map<string, DailySub>()
    ;(data ?? []).forEach(row => {
      map.set(row.date, { status: row.status, reject_reason: row.reject_reason })
    })
    setDailyStatuses(map)
    setRejectDate(null)
    setRejectValue('')
  }, [selectedId, viewYear, viewMonth])

  useEffect(() => { fetchDailySubmissions() }, [fetchDailySubmissions])

  // 月を前後に移動する
  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  // 1日を承認する
  const handleApproveDay = async (date: string) => {
    setReviewing(true)
    const { error } = await supabase
      .from('daily_submissions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('user_id', selectedId)
      .eq('date', date)
    if (error) { alert('承認に失敗しました: ' + error.message) }
    else {
      setDailyStatuses(prev => new Map(prev).set(date, { status: 'approved', reject_reason: null }))
    }
    setReviewing(false)
  }

  // 1日を差し戻す
  const handleRejectDay = async (date: string) => {
    if (!rejectValue.trim()) { alert('差し戻し理由を入力してください'); return }
    setReviewing(true)
    const { error } = await supabase
      .from('daily_submissions')
      .update({ status: 'rejected', reject_reason: rejectValue.trim(), reviewed_at: new Date().toISOString() })
      .eq('user_id', selectedId)
      .eq('date', date)
    if (error) { alert('差し戻しに失敗しました: ' + error.message) }
    else {
      setDailyStatuses(prev => new Map(prev).set(date, { status: 'rejected', reject_reason: rejectValue.trim() }))
      setRejectDate(null)
      setRejectValue('')
    }
    setReviewing(false)
  }

  // CSVダウンロード
  const handleDownloadCSV = () => {
    const selectedUser = users.find(u => u.id === selectedId)
    const displayName  = selectedUser?.name || selectedUser?.email || ''
    const workingDays  = records.filter(r => r.clockIn !== '-').length
    const header = ['日付', '曜日', '勤務区分', '出勤', '退勤', '休憩', '実働', '備考', '提出状態']
    const rows   = records.map(r => {
      const sub = dailyStatuses.get(r.date)
      const statusLabel = !sub ? '未提出'
        : sub.status === 'submitted' ? '承認待ち'
        : sub.status === 'approved'  ? '承認済み'
        : `差し戻し（${sub.reject_reason ?? ''}）`
      return [r.date, r.weekday, r.workType, r.clockIn, r.clockOut, r.breakTime, r.workTime, r.note, statusLabel]
    })
    downloadCSV(
      [header, ...rows, [`勤務日数: ${workingDays}日`, '', '', '', '', '', '', '', '']],
      `勤怠_${displayName}_${viewYear}年${viewMonth}月.csv`
    )
  }

  if (loadingUsers) return <p className="admin-loading">読み込み中...</p>

  if (users.length === 0) return (
    <div className="admin-attendance">
      <h2 className="admin-section-title">チーム勤怠確認</h2>
      <p style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>
        チームに所属していないか、チームに社員がいません。<br />
        管理者に「チーム管理」タブでチームへの追加を依頼してください。
      </p>
    </div>
  )

  const workingDays   = records.filter(r => r.clockIn !== '-').length
  const submittedCount = [...dailyStatuses.values()].filter(s => s.status === 'submitted').length

  return (
    <div className="admin-attendance">
      <h2 className="admin-section-title">チーム勤怠確認</h2>

      {/* ツールバー */}
      <div className="admin-attendance-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-heading)' }}>社員</label>
          <select
            className="admin-role-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="month-btn" onClick={prevMonth}>◀</button>
          <span className="month-label">{viewYear}年{viewMonth}月</span>
          <button className="month-btn" onClick={nextMonth}>▶</button>
        </div>
        <button className="admin-invite-btn" onClick={handleDownloadCSV} disabled={records.length === 0}>
          表をダウンロード
        </button>
      </div>

      {/* 承認待ちバッジ */}
      {submittedCount > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <span className="submission-badge submitted">📬 承認待ち {submittedCount}件</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
            ↓ 表の行で承認・差し戻しができます
          </span>
        </div>
      )}

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
                  <th>日付</th><th>曜日</th><th>勤務区分</th><th>出勤</th><th>退勤</th>
                  <th>休憩</th><th>実働</th><th>備考</th><th>提出状態</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      データがありません
                    </td>
                  </tr>
                ) : records.map((r, i) => {
                  const daySub = dailyStatuses.get(r.date)
                  return (
                    <>
                      <tr key={i} className={getRowClass(r.date, r.weekday)}>
                        <td>{r.date}</td>
                        <td>{r.weekday}</td>
                        <td>{r.workType || '—'}</td>
                        <td>{r.clockIn}</td>
                        <td>{r.clockOut}</td>
                        <td>{r.breakTime}</td>
                        <td>{r.workTime}</td>
                        <td>{r.note || '—'}</td>
                        <td className="daily-submit-cell">
                          {!daySub && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>未提出</span>
                          )}
                          {daySub?.status === 'submitted' && (
                            <span className="daily-badge submitted" style={{ flexWrap: 'wrap', gap: '4px' }}>
                              承認待ち
                              <button
                                className="btn-daily-submit"
                                onClick={() => handleApproveDay(r.date)}
                                disabled={reviewing}
                              >
                                承認
                              </button>
                              <button
                                className="btn-daily-cancel"
                                onClick={() => { setRejectDate(r.date); setRejectValue('') }}
                              >
                                差し戻し
                              </button>
                            </span>
                          )}
                          {daySub?.status === 'approved' && (
                            <span className="daily-badge approved">✅ 承認済み</span>
                          )}
                          {daySub?.status === 'rejected' && (
                            <span className="daily-badge rejected">
                              ❌ 差し戻し済み
                              {daySub.reject_reason && (
                                <span className="daily-reject-reason">（{daySub.reject_reason}）</span>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* 差し戻し理由入力行（その日の行の直下に表示） */}
                      {rejectDate === r.date && (
                        <tr key={`reject-${i}`}>
                          <td colSpan={9} style={{ background: 'var(--bg-row-sun)', padding: '8px 12px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                差し戻し理由：
                              </span>
                              <input
                                className="admin-input"
                                style={{ flex: 1 }}
                                placeholder="理由を入力してください"
                                value={rejectValue}
                                onChange={e => setRejectValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleRejectDay(r.date)}
                                autoFocus
                              />
                              <button
                                className="admin-delete-btn"
                                onClick={() => handleRejectDay(r.date)}
                                disabled={reviewing}
                              >
                                送信
                              </button>
                              <button
                                className="btn-delete-no"
                                onClick={() => { setRejectDate(null); setRejectValue('') }}
                              >
                                取消
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default LeaderAttendance
