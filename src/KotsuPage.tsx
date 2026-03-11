import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import type { KotsuRecord } from './types/transport'
import { todayISO, formatDateShort, dateJPtoISO } from './utils/date'
import { downloadCSV } from './utils/csv'
import { loadFromStorage, saveToStorage, getKotsuKey } from './utils/storage'

type Props = {
  viewYear: number
  viewMonth: number
}

function KotsuPage({ viewYear, viewMonth }: Props) {
  const storageKey = getKotsuKey(viewYear, viewMonth)

  // 月ごとの交通費データ
  const [records, setRecords] = useState<KotsuRecord[]>(() =>
    loadFromStorage<KotsuRecord[]>(storageKey, [])
  )

  // フォーム入力値
  const [dateISO, setDateISO] = useState(todayISO)
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [amountInput, setAmountInput] = useState('')

  // テーブルの編集・削除状態
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
  const [editDateIndex, setEditDateIndex] = useState<number | null>(null)
  const [editDateValue, setEditDateValue] = useState('')

  // 領収書画像（フォーム入力中のもの）
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 領収書に記載された購入日・購入金額
  // useState('') → 最初は空欄。入力するたびに値が更新される
  const [receiptDate,   setReceiptDate]   = useState('')
  const [receiptAmount, setReceiptAmount] = useState('')

  // 領収書の拡大表示（url: 画像データ、filename: 保存時のファイル名）
  const [viewReceipt, setViewReceipt] = useState<{ url: string; filename: string } | null>(null)

  // data URLから拡張子を取り出す（例: "data:image/jpeg;base64,..." → "jpg"）
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

  // recordsが変わるたびに保存
  useEffect(() => {
    saveToStorage(storageKey, records)
  }, [records, storageKey])

  // 画像ファイルを選択したときの処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // FileReaderでbase64のdata URLに変換して保存できる形にする
    const reader = new FileReader()
    reader.onload = () => setReceiptDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  // フォームの入力内容をレコードに追加する
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
      receiptImage:  receiptDataUrl   ?? undefined,
      // 入力があれば保存、空欄なら undefined（保存しない）
      // || undefined → 空文字('')はfalseなのでundefinedになる
      receiptDate:   receiptDate   || undefined,
      receiptAmount: receiptAmount || undefined,
    }])

    // フォームをリセット（すべての入力欄を空に戻す）
    setFromInput('')
    setToInput('')
    setAmountInput('')
    setReceiptDataUrl(null)
    setReceiptDate('')
    setReceiptAmount('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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

  const total = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const handleDownloadCSV = () => {
    const monthLabel = `${viewYear}年${viewMonth}月`
    const header = ['日付', '出発駅', '到着駅', '費用（円）', '領収書購入日', '領収書金額（円）']
    const rows = records.map(r => [
      r.date, r.from, r.to, r.amount,
      r.receiptDate ?? '',    // 未入力なら空欄
      r.receiptAmount ?? '',  // 未入力なら空欄
    ])
    const footer = ['', '', '合計', String(total), '', '']
    downloadCSV([header, ...rows, footer], `交通費_${monthLabel}.csv`)
  }

  // CSVと領収書画像をまとめてZIPでダウンロードする
  const handleDownloadZip = async () => {
    const monthLabel = `${viewYear}年${viewMonth}月`
    const zip = new JSZip()

    // ZIPの中にCSVを追加（BOM付きでExcel対応）
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

    // ZIPの中に領収書画像フォルダを追加
    const folder = zip.folder('領収書')
    records.forEach(r => {
      if (!r.receiptImage) return

      // data URLを「ヘッダー部分」と「base64データ」に分割
      const [header, base64] = r.receiptImage.split(',')
      const mimeType = header.match(/data:(.*);base64/)?.[1] ?? 'image/png'
      const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]

      // ファイル名の「/」を「-」に置換してフォルダ構造の崩れを防ぐ
      const filename = `領収書_${r.date}_${r.from}_${r.to}.${ext}`.replace(/\//g, '-')
      folder?.file(filename, base64, { base64: true })
    })

    // ZIPを生成してダウンロード
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `交通費_${monthLabel}.zip`
    a.click()
    URL.revokeObjectURL(url)  // メモリ解放
  }

  // 領収書付きのレコードが1件以上あるか
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
            {/* 実際のfile inputは非表示にして、labelをボタンとして使う */}
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

            {/* 選択した画像のサムネイル（クリックで拡大） */}
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

        {/* 領収書の購入日・購入金額（画像と一緒に管理する情報） */}
        <div className="receipt-meta-area">
          <div className="form-row">
            <label>購入日</label>
            {/*
              type="date" → カレンダーで日付を選択できる入力欄
              value={receiptDate} → Reactが値を管理（制御コンポーネント）
              onChange → 入力が変わるたびに setReceiptDate で状態を更新
            */}
            <input
              type="date"
              className="form-input"
              value={receiptDate}
              onChange={e => setReceiptDate(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>購入金額（円）</label>
            {/*
              type="number" → 数字のみ入力できる欄（文字は入力不可）
            */}
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
          {/* 領収書がある場合のみZIPボタンを表示 */}
          {hasReceipts && (
            <button className="btn-download btn-download-zip" onClick={handleDownloadZip}>
              📦 ZIP（CSV＋画像）
            </button>
          )}
          <button className="btn-download" onClick={handleDownloadCSV}>
            CSVのみ
          </button>
        </div>
      </div>

      <div className="table-scroll">
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
                  <td>{r.from}</td>
                  <td>{r.to}</td>
                  <td>¥{Number(r.amount).toLocaleString()}</td>
                  <td>
                    {/*
                      領収書セル：画像アイコン＋購入日・金額をまとめて表示
                      r.receiptImage が存在する場合だけ📎を表示
                      r.receiptDate / r.receiptAmount は入力があれば表示
                    */}
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
                      {/* 購入日・購入金額が入力されていれば小さく表示 */}
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
      </div>

      {/* 領収書の拡大表示モーダル（背景クリックで閉じる） */}
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
