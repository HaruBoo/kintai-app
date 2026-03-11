// 1件分の交通費データの型
export type KotsuRecord = {
  date: string             // 例: "2026/3/10"
  from: string             // 出発駅
  to: string               // 到着駅
  amount: string           // 費用（円）
  receiptImage?: string    // 領収書画像（base64形式、オプション）
  receiptDate?: string     // 領収書に記載された購入日（オプション）
  receiptAmount?: string   // 領収書に記載された購入金額（オプション）
}
