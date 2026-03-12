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

function KintaiPage({ viewYear, viewMonth, profile }: Props) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // 勤怠レコード一覧
  const [records, setRecords] = useState<DayRecord[]>([])

  // データ読み込み中フラグ
  const [loading, setLoading] = useState(true)

  const [clockInH,  setClockInH]  = useState(getNowH)
  const [clockInM,  setClockInM]  = useState(getNowM)
  const [clockOutH, setClockOutH] = useState(getNowH)
  const [clockOutM, setClockOutM] = useState(getNowM)
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
  const [editDateIndex,  setEditDateIndex]  = useState<number | null>(null)
  const [editDateValue,  setEditDateValue]  = useState('')
  // 備考編集
  const [editNoteIndex,  setEditNoteIndex]  = useState<number | null>(null)
  const [editNoteValue,  setEditNoteValue]  = useState('')
  // 休憩時間編集
  const [editBreakIndex, setEditBreakIndex] = useState<number | null>(null)
  const [editBreakValue, setEditBreakValue] = useState('')

  // 1秒ごとに時刻を更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Supabase からその月のデータを取得する
  const fetchRecords = useCallback(async () => {
    setLoading(true)

    // ログイン中ユーザーの ID を取得
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // 表示月に一致する日付だけ取得（例: "2026/3/" で始まるもの）
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
      // DB のスネークケース → DayRecord のキャメルケースに変換
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

  // 月が切り替わるたびにデータを取得
  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const dateStr      = formatDateLong(currentTime)
  const todayKey     = formatDateShort(currentTime)
  const todayWeekday = getWeekday(currentTime)

  // 今月を表示しているかどうか
  const isCurrentMonth =
    viewYear === currentTime.getFullYear() && viewMonth === currentTime.getMonth() + 1

  // 勤務日数（出勤打刻がある日だけカウント）
  const workingDays = records.filter(r => r.clockIn !== '-').length

  // 日付をクリックして編集モードにする
  const handleDateClick = (index: number, currentDate: string) => {
    setEditDateIndex(index)
    setEditDateValue(dateJPtoISO(currentDate))
  }

  // 日付の編集を確定する
  const handleDateSave = async (index: number) => {
    if (!editDateValue) { setEditDateIndex(null); return }

    const d       = new Date(editDateValue)
    const newDate = formatDateShort(d)
    const newWeek = getWeekday(d)
    const oldDate = records[index].date

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // DB の date を更新する
    const { error } = await supabase
      .from('attendance')
      .update({ date: newDate, weekday: newWeek })
      .eq('user_id', user.id)
      .eq('date', oldDate)

    if (error) {
      alert('日付の更新に失敗しました: ' + error.message)
    } else {
      setRecords(records.map((r, i) =>
        i === index ? { ...r, date: newDate, weekday: newWeek } : r
      ))
    }
    setEditDateIndex(null)
  }

  // 行を削除する
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

  // 出勤打刻
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

    // DB に挿入する
    const { error } = await supabase
      .from('attendance')
      .insert({
        user_id:  user.id,
        date:     newRecord.date,
        weekday:  newRecord.weekday,
        clock_in: newRecord.clockIn,
        clock_out: '-',
        break_time: '-',
        work_time: '-',
        note: '',
      })

    if (error) {
      alert('出勤打刻に失敗しました: ' + error.message)
    } else {
      setRecords([...records, newRecord])
    }
  }

  // 備考を保存する
  const handleNoteSave = async (index: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('attendance')
      .update({ note: editNoteValue })
      .eq('user_id', user.id)
      .eq('date', records[index].date)

    if (error) {
      alert('備考の保存に失敗しました: ' + error.message)
    } else {
      setRecords(records.map((r, i) => i === index ? { ...r, note: editNoteValue } : r))
    }
    setEditNoteIndex(null)
  }

  // 休憩時間を保存して実働時間を再計算する
  const handleBreakSave = async (index: number) => {
    if (!editBreakValue) { setEditBreakIndex(null); return }

    const record   = records[index]
    // 出勤・退勤が揃っている場合のみ実働を再計算する
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

    if (error) {
      alert('休憩時間の保存に失敗しました: ' + error.message)
    } else {
      setRecords(records.map((r, i) =>
        i === index ? { ...r, breakTime: editBreakValue, workTime } : r
      ))
    }
    setEditBreakIndex(null)
  }

  // 勤務区分を保存する
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

  // 退勤打刻
  const handleClockOut = async () => {
    if (!isCurrentMonth) { alert('過去・未来の月には打刻できません'); return }
    const todayRecord = records.find(r => r.date === todayKey)
    if (!todayRecord) { alert('出勤打刻がまだです'); return }
    if (todayRecord.clockOut !== '-') { alert('本日はすでに退勤打刻済みです'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const clockOut = toHHMM(clockOutH, clockOutM)

    // 退勤時刻が出勤時刻より早い場合はエラーを出す
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    if (toMin(clockOut) <= toMin(todayRecord.clockIn)) {
      alert(`退勤時刻（${clockOut}）が出勤時刻（${todayRecord.clockIn}）より早いか同じです。\n正しい時刻を選んでください。`)
      return
    }
    const { breakTime, workTime } = calcTimes(todayRecord.clockIn, clockOut)

    // DB を更新する
    const { error } = await supabase
      .from('attendance')
      .update({ clock_out: clockOut, break_time: breakTime, work_time: workTime })
      .eq('user_id', user.id)
      .eq('date', todayKey)

    if (error) {
      alert('退勤打刻に失敗しました: ' + error.message)
    } else {
      setRecords(records.map(r =>
        r.date === todayKey ? { ...r, clockOut, breakTime, workTime } : r
      ))
    }
  }

  return (
    <div>
      {/* 日付・ロゴ */}
      <div className="clock-section">
        <p className="date">{dateStr}</p>
        <p className="swell">Swell</p>
      </div>

      {/* 打刻ボタン（今月のみ表示） */}
      {isCurrentMonth && (
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
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
            読み込み中...
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>日付</th><th>曜日</th><th>勤務区分</th><th>出勤</th><th>退勤</th><th>休憩</th><th>実働</th><th>備考</th><th></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={9} className="no-record">データがありません</td></tr>
              ) : (
                records.map((r, i) => (
                  <tr key={i} className={getRowClass(r.date, r.weekday)}>
                    <td>
                      {editDateIndex === i ? (

                        <span className="date-edit">
                          <input type="date" className="date-edit-input"
                            value={editDateValue} onChange={e => setEditDateValue(e.target.value)} />
                          <button className="btn-delete-yes" onClick={() => handleDateSave(i)}>確定</button>
                          <button className="btn-delete-no" onClick={() => setEditDateIndex(null)}>取消</button>
                        </span>
                      ) : (
                        <span className="editable-cell" onClick={() => handleDateClick(i, r.date)} title="クリックで編集">
                          {r.date} ✏️
                        </span>
                      )}
                    </td>
                    <td>{r.weekday}</td>

                    {/* 勤務区分（プルダウンで即時保存） */}
                    <td>
                      <select
                        className="work-type-select"
                        value={r.workType}
                        onChange={e => handleWorkTypeSave(i, e.target.value)}
                      >
                        <option value="">—</option>
                        {WORK_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>

                    <td>{r.clockIn}</td>
                    <td>{r.clockOut}</td>

                    {/* 休憩時間（クリックで編集） */}
                    <td>
                      {editBreakIndex === i ? (
                        <span className="date-edit">
                          <input
                            type="text"
                            className="date-edit-input"
                            style={{ width: '70px' }}
                            value={editBreakValue}
                            placeholder="例: 1:00"
                            onChange={e => setEditBreakValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleBreakSave(i)}
                          />
                          <button className="btn-delete-yes" onClick={() => handleBreakSave(i)}>確定</button>
                          <button className="btn-delete-no" onClick={() => setEditBreakIndex(null)}>取消</button>
                        </span>
                      ) : (
                        <span
                          className="editable-cell"
                          onClick={() => { setEditBreakIndex(i); setEditBreakValue(r.breakTime === '-' ? '' : r.breakTime) }}
                          title="クリックで編集"
                        >
                          {r.breakTime} ✏️
                        </span>
                      )}
                    </td>

                    <td>{r.workTime}</td>

                    {/* 備考（クリックで編集） */}
                    <td>
                      {editNoteIndex === i ? (
                        <span className="date-edit">
                          <input
                            type="text"
                            className="date-edit-input"
                            style={{ width: '120px' }}
                            value={editNoteValue}
                            placeholder="備考を入力"
                            onChange={e => setEditNoteValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleNoteSave(i)}
                          />
                          <button className="btn-delete-yes" onClick={() => handleNoteSave(i)}>確定</button>
                          <button className="btn-delete-no" onClick={() => setEditNoteIndex(null)}>取消</button>
                        </span>
                      ) : (
                        <span
                          className="editable-cell"
                          onClick={() => { setEditNoteIndex(i); setEditNoteValue(r.note) }}
                          title="クリックで編集"
                        >
                          {r.note || '—'} ✏️
                        </span>
                      )}
                    </td>
                    <td>
                      {deleteConfirmIndex === i ? (
                        <span className="delete-confirm">
                          <button className="btn-delete-yes" onClick={() => handleDelete(i)}>はい</button>
                          <button className="btn-delete-no" onClick={() => setDeleteConfirmIndex(null)}>キャンセル</button>
                        </span>
                      ) : (
                        <button className="btn-delete" onClick={() => setDeleteConfirmIndex(i)}>削除</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default KintaiPage
