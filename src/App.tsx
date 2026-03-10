import { useState } from 'react'
import './App.css'
import KintaiPage from './KintaiPage'
import KotsuPage from './KotsuPage'

function App() {
  // 現在どのページを表示しているかを管理する箱
  // 'kintai'（勤怠）か 'kotsu'（交通費）のどちらかが入る
  const [page, setPage] = useState<'kintai' | 'kotsu'>('kintai')

  return (
    <div className="container">

      {/* ナビゲーションタブ */}
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
      </nav>

      {/* ページの切り替え：page の値に応じて表示するコンポーネントを変える */}
      {page === 'kintai' ? <KintaiPage /> : <KotsuPage />}

    </div>
  )
}

export default App
