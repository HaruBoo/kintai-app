import { useState, useEffect } from 'react'
import type { DayRecord } from './types/attendance'
import type { Profile } from './types/profile'
import { HOURS, MINUTES, toHHMM, getNowH, getNowM, calcTimes } from './utils/time'
import { formatDateLong, formatDateShort, getWeekday, dateJPtoISO, getRowClass } from './utils/date'
import { loadFromStorage, saveToStorage, getKintaiKey } from './utils/storage'
import CsvExport from './components/CsvExport'

type Props = {
  viewYear: number
  viewMonth: number
  profile: Profile
}

function KintaiPage({ viewYear, viewMonth, profile }: Props) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // 表示月のストレージキー
  const storageKey = getKintaiKey(viewYear, viewMonth)

  // 月が切り替わるたびにその月のデータを読み込む
  const [records, setRecords] = useState<DayRecord[]>(() =>
    loadFromStorage<DayRecord[]>(storageKey, [])
  )

  const [clockInH, setClockInH] = useState(getNowH)
  const [clockInM, setClockInM] = useState(getNowM)
  const [clockOutH, setClockOutH] = useState(getNowH)
  const [clockOutM, setClockOutM] = useState(getNowM)
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
  const [editDateIndex, setEditDateIndex] = useState<number | null>(null)
  const [editDateValue, setEditDateValue] = useState('')

  // 1秒ごとに時刻を更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // records が変わるたびにその月のキーで保存
  useEffect(() => {
    saveToStorage(storageKey, records)
  }, [records, storageKey])

  const dateStr      = formatDateLong(currentTime)
  const todayKey     = formatDateShort(currentTime)
  const todayWeekday = getWeekday(currentTime)

  // 今月を表示しているかどうか
  const isCurrentMonth =
    viewYear === currentTime.getFullYear() && viewMonth === currentTime.getMonth() + 1

  // 勤務日数（出勤打刻がある日だけカウント）
  const workingDays = records.filter(r => r.clockIn !== '-').length

  const handleDateClick = (index: number, currentDate: string) => {
    setEditDateIndex(index)
    setEditDateValue(dateJPtoISO(currentDate))
  }

  const handleDateSave = (index: number) => {
    if (!editDateValue) { setEditDateIndex(null); return }
    const d = new Date(editDateValue)
    setRecords(records.map((r, i) =>
      i === index ? { ...r, date: formatDateShort(d), weekday: getWeekday(d) } : r
    ))
    setEditDateIndex(null)
  }

  const handleDelete = (index: number) => {
    setRecords(records.filter((_, i) => i !== index))
    setDeleteConfirmIndex(null)
  }

  const handleClockIn = () => {
    if (!isCurrentMonth) { alert('過去・未来の月には打刻できません'); return }
    const exists = records.find(r => r.date === todayKey)
    if (exists) { alert('本日はすでに出勤打刻済みです'); return }
    setRecords([...records, {
      date: todayKey, weekday: todayWeekday,
      clockIn: toHHMM(clockInH, clockInM),
      clockOut: '-', breakTime: '-', workTime: '-', note: '',
    }])
  }

  const handleClockOut = () => {
    if (!isCurrentMonth) { alert('過去・未来の月には打刻できません'); return }
    const todayRecord = records.find(r => r.date === todayKey)
    if (!todayRecord) { alert('出勤打刻がまだです'); return }
    if (todayRecord.clockOut !== '-') { alert('本日はすでに退勤打刻済みです'); return }
    const clockOut = toHHMM(clockOutH, clockOutM)
    const { breakTime, workTime } = calcTimes(todayRecord.clockIn, clockOut)
    setRecords(records.map(r =>
      r.date === todayKey ? { ...r, clockOut, breakTime, workTime } : r
    ))
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
              [r.date, r.weekday, r.clockIn, r.clockOut, r.breakTime, r.workTime, r.note]
            )}
            filename={`勤怠_${viewYear}年${viewMonth}月.csv`}
            profile={profile}
            summary={`勤務日数: ${workingDays}日`}
          />
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>日付</th><th>曜日</th><th>出勤</th><th>退勤</th><th>休憩</th><th>実働</th><th>備考</th><th></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={8} className="no-record">データがありません</td></tr>
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
                  <td>{r.weekday}</td><td>{r.clockIn}</td>
                  <td>{r.clockOut}</td><td>{r.breakTime}</td><td>{r.workTime}</td><td>{r.note}</td>
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
      </div>
    </div>
  )
}

export default KintaiPage
