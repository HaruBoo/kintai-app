/**
 * CsvExport — CSV出力専用コンポーネント
 *
 * 設計ルール:
 * - CSV出力時のPII方針をこのコンポーネントで一元管理
 * - 個人情報の含め方は「除外/マスク/含める」の3段階
 * - 「含める」は明示的なチェック操作が必要
 * - ダウンロード後は方針をリセット（都度明示的な操作を求める）
 */

import { useState } from 'react'
import type { Profile, PiiExportPolicy } from '../types/profile'
import { buildProfileForCsv, hasProfile } from '../services/profileService'
import { downloadCSV } from '../utils/csv'

type Props = {
  // ダウンロードするデータ（PIIを含まない勤怠/交通費データ）
  buildRows: () => string[][]
  filename: string
  profile: Profile
  // 補足情報（勤務日数など）
  summary?: string
}

function CsvExport({ buildRows, filename, profile, summary }: Props) {
  // デフォルトは「除外」（個人情報を含めない）
  const [policy, setPolicy] = useState<PiiExportPolicy>('exclude')

  const handleDownload = () => {
    // PIIを方針に従って変換（profileServiceに委譲）
    const pii = buildProfileForCsv(profile, policy)

    // PIIヘッダー行（方針がexcludeなら空行のみ）
    const piiRows: string[][] = pii.empNo || pii.name
      ? [[`社員番号: ${pii.empNo}`, `氏名: ${pii.name}`], []]
      : []

    const dataRows = buildRows()
    const footerRows: string[][] = summary ? [[], [summary]] : []

    downloadCSV([...piiRows, ...dataRows, ...footerRows], filename)

    // ダウンロード後は必ず「除外」に戻す（都度明示的な操作を要求）
    setPolicy('exclude')
  }

  return (
    <div className="csv-export">
      {/* 個人情報が入力されている場合のみ方針を選べる */}
      {hasProfile(profile) && (
        <div className="pii-policy">
          <span className="pii-policy-label">個人情報：</span>
          <label className="pii-option">
            <input type="radio" name="pii" value="exclude"
              checked={policy === 'exclude'}
              onChange={() => setPolicy('exclude')} />
            含めない
          </label>
          <label className="pii-option">
            <input type="radio" name="pii" value="masked"
              checked={policy === 'masked'}
              onChange={() => setPolicy('masked')} />
            番号をマスク
          </label>
          <label className="pii-option pii-option-danger">
            <input type="radio" name="pii" value="include"
              checked={policy === 'include'}
              onChange={() => setPolicy('include')} />
            含める
          </label>
        </div>
      )}
      <button className="btn-download" onClick={handleDownload}>
        ダウンロードする
      </button>
    </div>
  )
}

export default CsvExport
