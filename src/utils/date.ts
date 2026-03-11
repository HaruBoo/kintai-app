import * as HolidayJp from '@holiday-jp/holiday_jp'

// 今日の日付を "YYYY-MM-DD" 形式で返す（input type="date" 用）
export const todayISO = () => new Date().toISOString().split('T')[0]

// Date を「2026年3月10日（火）」のような日本語形式に変換する
export const formatDateLong = (d: Date) =>
  d.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

// Date を「2026/3/10」のような短い形式に変換する（レコードのキーとして使う）
export const formatDateShort = (d: Date) => d.toLocaleDateString('ja-JP')

// Date から曜日（「火」など）を取得する
export const getWeekday = (d: Date) =>
  d.toLocaleDateString('ja-JP', { weekday: 'short' })

// 日本語の日付文字列（例: "2026/3/10"）をISO形式（"2026-03-10"）に変換する
export const dateJPtoISO = (dateJP: string): string => {
  const d = new Date(dateJP)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日付と曜日からテーブル行のCSSクラスを返す（土日祝の色分け用）
export const getRowClass = (dateStr: string, weekday: string): string => {
  if (HolidayJp.isHoliday(new Date(dateStr))) return 'row-holiday'
  if (weekday === '土') return 'row-saturday'
  if (weekday === '日') return 'row-sunday'
  return ''
}
