# KotsuPage.tsx コード解説

交通費申請ページのコードについて、「なぜそう書いたのか」を説明します。

---

## 全体の構造

```
KotsuPage
├── データ管理（useState / useEffect）
├── フォーム処理（handleFileChange / handleAdd）
├── テーブル処理（handleDateClick / handleDateSave / handleDelete）
└── 画面表示（JSX）
    ├── 入力フォーム（領収書 + 日付 + 駅 + 金額）
    ├── 申請一覧テーブル
    └── 領収書拡大モーダル
```

---

## なぜ useState を使うのか

React では、画面に表示する値が変わったときに自動で画面を更新する仕組みが必要です。
その仕組みが `useState` です。

```tsx
const [records, setRecords] = useState<KotsuRecord[]>(...)
```

- `records` → 現在の値（交通費の一覧）
- `setRecords` → 値を更新する関数（呼ぶと画面が自動で再描画される）
- `useState(初期値)` → 最初の値を設定する

---

## なぜ useEffect を使うのか

```tsx
useEffect(() => {
  saveToStorage(storageKey, records)
}, [records, storageKey])
```

`useEffect` は「ある値が変わったときだけ処理を実行する」仕組みです。
`records`（データ一覧）が変わるたびに localStorage へ保存しています。

**なぜ直接書かないのか？**
React の描画中に保存処理を呼ぶとバグの原因になるため、`useEffect` で「描画の後に実行」するルールになっています。

---

## なぜ useRef を使うのか

```tsx
const fileInputRef = useRef<HTMLInputElement>(null)
```

画像を追加した後にフォームをリセットするとき、ファイル選択欄だけは `useState` では制御できません（ブラウザの仕様）。
`useRef` を使うと、DOM 要素（HTMLの部品）を直接操作できます。

```tsx
if (fileInputRef.current) fileInputRef.current.value = ''
// ↑ ファイル選択欄を強制的に空にしている
```

---

## なぜ画像を base64 に変換するのか

```tsx
const reader = new FileReader()
reader.onload = () => setReceiptDataUrl(reader.result as string)
reader.readAsDataURL(file)
```

localStorage に保存できるのは「文字列」だけです。
画像はそのままでは保存できないため、`FileReader` を使って画像を文字列（base64）に変換しています。

変換後の形式：`data:image/jpeg;base64,/9j/4AAQ...（長い文字列）`

この文字列は `<img src="..." />` にそのまま使えるので、表示も保存もできます。

---

## なぜファイル選択ボタンを label で作るのか

```tsx
<input type="file" className="receipt-file-input" id="receiptFile" ... />
<label htmlFor="receiptFile" className="receipt-file-label">
  📎 画像を選択
</label>
```

ブラウザのデフォルトのファイル選択ボタンはデザインが変えられません。
そのため：
1. 実際の `input` を `display: none`（CSS）で非表示にする
2. 見た目の整った `label` をボタンのように見せる
3. `label` をクリックすると、`htmlFor` で紐づいた `input` が動く

この方法で、デザインを自由にしながらファイル選択が使えます。

---

## なぜモーダルの背景クリックで閉じるのか

```tsx
<div className="receipt-modal" onClick={() => setViewReceiptUrl(null)}>
  <div className="receipt-modal-inner" onClick={e => e.stopPropagation()}>
```

- 外側（背景）をクリック → `setViewReceiptUrl(null)` でモーダルを閉じる
- 内側（画像エリア）をクリック → `e.stopPropagation()` でクリックイベントが外側に伝わるのを止める

`stopPropagation` がないと、画像をクリックしたときも閉じてしまいます。

---

## なぜ削除に確認ステップを入れるのか

```tsx
const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
```

削除ボタンを押しただけでは消えず、「はい / キャンセル」の確認が出るようにしています。

**理由：** 誤タップ・誤クリックでデータが消えると復元できないため。
`deleteConfirmIndex` に「どの行を削除しようとしているか」を記憶させて、確認後だけ実際に削除します。

---

## なぜ合計（total）を state にしないのか

```tsx
const total = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
```

`total` は `records` から毎回計算できます。
わざわざ `useState` で別管理すると、「records が変わったのに total が古いまま」というバグが起きる可能性があります。
計算できるものは state にせず、描画のたびに計算し直すのが React の基本です。

---

## なぜデータを月ごとに分けて保存するのか

```tsx
const storageKey = getKotsuKey(viewYear, viewMonth)
// 例: "kotsu-2026-03"
```

すべての月のデータを1つにまとめると：
- 過去データが増えるほど処理が遅くなる
- 月を切り替えたときに「先月のデータ」が混ざる危険がある

月ごとに別々のキーで localStorage に保存することで、シンプルかつ安全に管理できます。
