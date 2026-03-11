import { useState, useEffect } from 'react'
import './App.css'
import KintaiPage from './KintaiPage'
import KotsuPage from './KotsuPage'
import { loadFromStorage, saveToStorage, PROFILE_KEY } from './utils/storage'

type ColorMode = 'auto' | 'light' | 'dark'

// 社員情報の型
type Profile = {
  empNo: string  // 社員番号
  name: string   // 氏名
}

const isDaytime = () => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18
}

function App() {
  const [page, setPage] = useState<'kintai' | 'kotsu'>('kintai')

  // カラーモード
  const [colorMode, setColorMode] = useState<ColorMode>(() =>
    (localStorage.getItem('colorMode') as ColorMode) || 'auto'
  )
  const [isDark, setIsDark] = useState(() => {
    const saved = (localStorage.getItem('colorMode') as ColorMode) || 'auto'
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return !isDaytime()
  })

  // 表示する年月（両ページで共有）
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)

  // 社員情報
  const [profile, setProfile] = useState<Profile>(() =>
    loadFromStorage<Profile>(PROFILE_KEY, { empNo: '', name: '' })
  )

  useEffect(() => {
    const update = () => {
      if (colorMode === 'dark') setIsDark(true)
      else if (colorMode === 'light') setIsDark(false)
      else setIsDark(!isDaytime())
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [colorMode])

  useEffect(() => {
    localStorage.setItem('colorMode', colorMode)
  }, [colorMode])

  useEffect(() => {
    saveToStorage(PROFILE_KEY, profile)
  }, [profile])

  // 前の月へ
  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }

  // 次の月へ
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  // 今月に戻る
  const goToday = () => {
    setViewYear(new Date().getFullYear())
    setViewMonth(new Date().getMonth() + 1)
  }

  const isCurrentMonth =
    viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth() + 1

  return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <div className="container">

        {/* 社員情報エリア */}
        <div className="profile-section">
          <div className="profile-field">
            <label>社員番号</label>
            <input
              type="text"
              className="profile-input"
              placeholder="例：001"
              value={profile.empNo}
              onChange={e => setProfile({ ...profile, empNo: e.target.value })}
            />
          </div>
          <div className="profile-field">
            <label>氏名</label>
            <input
              type="text"
              className="profile-input"
              placeholder="例：山田 太郎"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
        </div>

        {/* 月切り替えエリア */}
        <div className="month-nav">
          <button className="month-btn" onClick={prevMonth}>◀</button>
          <span className="month-label">
            {viewYear}年{viewMonth}月
          </span>
          <button className="month-btn" onClick={nextMonth}>▶</button>
          {!isCurrentMonth && (
            <button className="month-today-btn" onClick={goToday}>今月</button>
          )}
        </div>

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
          <div className="nav-spacer" />
          <div className="mode-toggle">
            <button className={`mode-btn ${colorMode === 'light' ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('light')}>☀️ ライト</button>
            <button className={`mode-btn ${colorMode === 'auto'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('auto')} >🌓 自動</button>
            <button className={`mode-btn ${colorMode === 'dark'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('dark')} >🌙 ダーク</button>
          </div>
        </nav>

        {/* ページ切り替え */}
        {/* key を渡すことで月が変わると自動でリセット・再読み込みされる */}
        {page === 'kintai'
          ? <KintaiPage key={`kintai-${viewYear}-${viewMonth}`} viewYear={viewYear} viewMonth={viewMonth} profile={profile} />
          : <KotsuPage  key={`kotsu-${viewYear}-${viewMonth}`}  viewYear={viewYear} viewMonth={viewMonth} />
        }

      </div>
    </div>
  )
}

export default App
