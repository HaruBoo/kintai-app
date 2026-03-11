// localStorageからデータを読み込む汎用関数
export const loadFromStorage = <T>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key)
  return saved ? (JSON.parse(saved) as T) : fallback
}

// localStorageにデータを保存する汎用関数
export const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data))
}

// 月ごとの勤怠データキーを生成する（例: "kintai-2026-03"）
export const getKintaiKey = (year: number, month: number) =>
  `kintai-${year}-${String(month).padStart(2, '0')}`

// 月ごとの交通費データキーを生成する（例: "kotsu-2026-03"）
export const getKotsuKey = (year: number, month: number) =>
  `kotsu-${year}-${String(month).padStart(2, '0')}`

// 社員情報のキー
export const PROFILE_KEY = 'user-profile'
