// 時（00〜23）のプルダウン選択肢
export const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

// 分（00, 05, 10, ...55）のプルダウン選択肢
export const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// 時・分を "09:30" の形式に結合する
export const toHHMM = (h: string, m: string) => `${h}:${m}`

// 現在時刻から時（HH形式）を取得する
export const getNowH = () => String(new Date().getHours()).padStart(2, '0')

// 現在時刻から分を5分単位に丸めて取得する（例: 23分 → 20分）
export const getNowM = () =>
  String(Math.floor(new Date().getMinutes() / 5) * 5).padStart(2, '0')

// 休憩時間を手動変更したときに実働時間を再計算する
// 実働 = （退勤 - 出勤） - 手動入力の休憩時間
export const calcWorkTimeFromBreak = (
  clockIn: string,
  clockOut: string,
  breakTime: string
): string => {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const total = toMin(clockOut) - toMin(clockIn)
  const brk   = toMin(breakTime)
  const work  = total - brk
  if (work <= 0) return '-'
  return `${Math.floor(work / 60)}:${String(work % 60).padStart(2, '0')}`
}

// 出勤・退勤時刻から休憩時間と実働時間を計算する
// ルール：在席時間が6時間超なら休憩1時間を差し引く
export const calcTimes = (
  clockIn: string,
  clockOut: string
): { breakTime: string; workTime: string } => {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const raw = toMin(clockOut) - toMin(clockIn)
  if (raw <= 0) return { breakTime: '0:00', workTime: '-' }
  const brk = raw > 360 ? 60 : 0
  const work = raw - brk
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
  return { breakTime: fmt(brk), workTime: fmt(work) }
}
