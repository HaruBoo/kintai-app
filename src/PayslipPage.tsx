/**
 * PayslipPage — 給与明細ページ（社員用）
 *
 * 機能:
 * - 自分の給与明細一覧を表示する
 * - ダウンロードボタンで PDF を取得できる
 */

import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'

// 給与明細レコードの型
type PayslipRow = {
  id: string
  year: number
  month: number
  file_path: string
  comment: string | null
  created_at: string
}

function PayslipPage() {
  const [payslips,  setPayslips]  = useState<PayslipRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)  // ダウンロード中のID

  // 自分の給与明細一覧を取得する
  useEffect(() => {
    const fetchPayslips = async () => {
      setLoading(true)

      // ログイン中のユーザー ID を取得する
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // 自分の user_id に一致するレコードだけを取得する
      const { data } = await supabase
        .from('payslips')
        .select('id, year, month, file_path, comment, created_at')
        .eq('user_id', user.id)
        .order('year',  { ascending: false })
        .order('month', { ascending: false })
      setPayslips((data ?? []) as PayslipRow[])
      setLoading(false)
    }
    fetchPayslips()
  }, [])

  // ダウンロードボタンを押したときの処理
  const handleDownload = async (payslip: PayslipRow) => {
    setDownloading(payslip.id)

    // Supabase Storage から一時的なダウンロード URL を発行する（60秒間有効）
    const { data, error } = await supabase.storage
      .from('payslips')
      .createSignedUrl(payslip.file_path, 60)

    if (error || !data) {
      alert('ダウンロードに失敗しました')
      setDownloading(null)
      return
    }

    // ブラウザでダウンロードを開始する
    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = `給与明細_${payslip.year}年${payslip.month}月.pdf`
    link.click()

    setDownloading(null)
  }

  if (loading) return <p className="admin-loading">読み込み中...</p>

  return (
    <div className="payslip-page">
      <h2 className="section-title">給与明細</h2>

      {payslips.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
          給与明細はまだありません
        </p>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>年月</th>
                <th>コメント</th>
                <th>発行日</th>
                <th>ダウンロード</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id}>
                  <td>{p.year}年{p.month}月</td>
                  <td>{p.comment || '—'}</td>
                  <td>{new Date(p.created_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    <button
                      className="admin-invite-btn"
                      onClick={() => handleDownload(p)}
                      disabled={downloading === p.id}
                      style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                    >
                      {downloading === p.id ? '準備中...' : 'ダウンロード'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PayslipPage
