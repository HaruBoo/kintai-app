// 1日分の勤怠データの型
export type DayRecord = {
  date: string      // 例: "2026/3/10"
  weekday: string   // 例: "火"
  clockIn: string   // 出勤時刻
  clockOut: string  // 退勤時刻
  breakTime: string // 休憩時間
  workTime: string  // 実働時間
  note: string      // 備考
}
