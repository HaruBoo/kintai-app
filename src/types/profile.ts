/**
 * 個人識別情報（PII）の型定義
 *
 * 設計ルール:
 * - この型は AttendanceRecord / KotsuRecord と絶対にマージしない
 * - localStorageに保存しない
 * - コンポーネントに渡す場合は ProfileSection 経由のみ
 * - 将来: バックエンド認証後のAPIレスポンス型にも使用可能
 */
export type Profile = {
  empNo: string  // 社員番号
  name: string   // 氏名
}

/**
 * CSV出力時のPII方針
 * - 'exclude' : 個人情報を含めない（デフォルト）
 * - 'masked'  : 社員番号をマスクして含める
 * - 'include' : 明示的な操作後のみ使用可能
 */
export type PiiExportPolicy = 'exclude' | 'masked' | 'include'
