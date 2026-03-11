// CSVファイルをダウンロードする汎用関数
// rows: 2次元配列（1行目がヘッダー）
// filename: ダウンロードするファイル名
export const downloadCSV = (rows: string[][], filename: string) => {
  // 行ごとにカンマでつなげてCSV文字列を作る
  const csv = rows.map(row => row.join(',')).join('\n')

  // ExcelでCSVを開いたときに日本語が文字化けしないようBOM（\uFEFF）を付ける
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })

  // ダウンロード用のリンクを一時的に作って自動クリックする
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // 使い終わったURLを解放する（後片付け）
  URL.revokeObjectURL(url)
}
