/**
 * ProfileSection — 個人情報入力専用コンポーネント
 *
 * 設計ルール:
 * - このコンポーネントだけがPIIの入力UIを持つ
 * - 社員番号はデフォルトでマスク表示（目アイコンで切り替え可能）
 * - 外部には Profile オブジェクト全体を渡す（profileService経由でのみ加工）
 */

import { useState } from 'react'
import type { Profile } from '../types/profile'
import { maskEmpNo } from '../services/profileService'

type Props = {
  profile: Profile
  onChange: (profile: Profile) => void
}

function ProfileSection({ profile, onChange }: Props) {
  // 社員番号の表示/非表示（デフォルトはマスク）
  const [showEmpNo, setShowEmpNo] = useState(false)

  return (
    <div className="profile-section">

      {/* 社員番号 */}
      <div className="profile-field">
        <label>社員番号</label>
        <div className="profile-input-wrapper">
          <input
            type={showEmpNo ? 'text' : 'password'}
            className="profile-input"
            placeholder="社員番号"
            autoComplete="off"
            value={profile.empNo}
            onChange={e => onChange({ ...profile, empNo: e.target.value })}
          />
          {/* マスク切り替えボタン */}
          <button
            className="toggle-mask-btn"
            onClick={() => setShowEmpNo(v => !v)}
            title={showEmpNo ? '非表示にする' : '表示する'}
          >
            {showEmpNo ? '🙈' : '👁'}
          </button>
        </div>
        {/* 入力済みの場合、マスク表示でプレビューを表示 */}
        {!showEmpNo && profile.empNo && (
          <span className="masked-preview">{maskEmpNo(profile.empNo)}</span>
        )}
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
