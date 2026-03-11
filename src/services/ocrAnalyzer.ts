/**
 * ocrAnalyzer — Tesseract.js を使ったブラウザ内OCRサービス
 *
 * APIキー不要。画像からテキストを読み取り、交通費情報を抽出する。
 * 精度はAI分析より低いが、完全無料・オフライン動作可能。
 *
 * 初回実行時: 日本語モデル（約30MB）を自動ダウンロードする。
 */

import { createWorker } from 'tesseract.js'

// OCRの読み取り結果の型
export type OcrResult = {
  rawText: string  // OCRで読み取った生のテキスト（確認用）
  date: string     // 解析した日付（YYYY-MM-DD形式）
  from: string     // 出発駅
  to: string       // 到着駅
  amount: string   // 金額（数字のみ）
}

/**
 * OCRで読み取ったテキストから交通費情報を正規表現で抽出する
 * ※ テキスト解析なので、AIほど正確ではない
 */
const parseTransportText = (text: string): Omit<OcrResult, 'rawText'> => {

  // 日付パターン: 2026/3/11 / 2026-3-11 / 2026年3月11日
  const dateMatch =
    text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/) ||
    text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日?/)

  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    : ''

  // 金額パターン: ¥200 / ￥200 / 200円 / IC 200
  const amountMatch =
    text.match(/[¥￥]\s*(\d{2,6})/) ||
    text.match(/(\d{2,6})\s*円/) ||
    text.match(/IC\s+(\d{2,6})/)

  const amount = amountMatch ? amountMatch[1] : ''

  // 区間パターン: 渋谷→新宿 / 渋谷 ⇒ 新宿 / 渋谷-新宿
  const routeMatch = text.match(
    /([^\s\n→⇒\-\/]+?)\s*[→⇒]\s*([^\s\n¥￥\d→⇒]+?)(?=\s|¥|￥|\d|$)/
  )

  const from = routeMatch ? routeMatch[1].trim() : ''
  const to   = routeMatch ? routeMatch[2].trim() : ''

  return { date, from, to, amount }
}

/**
 * 画像をOCRで読み取り、交通費情報を抽出して返す
 *
 * @param dataUrl    画像のdata URL（"data:image/...;base64,..."形式）
 * @param onProgress 進捗コールバック（0〜100の整数）
 */
export const ocrReceipt = async (
  dataUrl: string,
  onProgress?: (pct: number) => void
): Promise<OcrResult> => {

  // 日本語 + 英語の両方で認識（駅名・金額どちらも対応）
  const worker = await createWorker(['jpn', 'eng'], 1, {
    logger: (m: { status: string; progress: number }) => {
      // 認識中の進捗をコールバックで伝える
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  try {
    const { data: { text } } = await worker.recognize(dataUrl)
    const parsed = parseTransportText(text)
    return { rawText: text, ...parsed }
  } finally {
    // 必ずworkerを終了してメモリを解放
    await worker.terminate()
  }
}
