/**
 * AdminAttendance — 勤怠確認タブ（管理者用）
 *
 * 全社員の勤怠データを月別に閲覧できる。
 * ※ 現在は localStorage のデータを参照。後でSupabaseに移行予定。
 */

function AdminAttendance() {
  return (
    <div className="admin-attendance">
      <h2 className="admin-section-title">勤怠確認</h2>
      <p style={{ color: '#aaa', marginTop: '1rem' }}>
        この機能は準備中です。<br />
        全社員の勤怠データをここで確認できるようになります。
      </p>
    </div>
  )
}

export default AdminAttendance
