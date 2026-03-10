import { useState, useEffect } from 'react'
import * as HolidayJp from '@holiday-jp/holiday_jp'

type DayRecord = {
  date: string
  weekday: string
  clockIn: string
  clockOut: string
  breakTime: string
  workTime: string
  note: string
}

// 時（0〜23）の選択肢を作る
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
// 分（00, 05, 10, ...55）の選択肢を作る
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// 時と分を "09:30" の形式に結合する
const toHHMM = (h: string, m: string) => `${h}:${m}`

function KintaiPage() {
  const [currentTime, setCurrentTime] = useState(new Date())

  const [records, setRecords] = useState<DayRecord[]>(() => {
    const saved = localStorage.getItem('kintai-records')
    return saved ? JSON.parse(saved) : []
  })

  // 出勤・退勤の時・分を別々に管理する
  const nowH = String(new Date().getHours()).padStart(2, '0')
  // 現在の分を5分単位に丸める（例: 23分 → 20分）
  const nowM = String(Math.floor(new Date().getMinutes() / 5) * 5).padStart(2, '0')

  const [clockInH, setClockInH] = useState(nowH)
  const [clockInM, setClockInM] = useState(nowM)
  const [clockOutH, setClockOutH] = useState(nowH)
  const [clockOutM, setClockOutM] = useState(nowM)

  // 削除確認中の行番号（nullなら確認中なし）
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)

  // 日付編集中の行番号と入力値
  const [editDateIndex, setEditDateIndex] = useState<number | null>(null)
  const [editDateValue, setEditDateValue] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem('kintai-records', JSON.stringify(records))
  }, [records])

  const dateStr = currentTime.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
  const todayKey = currentTime.toLocaleDateString('ja-JP')
  const todayWeekday = currentTime.toLocaleDateString('ja-JP', { weekday: 'short' })

  const calcTimes = (clockIn: string, clockOut: string) => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const raw = toMin(clockOut) - toMin(clockIn)
    if (raw <= 0) return { breakTime: '0:00', workTime: '-' }
    const brk = raw > 360 ? 60 : 0
    const work = raw - brk
    const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
    return { breakTime: fmt(brk), workTime: fmt(work) }
  }

  const getRowClass = (ds: string, weekday: string) => {
    if (HolidayJp.isHoliday(new Date(ds))) return 'row-holiday'
    if (weekday === '土') return 'row-saturday'
    if (weekday === '日') return 'row-sunday'
    return ''
  }

  // 日付セルをクリックしたとき：編集モードに入る
  const handleDateClick = (index: number, currentDate: string) => {
    // 日本語の日付（例: 2026/3/10）をISO形式（2026-03-10）に変換
    const d = new Date(currentDate)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setEditDateIndex(index)
    setEditDateValue(iso)
  }

  // 日付の変更を確定する
  const handleDateSave = (index: number) => {
    if (!editDateValue) { setEditDateIndex(null); return }
    const d = new Date(editDateValue)
    const newDate = d.toLocaleDateString('ja-JP')
    const newWeekday = d.toLocaleDateString('ja-JP', { weekday: 'short' })
    setRecords(records.map((r, i) =>
      i === index ? { ...r, date: newDate, weekday: newWeekday } : r
    ))
    setEditDateIndex(null)
  }

  // 削除を実行する
  const handleDelete = (index: number) => {
    setRecords(records.filter((_, i) => i !== index))
    setDeleteConfirmIndex(null)
  }

  const handleClockIn = () => {
    const exists = records.find(r => r.date === todayKey)
    if (exists) { alert('本日はすでに出勤打刻済みです'); return }
    setRecords([...records, {
      date: todayKey, weekday: todayWeekday,
      clockIn: toHHMM(clockInH, clockInM),
      clockOut: '-', breakTime: '-', workTime: '-', note: '',
    }])
  }

  const handleClockOut = () => {
    const todayRecord = records.find(r => r.date === todayKey)
    if (!todayRecord) { alert('出勤打刻がまだです'); return }
    if (todayRecord.clockOut !== '-') { alert('本日はすでに退勤打刻済みです'); return }
    const clockOut = toHHMM(clockOutH, clockOutM)
    const { breakTime, workTime } = calcTimes(todayRecord.clockIn, clockOut)
    setRecords(records.map(r =>
      r.date === todayKey ? { ...r, clockOut, breakTime, workTime } : r
    ))
  }

  const handleDownloadCSV = () => {
    const header = ['日付', '曜日', '出勤', '退勤', '休憩', '実働', '備考']
    const rows = records.map(r => [r.date, r.weekday, r.clockIn, r.clockOut, r.breakTime, r.workTime, r.note])
    const csv = [header, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `勤怠_${currentTime.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="clock-section">
        <p className="date">{dateStr}</p>
        <p className="swell">Swell</p>
      </div>

      <div className="button-group">

        {/* 出勤エリア */}
        <div className="punch-area">
          {/* 時・分をプルダウンで選ぶ */}
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

        {/* 退勤エリア */}
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

      <div className="table-header">
        <h2>今月の勤務実績</h2>
        <button className="btn-download" onClick={handleDownloadCSV}>ダウンロードする</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>日付</th><th>曜日</th><th>出勤</th><th>退勤</th><th>休憩</th><th>実働</th><th>備考</th><th></th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr><td colSpan={8} className="no-record">打刻データがありません</td></tr>
          ) : (
            records.map((r, i) => (
              <tr key={i} className={getRowClass(r.date, r.weekday)}>
                {/* 日付セル：クリックで編集モードに切り替わる */}
                <td>
                  {editDateIndex === i ? (
                    <span className="date-edit">
                      <input type="date" className="date-edit-input"
                        value={editDateValue}
                        onChange={e => setEditDateValue(e.target.value)}
                      />
                      <button className="btn-delete-yes" onClick={() => handleDateSave(i)}>確定</button>
                      <button className="btn-delete-no" onClick={() => setEditDateIndex(null)}>取消</button>
                    </span>
                  ) : (
                    <span className="editable-cell" onClick={() => handleDateClick(i, r.date)} title="クリックで編集">
                      {r.date} ✏️
                    </span>
                  )}
                </td>
                <td>{r.weekday}</td><td>{r.clockIn}</td>
                <td>{r.clockOut}</td><td>{r.breakTime}</td><td>{r.workTime}</td><td>{r.note}</td>
                <td>
                  {deleteConfirmIndex === i ? (
                    // 確認中：はい/キャンセルを表示
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
    </div>
  )
}

export default KintaiPage
