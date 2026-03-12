import { useState, useEffect, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import type { KotsuRecord } from './types/transport'
import { todayISO, formatDateShort, dateJPtoISO } from './utils/date'
import { downloadCSV } from './utils/csv'
import { supabase } from './services/supabase'

type Props = {
  viewYear: number
  viewMonth: number
}

function KotsuPage({ viewYear, viewMonth }: Props) {
  // 交通費レコード一覧
  const [records, setRecords] = useState<KotsuRecord[]>([])

  // データ読み込み中フラグ
  const [loading, setLoading] = useState(true)

  // フォーム入力値
  const [dateISO,      setDateISO]      = useState(todayISO)
  const [fromInput,    setFromInput]    = useState('')
  const [toInput,      setToInput]      = useState('')
  const [amountInput,  setAmountInput]  = useState('')

  // テーブルの編集・削除状態
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
  const [editDateIndex,      setEditDateIndex]      = useState<number | null>(null)
  const [editDateValue,      setEditDateValue]      = useState('')

  // 領収書画像（フォーム入力中のもの）
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 領収書に記載された購入日・購入金額
  const [receiptDate,   setReceiptDate]   = useState('')
  const [receiptAmount, setReceiptAmount] = useState('')

  // 領収書の拡大表示
  const [viewReceipt, setViewReceipt] = useState<{ url: string; filename: string } | null>(null)

  // data URL から拡張子を取り出す
  const getExtension = (dataUrl: string): string => {
    const type = dataUrl.match(/data:image\/(\w+);base64/)?.[1] ?? 'png'
    return type === 'jpeg' ? 'jpg' : type
  }

  // 領収書画像をファイルとしてダウンロードする
  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  // Supabase からその月のデータを取得する
  const fetchRecords = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // 表示月に一致する日付だけ取得（例: "2026/3/" で始まるもの）
    const prefix = `${viewYear}/${viewMonth}/`

    const { data, error } = await supabase
      .from('transport')
      .select('*')
      .eq('user_id', user.id)
      .like('date', `${prefix}%`)
      .order('created_at')

    if (error) {
      console.error('交通費データの取得に失敗しました', error)
    } else {
      // DB のスネークケース → KotsuRecord のキャメルケースに変換
      setRecords((data ?? []).map(row => ({
        id:            row.id,
        date:          row.date,
        from:          row.from_station ?? '',
        to:            row.to_station   ?? '',
        amount:        row.amount       ?? '',
        receiptImage:  row.receipt_image  ?? undefined,
        receiptDate:   row.receipt_date   ?? undefined,
        receiptAmount: row.receipt_amount ?? undefined,
      })))
    }

    setLoading(false)
  }, [viewYear, viewMonth])

  // 月が切り替わるたびにデータを取得
  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // 画像ファイルを選択したときの処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setReceiptDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  // フォームの入力内容を Supabase に追加する
  const handleAdd = async () => {
    if (!fromInput || !toInput || !amountInput) {
      alert('出発駅・到着駅・費用をすべて入力してください')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newDate = formatDateShort(new Date(dateISO))

    // DB に挿入する
    const { data, error } = await supabase
      .from('transport')
      .insert({
        user_id:        user.id,
        date:           newDate,
        from_station:   fromInput,
        to_station:     toInput,
        amount:         amountInput,
        receipt_image:  receiptDataUrl  ?? null,
        receipt_date:   receiptDate     || null,
        receipt_amount: receiptAmount   || null,
      })
      .select()
      .single()

    if (error) {
      alert('追加に失敗しました: ' + error.message)
      return
    }

    // 画面の一覧にも追加する
    setRecords([...records, {
      id:            data.id,
      date:          newDate,
      from:          fromInput,
      to:            toInput,
      amount:        amountInput,
      receiptImage:  receiptDataUrl   ?? undefined,
      receiptDate:   receiptDate      || undefined,
      receiptAmount: receiptAmount    || undefined,
    }])

    // フォームをリセット
    setFromInput('')
    setToInput('')
    setAmountInput('')
    setReceiptDataUrl(null)
    setReceiptDate('')
    setReceiptAmount('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 日付の編集を開始する
  const handleDateClick = (index: number, currentDate: string) => {
    setEditDateIndex(index)
    setEditDateValue(dateJPtoISO(currentDate))
  }

  // 日付の編集を確定する
  const handleDateSave = async (index: number) => {
    if (!editDateValue) { setEditDateIndex(null); return }

    const newDate = formatDateShort(new Date(editDateValue))
    const record  = records[index]

    const { error } = await supabase
      .from('transport')
      .update({ date: newDate })
      .eq('id', record.id)

    if (error) {
      alert('日付の更新に失敗しました: ' + error.message)
    } else {
      setRecords(records.map((r, i) => i === index ? { ...r, date: newDate } : r))
    }
    setEditDateIndex(null)
  }

  // 行を削除する
  const handleDelete = async (index: number) => {
    const record = records[index]

    const { error } = await supabase
      .from('transport')
      .delete()
      .eq('id', record.id)

    if (error) {
      alert('削除に失敗しました: ' + error.message)
    } else {
      setRecords(records.filter((_, i) => i !== index))
    }
    setDeleteConfirmIndex(null)
  }

  const total = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const handleDownloadCSV = () => {
    const monthLabel = `${viewYear}年${viewMonth}月`
    const header = ['日付', '出発駅', '到着駅', '費用（円）', '領収書購入日', '領収書金額（円）']
    const rows = records.map(r => [
      r.date, r.from, r.to, r.amount,
      r.receiptDate ?? '',
      r.receiptAmount ?? '',
    ])
    const footer = ['', '', '合計', String(total), '', '']
    downloadCSV([header, ...rows, footer], `交通費_${monthLabel}.csv`)
  }

  // CSV と領収書画像をまとめて ZIP でダウンロードする
  const handleDownloadZip = async () => {
    const monthLabel = `${viewYear}年${viewMonth}月`
    const zip = new JSZip()

    const header = ['日付', '出発駅', '到着駅', '費用（円）', '領収書購入日', '領収書金額（円）', '領収書画像']
    const rows = records.map(r => [
      r.date, r.from, r.to, r.amount,
      r.receiptDate ?? '', r.receiptAmount ?? '',
      r.receiptImage ? 'あり' : '',
    ])
    const footer = ['', '', '合計', String(total), '', '', '']
    const csvContent = '\uFEFF' + [header, ...rows, footer]
      .map(row => row.join(','))
      .join('\n')
    zip.file(`交通費_${monthLabel}.csv`, csvContent)

    const folder = zip.folder('領収書')
    records.forEach(r => {
      if (!r.receiptImage) return
      const [head, base64] = r.receiptImage.split(',')
      const mimeType = head.match(/data:(.*);base64/)?.[1] ?? 'image/png'
      const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]
      const filename = `領収書_${r.date}_${r.from}_${r.to}.${ext}`.replace(/\//g, '-')
      folder?.file(filename, base64, { base64: true })
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `交通費_${monthLabel}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasReceipts = records.some(r => r.receiptImage)

  return (
    <div>
      <h2 className="page-title">交通費申請</h2>

      {/* 入力フォーム */}
      <div className="kotsu-form">

        {/* 領収書アップロードエリア */}
        <div className="form-row">
          <label>領収書</label>
          <div className="receipt-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="receipt-file-input"
              id="receiptFile"
              onChange={handleFileChange}
            />
            <label htmlFor="receiptFile" className="receipt-file-label">
              📎 画像を選択
            </label>
            {receiptDataUrl && (
              <>
                <img
                  src={receiptDataUrl}
                  className="receipt-preview"
                  alt="領収書プレビュー"
                  onClick={() => setViewReceipt({
                    url: receiptDataUrl,
                    filename: `領収書.${getExtension(receiptDataUrl)}`,
                  })}
                  title="クリックで拡大"
                />
                <button
                  className="btn-receipt-clear"
                  onClick={() => {
                    setReceiptDataUrl(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  title="画像を削除"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {/* 領収書の購入日・購入金額 */}
        <div className="receipt-meta-area">
          <div className="form-row">
            <label>購入日</label>
            <input
              type="date"
              className="form-input"
              value={receiptDate}
              onChange={e => setReceiptDate(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>購入金額（円）</label>
            <input
              type="number"
              className="form-input"
              placeholder="例：500"
              value={receiptAmount}
              onChange={e => setReceiptAmount(e.target.value)}
            />
          </div>
        </div>

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

      {/* 申請一覧テーブル */}
      <div className="table-header">
        <h2>申請一覧</h2>
        <div className="download-buttons">
          {hasReceipts && (
            <button className="btn-download btn-download-zip" onClick={handleDownloadZip}>
              📦 ZIP（CSV＋画像）
            </button>
          )}
          <button className="btn-download" onClick={handleDownloadCSV}>
            表だけダウンロード
          </button>
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
                <th>日付</th><th>出発駅</th><th>到着駅</th><th>費用（円）</th><th>領収書</th><th></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} className="no-record">データがありません</td></tr>
              ) : (
                records.map((r, i) => (
                  <tr key={r.id ?? i}>
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
                    <td>{r.from}</td>
                    <td>{r.to}</td>
                    <td>¥{Number(r.amount).toLocaleString()}</td>
                    <td>
                      <div className="receipt-cell">
                        {r.receiptImage ? (
                          <button
                            className="btn-receipt-view"
                            onClick={() => setViewReceipt({
                              url: r.receiptImage!,
                              filename: `領収書_${r.date}_${r.from}_${r.to}.${getExtension(r.receiptImage!)}`,
                            })}
                            title="領収書を表示"
                          >
                            📎
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        {(r.receiptDate || r.receiptAmount) && (
                          <div className="receipt-meta">
                            {r.receiptDate   && <span>{r.receiptDate}</span>}
                            {r.receiptAmount && <span>¥{Number(r.receiptAmount).toLocaleString()}</span>}
                          </div>
                        )}
                      </div>
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
        )}
      </div>

      {/* 領収書の拡大表示モーダル */}
      {viewReceipt && (
        <div className="receipt-modal" onClick={() => setViewReceipt(null)}>
          <div className="receipt-modal-inner" onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-toolbar">
              <button
                className="btn-download receipt-modal-download"
                onClick={() => downloadImage(viewReceipt.url, viewReceipt.filename)}
              >
                ダウンロード
              </button>
              <button className="receipt-modal-close" onClick={() => setViewReceipt(null)}>
                ✕ 閉じる
              </button>
            </div>
            <img src={viewReceipt.url} alt="領収書" className="receipt-modal-img" />
          </div>
        </div>
      )}
    </div>
  )
}

export default KotsuPage
