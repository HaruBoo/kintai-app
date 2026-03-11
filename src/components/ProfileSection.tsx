/**
 * ProfileSection — 個人情報入力専用コンポーネント
 *
 * 設計ルール:
 * - このコンポーネントだけがPIIの入力UIを持つ
 * - 外部には Profile オブジェクト全体を渡す（profileService経由でのみ加工）
 */

import type { Profile } from '../types/profile'

type Props = {
  profile: Profile
  onChange: (profile: Profile) => void
}

function ProfileSection({ profile, onChange }: Props) {
  return (
    <div className="profile-section">

      {/* 社員番号 */}
      <div className="profile-field">
        <label>社員番号</label>
        <input
          type="text"
          className="profile-input"
          placeholder="社員番号"
          autoComplete="off"
          value={profile.empNo}
          onChange={e => onChange({ ...profile, empNo: e.target.value })}
        />
      </div>

      {/* 氏名 */}
      <div className="profile-field">
        <label>氏名</label>
        <input
          type="text"
          className="profile-input"
          placeholder="氏名"
          autoComplete="off"
          value={profile.name}
          onChange={e => onChange({ ...profile, name: e.target.value })}
        />
      </div>

      <p className="profile-notice">
        ※ 入力情報はメモリにのみ保持されます。ページを閉じると消えます。
      </p>
    </div>
  )
}

export default ProfileSection
