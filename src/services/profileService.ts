/**
 * profileService — 個人情報操作を一元管理するサービス
 *
 * 設計意図:
 * - PIIに触れるロジックをこのファイルだけに限定する
 * - 将来バックエンドに移行する際は、このサービスだけを書き換えればよい
 *
 * 将来の移行イメージ:
 *   現在: メモリのみ（保存なし）
 *   将来: fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
 */

import type { Profile, PiiExportPolicy } from '../types/profile'

/**
 * 社員番号をマスクする
 * 例: "12345" → "1***5"（先頭1文字・末尾1文字のみ表示）
 *     "001"   → "0*1"
 *     ""      → ""
 */
export const maskEmpNo = (empNo: string): string => {
  if (!empNo) return ''
  if (empNo.length <= 2) return '*'.repeat(empNo.length)
  const first = empNo[0]
  const last  = empNo[empNo.length - 1]
  const mid   = '*'.repeat(empNo.length - 2)
  return `${first}${mid}${last}`
}

/**
 * CSV出力用に社員情報を方針に従って変換する
 * - 'exclude' → 空文字（含めない）
 * - 'masked'  → 社員番号をマスクして返す
 * - 'include' → そのまま返す（明示的操作後のみ許可）
 */
export const buildProfileForCsv = (
  profile: Profile,
  policy: PiiExportPolicy
): { empNo: string; name: string } => {
  if (policy === 'exclude') return { empNo: '', name: '' }
  if (policy === 'masked')  return { empNo: maskEmpNo(profile.empNo), name: profile.name }
  return { empNo: profile.empNo, name: profile.name }  // 'include'
}

/**
 * プロフィールが入力済みかどうかを確認する
 */
export const hasProfile = (profile: Profile): boolean =>
  profile.empNo.trim() !== '' || profile.name.trim() !== ''

/**
 * 空のプロフィールを返す（初期値用）
 * ※ localStorage から読み込まない
 */
export const emptyProfile = (): Profile => ({ empNo: '', name: '' })
