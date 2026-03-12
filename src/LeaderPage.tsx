/**
 * LeaderPage — リーダー専用タブ
 *
 * リーダーは通常の社員画面に加えてこのタブが表示される。
 * チームメンバーの勤怠提出を確認・承認・差し戻しできる。
 */

import LeaderAttendance from './components/leader/LeaderAttendance'

function LeaderPage() {
  return (
    <div>
      <LeaderAttendance />
    </div>
  )
}

export default LeaderPage
