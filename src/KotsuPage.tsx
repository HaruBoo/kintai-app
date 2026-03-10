import { useState, useEffect } from 'react'

type KotsuRecord = {
  date: string
  from: string
  to: string
  amount: string
}

const todayISO = () => new Date().toISOString().split('T')[0]

function KotsuPage() {
  const [records, setRecords] = useState<KotsuRecord[]>(() => {
    const saved = localStorage.getItem('kotsu-records')
    return saved ? JSON.parse(saved) : []
  })

  const [dateISO, setDateISO] = useState(todayISO())
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [amountInput, setAmountInput] = useState('')

  useEffect(() => {
    localStorage.setItem('kotsu-records', JSON.stringify(records))
  }, [records])

  const handleAdd = () => {
    if (!fromInput || !toInput || !amountInput) {
      alert('出発駅・到着駅・費用をすべて入力してください')
      return
    }
    const displayDate = new Date(dateISO).toLocaleDateString('ja-JP')
    setRecords([...records, {
      date: displayDate,
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
    const csv = [header, ...rows, footer].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `交通費_${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}.csv`
    link.click()
    URL.revokeObjectURL(url)
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

      <table>
        <thead>
          <tr>
            <th>日付</th><th>出発駅</th><th>到着駅</th><th>費用（円）</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr><td colSpan={4} className="no-record">交通費データがありません</td></tr>
          ) : (
            records.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td><td>{r.from}</td><td>{r.to}</td>
                <td>¥{Number(r.amount).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
        {records.length > 0 && (
          <tfoot>
            <tr className="total-row">
              <td colSpan={3}>合計</td>
              <td>¥{total.toLocaleString()}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default KotsuPage
