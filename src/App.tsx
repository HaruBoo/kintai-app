import { useState, useEffect } from 'react'
import './App.css'
import KintaiPage from './KintaiPage'
import KotsuPage from './KotsuPage'

// モードの種類：auto（日の出/日没で自動）、light（常にライト）、dark（常にダーク）
type ColorMode = 'auto' | 'light' | 'dark'

// 日の出（6時）〜日没（18時）かどうかを判定する
const isDaytime = () => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18
}

function App() {
  const [page, setPage] = useState<'kintai' | 'kotsu'>('kintai')

  // カラーモード（localStorageに保存して次回も維持）
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    return (localStorage.getItem('colorMode') as ColorMode) || 'auto'
  })

  // 実際にダークかどうかを判定する
  const [isDark, setIsDark] = useState(() => {
    const saved = (localStorage.getItem('colorMode') as ColorMode) || 'auto'
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return !isDaytime() // autoの場合は日時で判定
  })

  // モードが変わったとき、または1分ごとにダーク/ライトを再判定
  useEffect(() => {
    const update = () => {
      if (colorMode === 'dark') setIsDark(true)
      else if (colorMode === 'light') setIsDark(false)
      else setIsDark(!isDaytime()) // auto
    }
    update()
    const timer = setInterval(update, 60000) // 1分ごとに再チェック
    return () => clearInterval(timer)
  }, [colorMode])

  // モードをlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('colorMode', colorMode)
  }, [colorMode])

  return (
    // isDark が true のとき "dark" クラスを付ける
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <div className="container">

        {/* ナビゲーション */}
        <nav className="nav">
          <button
            className={`nav-tab ${page === 'kintai' ? 'nav-tab-active' : ''}`}
            onClick={() => setPage('kintai')}
          >
            勤怠
          </button>
          <button
            className={`nav-tab ${page === 'kotsu' ? 'nav-tab-active' : ''}`}
            onClick={() => setPage('kotsu')}
          >
            交通費
          </button>

          {/* 右端にモード切り替えボタン */}
          <div className="nav-spacer" />
          <div className="mode-toggle">
            <button
              className={`mode-btn ${colorMode === 'light' ? 'mode-btn-active' : ''}`}
              onClick={() => setColorMode('light')}
            >
              ☀️ ライト
            </button>
            <button
              className={`mode-btn ${colorMode === 'auto' ? 'mode-btn-active' : ''}`}
              onClick={() => setColorMode('auto')}
            >
              🌓 自動
            </button>
            <button
              className={`mode-btn ${colorMode === 'dark' ? 'mode-btn-active' : ''}`}
              onClick={() => setColorMode('dark')}
            >
              🌙 ダーク
            </button>
          </div>
        </nav>

        {/* ページ切り替え */}
        {page === 'kintai' ? <KintaiPage /> : <KotsuPage />}

      </div>
    </div>
  )
}

export default App
