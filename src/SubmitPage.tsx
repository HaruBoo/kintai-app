/**
 * SubmitPage — 勤怠・交通費 一括提出タブ（社員用）
 *
 * 機能:
 * - 当月の勤務日数・交通費合計を表示
 * - 一括提出ボタン（attendance_submissions に upsert）
 * - 提出取り消しボタン
 * - 差し戻し理由の表示
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './services/supabase'

type Props = {
  viewYear: number
  viewMonth: number
}

// 提出状態の型
type SubmissionStatus = 'none' | 'submitted' | 'leader_approved' | 'approved' | 'rejected'

function SubmitPage({ viewYear, viewMonth }: Props) {
  // 提出状態
  const [status,       setStatus]       = useState<SubmissionStatus>('none')
  const [rejectReason, setRejectReason] = useState<string>('')
  const [submitting,   setSubmitting]   = useState(false)

  // サマリー情報
  const [workingDays,    setWorkingDays]    = useState<number>(0)
  const [transportTotal, setTransportTotal] = useState<number>(0)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // 提出状態を取得する
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
    setStatus((data?.status ?? 'none') as SubmissionStatus)
    setRejectReason(data?.reject_reason ?? '')
  }, [viewYear, viewMonth])

  // 勤怠・交通費のサマリーを取得する
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingSummary(false); return }

    const prefix = `${viewYear}/${viewMonth}/`

    // 勤務日数（clock_in が入っている行を数える）
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('clock_in')
      .eq('user_id', user.id)
      .like('date', `${prefix}%`)
    const days = (attendanceData ?? []).filter(r => r.clock_in).length
    setWorkingDays(days)

    // 交通費合計
    const { data: transportData } = await supabase
      .from('transport')
      .select('amount')
      .eq('user_id', user.id)
      .like('date', `${prefix}%`)
    const total = (transportData ?? []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    setTransportTotal(total)

    setLoadingSummary(false)
  }, [viewYear, viewMonth])

  useEffect(() => {
    fetchSubmission()
    fetchSummary()
  }, [fetchSubmission, fetchSummary])

  // 提出する
  const handleSubmit = async () => {
    if (!confirm(`${viewYear}年${viewMonth}月の勤怠・交通費を提出しますか？\n提出後は編集できなくなります。`)) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }
    await supabase
      .from('attendance_submissions')
      .upsert(
        { user_id: user.id, year: viewYear, month: viewMonth, status: 'submitted', reject_reason: null },
        { onConflict: 'user_id,year,month' }
      )
    setSubmitting(false)
    fetchSubmission()
  }

  // 提出を取り消す（差し戻し済みの場合も再提出のために取り消せる）
  const handleCancel = async () => {
    if (!confirm('提出を取り消しますか？')) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }
    await supabase
      .from('attendance_submissions')
      .delete()
      .eq('user_id', user.id)
      .eq('year', viewYear)
      .eq('month', viewMonth)
    setSubmitting(false)
    fetchSubmission()
  }

  return (
    <div>
      <h2 className="page-title">提出</h2>

      {/* 当月サマリー */}
      <div className="submit-summary-card">
        <h3 className="submit-summary-title">{viewYear}年{viewMonth}月 サマリー</h3>
        {loadingSummary ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>読み込み中...</p>
        ) : (
          <div className="submit-summary-grid">
            <div className="submit-summary-item">
              <span className="submit-summary-label">勤務日数</span>
              <span className="submit-summary-value">{workingDays} 日</span>
            </div>
            <div className="submit-summary-item">
              <span className="submit-summary-label">交通費合計</span>
              <span className="submit-summary-value">¥{transportTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* 提出ステータス・操作エリア */}
      <div className="submission-panel">

        {/* 未提出 */}
        {status === 'none' && (
          <div className="submission-panel-inner none">
            <p className="submission-panel-title">未提出</p>
            <p className="submission-panel-desc">
              内容を確認したら「提出する」を押してください。<br />
              提出後は勤怠・交通費の編集ができなくなります。
            </p>
            <button
              className="btn-submit-large"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '送信中...' : '📤 提出する'}
            </button>
          </div>
        )}

        {/* 承認待ち（リーダー） */}
        {status === 'submitted' && (
          <div className="submission-panel-inner submitted">
            <p className="submission-panel-title">📬 承認待ち（リーダー確認中）</p>
            <p className="submission-panel-desc">
              リーダーが確認中です。承認されるまでお待ちください。
            </p>
            <button
              className="btn-cancel-submit"
              onClick={handleCancel}
              disabled={submitting}
            >
              {submitting ? '処理中...' : '取り消す'}
            </button>
          </div>
        )}

        {/* リーダー承認済み（管理者待ち） */}
        {status === 'leader_approved' && (
          <div className="submission-panel-inner leader-approved">
            <p className="submission-panel-title">📋 管理者承認待ち</p>
            <p className="submission-panel-desc">
              リーダーが承認しました。管理者の最終承認をお待ちください。
            </p>
          </div>
        )}

        {/* 最終承認済み */}
        {status === 'approved' && (
          <div className="submission-panel-inner approved">
            <p className="submission-panel-title">✅ 最終承認済み</p>
            <p className="submission-panel-desc">
              管理者による最終承認が完了しました。
            </p>
          </div>
        )}

        {/* 差し戻し */}
        {status === 'rejected' && (
          <div className="submission-panel-inner rejected">
            <p className="submission-panel-title">❌ 差し戻されました</p>
            {rejectReason && (
              <p className="submission-panel-desc">
                理由：{rejectReason}
              </p>
            )}
            <p className="submission-panel-desc">
              勤怠・交通費を修正してから再提出してください。
            </p>
            <button
              className="btn-cancel-submit"
              onClick={handleCancel}
              disabled={submitting}
            >
              {submitting ? '処理中...' : '取り消して修正する'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default SubmitPage
