/**
 * LeaderAttendance — チーム勤怠承認タブ（リーダー用）
 *
 * 機能:
 * - 提出済みの社員一覧を月別に表示
 * - 承認（→管理者へ）または差し戻し（→社員へ）ができる
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { downloadCSV } from '../../utils/csv'
import { getRowClass } from '../../utils/date'

// 社員の型
type UserRow = { id: string; email: string; name: string }

// 提出状態の型
type SubmissionRow = { status: string; reject_reason: string | null } | null

// 勤怠レコードの型
type AttendanceRow = {
  date: string; weekday: string; workType: string
  clockIn: string; clockOut: string; breakTime: string; workTime: string; note: string
}

function LeaderAttendance() {
  const [users,        setUsers]        = useState<UserRow[]>([])
  const [selectedId,   setSelectedId]   = useState<string>('')
  const [records,      setRecords]      = useState<AttendanceRow[]>([])
  const [viewYear,     setViewYear]     = useState(new Date().getFullYear())
  const [viewMonth,    setViewMonth]    = useState(new Date().getMonth() + 1)
  const [loadingUsers,   setLoadingUsers]   = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [submission,   setSubmission]   = useState<SubmissionRow>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectBox,setShowRejectBox]= useState(false)
  const [reviewing,    setReviewing]    = useState(false)

  // 社員一覧（リーダー自身を除く employee）を取得する
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('role', 'employee')
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

  // 提出状態を取得する
  const fetchSubmission = useCallback(async () => {
    if (!selectedId) return
    const { data } = await supabase
      .from('attendance_submissions')
      .select('status, reject_reason')
      .eq('user_id', selectedId)
      .eq('year', viewYear)
      .eq('month', viewMonth)
      .maybeSingle()
    setSubmission(data ?? null)
    setShowRejectBox(false)
    setRejectReason('')
  }, [selectedId, viewYear, viewMonth])

  useEffect(() => { fetchSubmission() }, [fetchSubmission])

  // 月を前後に移動する
  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  // リーダーが承認する（→ leader_approved へ）
  const handleApprove = async () => {
    if (!confirm('この月の勤怠を承認して管理者に送りますか？')) return
    setReviewing(true)
    await supabase
      .from('attendance_submissions')
      .update({ status: 'leader_approved', reviewed_at: new Date().toISOString() })
      .eq('user_id', selectedId)
      .eq('year', viewYear)
      .eq('month', viewMonth)
    setReviewing(false)
    fetchSubmission()
  }

  // リーダーが差し戻す（→ rejected へ）
  const handleReject = async () => {
    if (!rejectReason.trim()) { alert('差し戻し理由を入力してください'); return }
    setReviewing(true)
    await supabase
      .from('attendance_submissions')
      .update({
        status:        'rejected',
        reject_reason: rejectReason,
        reviewed_at:   new Date().toISOString(),
      })
      .eq('user_id', selectedId)
      .eq('year', viewYear)
      .eq('month', viewMonth)
    setReviewing(false)
    fetchSubmission()
  }

  // CSVダウンロード
  const handleDownloadCSV = () => {
    const selectedUser = users.find(u => u.id === selectedId)
    const displayName  = selectedUser?.name || selectedUser?.email || ''
    const workingDays  = records.filter(r => r.clockIn !== '-').length
    const header = ['日付', '曜日', '勤務区分', '出勤', '退勤', '休憩', '実働', '備考']
    const rows   = records.map(r =>
      [r.date, r.weekday, r.workType, r.clockIn, r.clockOut, r.breakTime, r.workTime, r.note]
    )
    downloadCSV(
      [header, ...rows, [`勤務日数: ${workingDays}日`, '', '', '', '', '', '', '']],
      `勤怠_${displayName}_${viewYear}年${viewMonth}月.csv`
    )
  }

  if (loadingUsers) return <p className="admin-loading">読み込み中...</p>

  const workingDays = records.filter(r => r.clockIn !== '-').length

  return (
    <div className="admin-attendance">
      <h2 className="admin-section-title">チーム勤怠承認</h2>

      {/* ツールバー */}
      <div className="admin-attendance-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-heading)' }}>社員</label>
          <select
            className="admin-role-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            {users.length === 0 ? (
              <option value="">社員がいません</option>
            ) : users.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="month-btn" onClick={prevMonth}>◀</button>
          <span className="month-label">{viewYear}年{viewMonth}月</span>
          <button className="month-btn" onClick={nextMonth}>▶</button>
        </div>
        <button
          className="admin-invite-btn"
          onClick={handleDownloadCSV}
          disabled={records.length === 0}
        >
          表をダウンロード
        </button>
      </div>

      {/* 提出状態・承認エリア */}
      <div className="submission-admin-area">
        {!submission && (
          <span className="submission-badge none">未提出</span>
        )}
        {submission?.status === 'submitted' && (
          <>
            <span className="submission-badge submitted">📬 承認待ち</span>
            <button className="admin-invite-btn" onClick={handleApprove} disabled={reviewing}>
              承認して管理者へ送る
            </button>
            <button className="admin-delete-btn" onClick={() => setShowRejectBox(v => !v)}>
              差し戻す
            </button>
            {showRejectBox && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', width: '100%' }}>
                <input
                  className="admin-input"
                  style={{ flex: 1 }}
                  placeholder="差し戻し理由を入力"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
                <button className="admin-delete-btn" onClick={handleReject} disabled={reviewing}>送信</button>
              </div>
            )}
          </>
        )}
        {submission?.status === 'leader_approved' && (
          <span className="submission-badge leader-approved">📋 管理者承認待ち（送信済み）</span>
        )}
        {submission?.status === 'approved' && (
          <span className="submission-badge approved">✅ 最終承認済み</span>
        )}
        {submission?.status === 'rejected' && (
          <span className="submission-badge rejected">❌ 差し戻し済み：{submission.reject_reason}</span>
        )}
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
                  <th>日付</th><th>曜日</th><th>勤務区分</th><th>出勤</th><th>退勤</th><th>休憩</th><th>実働</th><th>備考</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      データがありません
                    </td>
                  </tr>
                ) : records.map((r, i) => (
                  <tr key={i} className={getRowClass(r.date, r.weekday)}>
                    <td>{r.date}</td>
                    <td>{r.weekday}</td>
                    <td>{r.workType || '—'}</td>
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

export default LeaderAttendance
