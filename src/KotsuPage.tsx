import { useState, useEffect } from 'react'
import type { KotsuRecord } from './types/transport'
import { todayISO, formatDateShort, dateJPtoISO } from './utils/date'
import { downloadCSV } from './utils/csv'
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './utils/storage'

function KotsuPage() {
  const [records, setRecords] = useState<KotsuRecord[]>(() =>
    loadFromStorage<KotsuRecord[]>(STORAGE_KEYS.kotsu, [])
  )

  const [dateISO, setDateISO] = useState(todayISO)
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
  const [editDateIndex, setEditDateIndex] = useState<number | null>(null)
  const [editDateValue, setEditDateValue] = useState('')
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [amountInput, setAmountInput] = useState('')

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.kotsu, records)
  }, [records])

  const handleDateClick = (index: number, currentDate: string) => {
    setEditDateIndex(index)
    setEditDateValue(dateJPtoISO(currentDate))
  }

  const handleDateSave = (index: number) => {
    if (!editDateValue) { setEditDateIndex(null); return }
    const newDate = formatDateShort(new Date(editDateValue))
    setRecords(records.map((r, i) => i === index ? { ...r, date: newDate } : r))
    setEditDateIndex(null)
  }

  const handleDelete = (index: number) => {
    setRecords(records.filter((_, i) => i !== index))
    setDeleteConfirmIndex(null)
  }

  const handleAdd = () => {
    if (!fromInput || !toInput || !amountInput) {
      alert('出発駅・到着駅・費用をすべて入力してください')
      return
    }
    setRecords([...records, {
      date: formatDateShort(new Date(dateISO)),
      from: fromInput,
      to: toInput,
      amount: amountInput,
    }])
    setFromInput('')
    setToInput('')
    setAmountInput('')
  }

  const total = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const handleDownloadCSV = () => {
    const header = ['日付', '出発駅', '到着駅', '費用（円）']
    const rows = records.map(r => [r.date, r.from, r.to, r.amount])
    const footer = ['', '', '合計', String(total)]
    const monthLabel = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
    downloadCSV([header, ...rows, footer], `交通費_${monthLabel}.csv`)
  }

  return (
    <div>
      <h2 className="page-title">交通費申請</h2>

      <div className="kotsu-form">
        <div className="form-row">
          <label>日付</label>
          <input type="date" className="form-input"
            value={dateISO} onChange={e => setDateISO(e.target.value)} />
        </div>
        <div className="form-row">
          <label>出発駅</label>
          <input type="text" className="form-input" placeholder="例：渋谷"
            value={fromInput} onChange={e => setFromInput(e.target.value)} />
        </div>
        <div className="form-row">
          <label>到着駅</label>
          <input type="text" className="form-input" placeholder="例：新宿"
            value={toInput} onChange={e => setToInput(e.target.value)} />
        </div>
        <div className="form-row">
          <label>費用（円）</label>
          <input type="number" className="form-input" placeholder="例：200"
            value={amountInput} onChange={e => setAmountInput(e.target.value)} />
        </div>
        <button className="btn-add" onClick={handleAdd}>追加する</button>
      </div>

      <div className="table-header">
        <h2>申請一覧</h2>
        <button className="btn-download" onClick={handleDownloadCSV}>ダウンロードする</button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>日付</th><th>出発駅</th><th>到着駅</th><th>費用（円）</th><th></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={5} className="no-record">交通費データがありません</td></tr>
            ) : (
              records.map((r, i) => (
                <tr key={i}>
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
                  <td>{r.from}</td><td>{r.to}</td>
                  <td>¥{Number(r.amount).toLocaleString()}</td>
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
          {records.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={4}>合計</td>
                <td>¥{total.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default KotsuPage
