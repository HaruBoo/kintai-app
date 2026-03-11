// 1件分の交通費データの型
export type KotsuRecord = {
  date: string    // 例: "2026/3/10"
  from: string    // 出発駅
  to: string      // 到着駅
  amount: string  // 費用（円）
}
