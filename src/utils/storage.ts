// localStorageからデータを読み込む汎用関数
// key: 保存に使うキー名
// fallback: データがなかった場合のデフォルト値
export const loadFromStorage = <T>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key)
  return saved ? (JSON.parse(saved) as T) : fallback
}

// localStorageにデータを保存する汎用関数
export const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data))
}

// 勤怠・交通費データのキー名を定数で管理する
export const STORAGE_KEYS = {
  kintai: 'kintai-records',
  kotsu: 'kotsu-records',
} as const
