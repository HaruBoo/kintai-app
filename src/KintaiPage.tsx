import { useState, useEffect, useCallback } from 'react'
import type { DayRecord } from './types/attendance'
import { WORK_TYPES } from './types/attendance'
import type { Profile } from './types/profile'
import { HOURS, MINUTES, toHHMM, getNowH, getNowM, calcTimes, calcWorkTimeFromBreak } from './utils/time'
import { formatDateLong, formatDateShort, getWeekday, dateJPtoISO, getRowClass } from './utils/date'
import { supabase } from './services/supabase'
import CsvExport from './components/CsvExport'

type Props = {
  viewYear: number
  viewMonth: number
  profile: Profile
}

// 月次提出状態の型
type SubmissionStatus = 'none' | 'submitted' | 'leader_approved' | 'approved' | 'rejected'

// 日次提出の型
type DailySub = { status: 'submitted' | 'approved' | 'rejected'; reject_reason: string | null }

function KintaiPage({ viewYear, viewMonth, profile }: Props) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // 勤怠レコード一覧
  const [records, setRecords] = useState<DayRecord[]>([])
  const [loading, setLoading] = useState(true)

  // 打刻時刻セレクト
  const [clockInH,  setClockInH]  = useState(getNowH)
  const [clockInM,  setClockInM]  = useState(getNowM)
  const [clockOutH, setClockOutH] = useState(getNowH)
  const [clockOutM, setClockOutM] = useState(getNowM)

  // テーブル編集状態
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
  const [editDateIndex,  setEditDateIndex]  = useState<number | null>(null)
  const [editDateValue,  setEditDateValue]  = useState('')
  const [editNoteIndex,  setEditNoteIndex]  = useState<number | null>(null)
  const [editNoteValue,  setEditNoteValue]  = useState('')
  const [editBreakIndex, setEditBreakIndex] = useState<number | null>(null)
  const [editBreakValue, setEditBreakValue] = useState('')

  // 月次提出状態（SubmitPage との連携用）
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('none')
  const [rejectReason,     setRejectReason]     = useState<string>('')

  // 日次提出状態（日付 → DailySub のマップ）
  const [dailyStatuses, setDailyStatuses] = useState<Map<string, DailySub>>(new Map())

  // 1秒ごとに時刻を更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 勤怠データを取得する
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const prefix = `${viewYear}/${viewMonth}/`
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .like('date', `${prefix}%`)
      .order('date')
    if (error) {
      console.error('勤怠データの取得に失敗しました', error)
    } else {
      setRecords((data ?? []).map(row => ({
        date:      row.date,
        weekday:   row.weekday    ?? '',
        clockIn:   row.clock_in   ?? '-',
        clockOut:  row.clock_out  ?? '-',
        breakTime: row.break_time ?? '-',
        workTime:  row.work_time  ?? '-',
        note:      row.note       ?? '',
        workType:  row.work_type  ?? '',
      })))
    }
    setLoading(false)
  }, [viewYear, viewMonth])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // 月次提出状態を取得する
  const fetchSubmission = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('attendance_submissions')
      .select('status, reject_reason')
      .eq('user_id', user.id)
      .eq('year', viewYear)
      .eq('month', viewMonth)
      .maybeSingle()
    if (data) {
      setSubmissionStatus(data.status as SubmissionStatus)
      setRejectReason(data.reject_reason ?? '')
    } else {
      setSubmissionStatus('none')
      setRejectReason('')
    }
  }, [viewYear, viewMonth])

  useEffect(() => { fetchSubmission() }, [fetchSubmission])

  // 日次提出状態を取得する
  const fetchDailySubmissions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const prefix = `${viewYear}/${viewMonth}/`
    const { data } = await supabase
      .from('daily_submissions')
      .select('date, status, reject_reason')
      .eq('user_id', user.id)
      .like('date', `${prefix}%`)
    const map = new Map<string, DailySub>()
    ;(data ?? []).forEach(row => {
      map.set(row.date, { status: row.status, reject_reason: row.reject_reason })
    })
    setDailyStatuses(map)
  }, [viewYear, viewMonth])

  useEffect(() => { fetchDailySubmissions() }, [fetchDailySubmissions])

  const dateStr      = formatDateLong(currentTime)
  const todayKey     = formatDateShort(currentTime)
  const todayWeekday = getWeekday(currentTime)

  const isCurrentMonth =
    viewYear === currentTime.getFullYear() && viewMonth === currentTime.getMonth() + 1

  const workingDays = records.filter(r => r.clockIn !== '-').length

  // 月次ロック（月全体が提出済み・承認済み）
  const isMonthLocked = submissionStatus === 'submitted'
    || submissionStatus === 'leader_approved'
    || submissionStatus === 'approved'

  // 1日ごとのロック判定（月次ロック優先、その後は日次状態で判定）
  const isDayLocked = (date: string) => {
    if (isMonthLocked) return true
    const s = dailyStatuses.get(date)?.status
    return s === 'submitted' || s === 'approved'
  }

  // === 1日ごとの提出 ===

  // 1日分を提出する
  const handleDailySubmit = async (date: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('daily_submissions')
      .upsert(
        { user_id: user.id, date, status: 'submitted', reject_reason: null, submitted_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
      )
    if (error) { alert('提出に失敗しました: ' + error.message); return }
    setDailyStatuses(prev => new Map(prev).set(date, { status: 'submitted', reject_reason: null }))
  }

  // 1日分の提出を取り消す
  const handleDailyCancel = async (date: string) => {
    if (!confirm('この日の提出を取り消しますか？')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('daily_submissions')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date)
    if (error) { alert('取り消しに失敗しました: ' + error.message); return }
    setDailyStatuses(prev => {
      const next = new Map(prev)
      next.delete(date)
      return next
    })
  }

  // === テーブル編集 ===

  const handleDateClick = (index: number, currentDate: string) => {
    setEditDateIndex(index)
    setEditDateValue(dateJPtoISO(currentDate))
  }

  const handleDateSave = async (index: number) => {
    if (!editDateValue) { setEditDateIndex(null); return }
    const d       = new Date(editDateValue)
    const newDate = formatDateShort(d)
    const newWeek = getWeekday(d)
    const oldDate = records[index].date
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('attendance')
      .update({ date: newDate, weekday: newWeek })
      .eq('user_id', user.id)
      .eq('date', oldDate)
    if (error) {
      alert('日付の更新に失敗しました: ' + error.message)
    } else {
      setRecords(records.map((r, i) => i === index ? { ...r, date: newDate, weekday: newWeek } : r))
    }
    setEditDateIndex(null)
  }

  const handleDelete = async (index: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('user_id', user.id)
      .eq('date', records[index].date)
    if (error) {
      alert('削除に失敗しました: ' + error.message)
    } else {
      setRecords(records.filter((_, i) => i !== index))
    }
    setDeleteConfirmIndex(null)
  }

  const handleClockIn = async () => {
    if (!isCurrentMonth) { alert('過去・未来の月には打刻できません'); return }
    const exists = records.find(r => r.date === todayKey)
    if (exists) { alert('本日はすでに出勤打刻済みです'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const newRecord: DayRecord = {
      date: todayKey, weekday: todayWeekday,
      clockIn: toHHMM(clockInH, clockInM),
      clockOut: '-', breakTime: '-', workTime: '-', note: '', workType: '',
    }
    const { error } = await supabase
      .from('attendance')
      .insert({
        user_id: user.id, date: newRecord.date, weekday: newRecord.weekday,
        clock_in: newRecord.clockIn, clock_out: '-', break_time: '-', work_time: '-', note: '',
      })
    if (error) { alert('出勤打刻に失敗しました: ' + error.message) }
    else { setRecords([...records, newRecord]) }
  }

  const handleClockOut = async () => {
    if (!isCurrentMonth) { alert('過去・未来の月には打刻できません'); return }
    const todayRecord = records.find(r => r.date === todayKey)
    if (!todayRecord) { alert('出勤打刻がまだです'); return }
    if (todayRecord.clockOut !== '-') { alert('本日はすでに退勤打刻済みです'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const clockOut = toHHMM(clockOutH, clockOutM)
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    if (toMin(clockOut) <= toMin(todayRecord.clockIn)) {
      alert(`退勤時刻（${clockOut}）が出勤時刻（${todayRecord.clockIn}）より早いか同じです。\n正しい時刻を選んでください。`)
      return
    }
    const { breakTime, workTime } = calcTimes(todayRecord.clockIn, clockOut)
    const { error } = await supabase
      .from('attendance')
      .update({ clock_out: clockOut, break_time: breakTime, work_time: workTime })
      .eq('user_id', user.id)
      .eq('date', todayKey)
    if (error) { alert('退勤打刻に失敗しました: ' + error.message) }
    else { setRecords(records.map(r => r.date === todayKey ? { ...r, clockOut, breakTime, workTime } : r)) }
  }

  const handleNoteSave = async (index: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('attendance')
      .update({ note: editNoteValue })
      .eq('user_id', user.id)
      .eq('date', records[index].date)
    if (error) { alert('備考の保存に失敗しました: ' + error.message) }
    else { setRecords(records.map((r, i) => i === index ? { ...r, note: editNoteValue } : r)) }
    setEditNoteIndex(null)
  }

  const handleBreakSave = async (index: number) => {
    if (!editBreakValue) { setEditBreakIndex(null); return }
    const record = records[index]
    const workTime = (record.clockIn !== '-' && record.clockOut !== '-')
      ? calcWorkTimeFromBreak(record.clockIn, record.clockOut, editBreakValue)
      : record.workTime
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('attendance')
      .update({ break_time: editBreakValue, work_time: workTime })
      .eq('user_id', user.id)
      .eq('date', record.date)
    if (error) { alert('休憩時間の保存に失敗しました: ' + error.message) }
    else { setRecords(records.map((r, i) => i === index ? { ...r, breakTime: editBreakValue, workTime } : r)) }
    setEditBreakIndex(null)
  }

  const handleWorkTypeSave = async (index: number, workType: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('attendance')
      .update({ work_type: workType || null })
      .eq('user_id', user.id)
      .eq('date', records[index].date)
    if (!error) {
      setRecords(records.map((r, i) => i === index ? { ...r, workType: workType as DayRecord['workType'] } : r))
    }
  }

  return (
    <div>
      {/* 日付・ロゴ */}
      <div className="clock-section">
        <p className="date">{dateStr}</p>
        <p className="swell">Swell</p>
      </div>

      {/* 打刻ボタン（今月・月次ロックなしのみ表示） */}
      {isCurrentMonth && !isMonthLocked && (
        <div className="button-group">
          <div className="punch-area">
            <div className="time-select-group">
              <select className="time-select" value={clockInH} onChange={e => setClockInH(e.target.value)}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="time-colon">:</span>
              <select className="time-select" value={clockInM} onChange={e => setClockInM(e.target.value)}>
                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button className="btn-clockin" onClick={handleClockIn}>出勤</button>
          </div>
          <div className="punch-area">
            <div className="time-select-group">
              <select className="time-select" value={clockOutH} onChange={e => setClockOutH(e.target.value)}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="time-colon">:</span>
              <select className="time-select" value={clockOutM} onChange={e => setClockOutM(e.target.value)}>
                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button className="btn-clockout" onClick={handleClockOut}>退勤</button>
          </div>
        </div>
      )}

      {/* 勤務実績テーブル */}
      <div className="table-header">
        <h2>勤務実績</h2>
        <div className="table-header-right">
          <span className="working-days">勤務日数：{workingDays}日</span>
          <CsvExport
            buildRows={() => records.map(r =>
              [r.date, r.weekday, r.workType, r.clockIn, r.clockOut, r.breakTime, r.workTime, r.note]
            )}
            filename={`勤怠_${viewYear}年${viewMonth}月.csv`}
            profile={profile}
            summary={`勤務日数: ${workingDays}日`}
          />
        </div>
      </div>

      <div className="table-scroll">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>読み込み中...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>日付</th><th>曜日</th><th>勤務区分</th><th>出勤</th><th>退勤</th>
                <th>休憩</th><th>実働</th><th>備考</th><th>提出</th><th></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={10} className="no-record">データがありません</td></tr>
              ) : (
                records.map((r, i) => {
                  const daySub   = dailyStatuses.get(r.date)
                  const dayLocked = isDayLocked(r.date)
                  // 出勤・退勤が揃っていれば提出可能
                  const canSubmit = r.clockIn !== '-' && r.clockOut !== '-'

                  return (
                    <tr key={i} className={getRowClass(r.date, r.weekday)}>

                      {/* 日付 */}
                      <td>
                        {!dayLocked && editDateIndex === i ? (
                          <span className="date-edit">
                            <input type="date" className="date-edit-input"
                              value={editDateValue} onChange={e => setEditDateValue(e.target.value)} />
                            <button className="btn-delete-yes" onClick={() => handleDateSave(i)}>確定</button>
                            <button className="btn-delete-no" onClick={() => setEditDateIndex(null)}>取消</button>
                          </span>
                        ) : dayLocked ? (
                          <span>{r.date}</span>
                        ) : (
                          <span className="editable-cell" onClick={() => handleDateClick(i, r.date)} title="クリックで編集">
                            {r.date} ✏️
                          </span>
                        )}
                      </td>

                      <td>{r.weekday}</td>

                      {/* 勤務区分 */}
                      <td>
                        {dayLocked ? (
                          <span>{r.workType || '—'}</span>
                        ) : (
                          <select
                            className="work-type-select"
                            value={r.workType}
                            onChange={e => handleWorkTypeSave(i, e.target.value)}
                          >
                            <option value="">—</option>
                            {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                      </td>

                      <td>{r.clockIn}</td>
                      <td>{r.clockOut}</td>

                      {/* 休憩時間 */}
                      <td>
                        {!dayLocked && editBreakIndex === i ? (
                          <span className="date-edit">
                            <input type="text" className="date-edit-input" style={{ width: '70px' }}
                              value={editBreakValue} placeholder="例: 1:00"
                              onChange={e => setEditBreakValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleBreakSave(i)} />
                            <button className="btn-delete-yes" onClick={() => handleBreakSave(i)}>確定</button>
                            <button className="btn-delete-no" onClick={() => setEditBreakIndex(null)}>取消</button>
                          </span>
                        ) : dayLocked ? (
                          <span>{r.breakTime}</span>
                        ) : (
                          <span className="editable-cell"
                            onClick={() => { setEditBreakIndex(i); setEditBreakValue(r.breakTime === '-' ? '' : r.breakTime) }}
                            title="クリックで編集">
                            {r.breakTime} ✏️
                          </span>
                        )}
                      </td>

                      <td>{r.workTime}</td>

                      {/* 備考 */}
                      <td>
                        {!dayLocked && editNoteIndex === i ? (
                          <span className="date-edit">
                            <input type="text" className="date-edit-input" style={{ width: '120px' }}
                              value={editNoteValue} placeholder="備考を入力"
                              onChange={e => setEditNoteValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleNoteSave(i)} />
                            <button className="btn-delete-yes" onClick={() => handleNoteSave(i)}>確定</button>
                            <button className="btn-delete-no" onClick={() => setEditNoteIndex(null)}>取消</button>
                          </span>
                        ) : dayLocked ? (
                          <span>{r.note || '—'}</span>
                        ) : (
                          <span className="editable-cell"
                            onClick={() => { setEditNoteIndex(i); setEditNoteValue(r.note) }}
                            title="クリックで編集">
                            {r.note || '—'} ✏️
                          </span>
                        )}
                      </td>

                      {/* 日次提出セル */}
                      <td className="daily-submit-cell">
                        {!daySub && canSubmit && !isMonthLocked && (
                          <button className="btn-daily-submit" onClick={() => handleDailySubmit(r.date)}>
                            提出
                          </button>
                        )}
                        {daySub?.status === 'submitted' && (
                          <span className="daily-badge submitted">
                            承認待ち
                            <button className="btn-daily-cancel" onClick={() => handleDailyCancel(r.date)}>取消</button>
                          </span>
                        )}
                        {daySub?.status === 'approved' && (
                          <span className="daily-badge approved">✅ 承認済み</span>
                        )}
                        {daySub?.status === 'rejected' && (
                          <span className="daily-badge rejected">
                            ❌ 差し戻し
                            {daySub.reject_reason && <span className="daily-reject-reason">（{daySub.reject_reason}）</span>}
                            <button className="btn-daily-submit" onClick={() => handleDailySubmit(r.date)}>再提出</button>
                          </span>
                        )}
                      </td>

                      {/* 削除ボタン */}
                      <td>
                        {!dayLocked && !isMonthLocked && (
                          deleteConfirmIndex === i ? (
                            <span className="delete-confirm">
                              <button className="btn-delete-yes" onClick={() => handleDelete(i)}>はい</button>
                              <button className="btn-delete-no" onClick={() => setDeleteConfirmIndex(null)}>キャンセル</button>
                            </span>
                          ) : (
                            <button className="btn-delete" onClick={() => setDeleteConfirmIndex(i)}>削除</button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 月次提出ステータスバッジ */}
      {submissionStatus !== 'none' && (
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {submissionStatus === 'submitted'       && <span className="submission-badge submitted">📬 月次承認待ち（リーダー確認中）</span>}
          {submissionStatus === 'leader_approved'  && <span className="submission-badge leader-approved">📋 管理者承認待ち</span>}
          {submissionStatus === 'approved'        && <span className="submission-badge approved">✅ 最終承認済み</span>}
          {submissionStatus === 'rejected'        && <span className="submission-badge rejected">❌ 差し戻し：{rejectReason}</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>※ 月次の操作は「提出」タブから</span>
        </div>
      )}
    </div>
  )
}

export default KintaiPage
