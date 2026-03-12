/**
 * AdminPayslip — 給与明細管理タブ（管理者用）
 *
 * 機能:
 * - 対象社員を選択して給与明細ファイルを添付
 * - 送信先メールアドレスを指定
 * - 備考・コメントを記入
 * - 送信ボタンで明細を配布（将来実装）
 */

import { useState } from 'react'

function AdminPayslip() {
  // 送信先メールアドレス
  const [toEmail,  setToEmail]  = useState('')
  // 対象年月
  const [year,     setYear]     = useState(new Date().getFullYear())
  const [month,    setMonth]    = useState(new Date().getMonth() + 1)
  // 添付ファイル（PDFなど）
  const [file,     setFile]     = useState<File | null>(null)
  // 備考（管理者側のメモ）
  const [note,     setNote]     = useState('')
  // コメント（社員に見せる文章）
  const [comment,  setComment]  = useState('')
  // 送信中フラグ
  const [sending,  setSending]  = useState(false)
  // 完了メッセージ
  const [msg,      setMsg]      = useState<string | null>(null)

  // 送信ボタンの処理（現在はモックのみ）
  const handleSend = async () => {
    if (!toEmail) { setMsg('送信先メールアドレスを入力してください'); return }
    if (!file)    { setMsg('給与明細ファイルを選択してください');     return }

    setSending(true)
    setMsg(null)

    // TODO: Supabase Edge Function または メール送信サービスと連携する
    // 現在はダミー処理
    await new Promise(resolve => setTimeout(resolve, 1000))

    setMsg(`${toEmail} に ${year}年${month}月分の給与明細を送信しました（デモ）`)
    setSending(false)
  }

  return (
    <div className="admin-payslip">
      <h2 className="admin-section-title">給与明細を送る</h2>

      {msg && (
        <p className={msg.includes('失敗') ? 'admin-error' : 'admin-success'}>{msg}</p>
      )}

      <div className="admin-payslip-form">

        {/* 対象年月 */}
        <div className="admin-form-row">
          <label>対象年月</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              className="admin-input"
              style={{ width: '80px' }}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              min={2000}
              max={2100}
            />
            <span>年</span>
            <select
              className="admin-role-select"
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
        </div>

        {/* 送信先メールアドレス */}
        <div className="admin-form-row">
          <label>送信先メールアドレス</label>
          <input
            type="email"
            className="admin-input"
            placeholder="例: haru@example.com"
            value={toEmail}
            onChange={e => setToEmail(e.target.value)}
          />
        </div>

        {/* 給与明細ファイル添付 */}
        <div className="admin-form-row">
          <label>給与明細ファイル</label>
          <input
            type="file"
            accept=".pdf,.xlsx,.csv"
            className="admin-file-input"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
              選択中: {file.name}
            </p>
          )}
        </div>

        {/* 備考（管理者メモ） */}
        <div className="admin-form-row">
          <label>備考（管理者メモ）</label>
          <textarea
            className="admin-textarea"
            placeholder="社員には見えない管理者向けのメモ"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
        </div>

        {/* コメント（社員向け） */}
        <div className="admin-form-row">
          <label>コメント（社員向け）</label>
          <textarea
            className="admin-textarea"
            placeholder="給与明細と一緒に社員に伝えたいこと"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {/* 送信ボタン */}
        <button
          className="admin-send-btn"
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? '送信中...' : '給与明細を送る'}
        </button>

      </div>
    </div>
  )
}

export default AdminPayslip
