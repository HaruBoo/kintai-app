/**
 * receiptAnalyzer — 領収書画像をClaudeで分析するサービス
 *
 * 設計ルール:
 * - Anthropic APIへの呼び出しはこのファイルに集約する
 * - APIキーはlocalStorageに保存（デスクトップアプリのみ想定）
 * - 分析結果はユーザーが編集できる形（フォーム入力値）で返す
 */

// 分析結果の型
export type ReceiptData = {
  date: string    // YYYY-MM-DD形式（dateインプットにそのまま使える）
  from: string    // 出発駅・出発地
  to: string      // 到着駅・到着地
  amount: string  // 金額（数字のみ）
}

/**
 * 領収書画像をClaude APIで分析して交通費情報を抽出する
 * @param base64Image  data URLから「,」以降のbase64文字列のみ
 * @param mediaType    画像のMIMEタイプ（例: "image/jpeg"）
 * @param apiKey       Anthropic APIキー（"sk-ant-..."）
 */
export const analyzeReceipt = async (
  base64Image: string,
  mediaType: string,
  apiKey: string
): Promise<ReceiptData> => {

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      // ブラウザから直接APIを呼ぶために必要なヘッダー
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',  // 高速・低コストのモデルを使用
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            // 画像データ
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Image },
          },
          {
            // 分析指示
            type: 'text',
            text: `この交通費の領収書・チケット・ICカード明細の画像を分析して、以下の情報をJSONで返してください。読み取れない項目は空文字列にしてください。

{
  "date": "日付（YYYY-MM-DD形式。例: 2026-03-11）",
  "from": "出発駅または出発地（例: 渋谷）",
  "to": "到着駅または到着地（例: 新宿）",
  "amount": "金額（数字のみ、円マーク不要。例: 200）"
}

JSONのみ返してください。`,
          },
        ],
      }],
    }),
  })

  // APIエラーのチェック
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: '' } }))
    const msg = err?.error?.message || `APIエラー (${response.status})`

    // よくあるエラーをわかりやすいメッセージに変換
    if (response.status === 401) throw new Error('APIキーが正しくありません')
    if (response.status === 429) throw new Error('APIの利用上限に達しました。しばらく待ってから再試行してください')
    throw new Error(msg)
  }

  const data = await response.json()
  const text: string = data.content?.[0]?.text ?? ''

  // レスポンスからJSONを抽出（コードブロックで囲まれていても対応）
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch?.[1] ?? jsonMatch?.[0]

  if (!jsonStr) throw new Error('分析結果を読み取れませんでした')

  const parsed = JSON.parse(jsonStr)

  return {
    date:   String(parsed.date   ?? ''),
    from:   String(parsed.from   ?? ''),
    to:     String(parsed.to     ?? ''),
    amount: String(parsed.amount ?? ''),
  }
}
