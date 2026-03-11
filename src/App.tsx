import { useState, useEffect } from 'react'
import './App.css'
import KintaiPage from './KintaiPage'
import KotsuPage from './KotsuPage'
import ProfileSection from './components/ProfileSection'
import { emptyProfile } from './services/profileService'
import type { Profile } from './types/profile'

type ColorMode = 'auto' | 'light' | 'dark'

const isDaytime = () => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18
}

function App() {
  const [page, setPage] = useState<'kintai' | 'kotsu'>('kintai')

  // カラーモードのみ localStorage に保存（PIIは保存しない）
  const [colorMode, setColorMode] = useState<ColorMode>(() =>
    (localStorage.getItem('colorMode') as ColorMode) || 'auto'
  )
  const [isDark, setIsDark] = useState(() => {
    const saved = (localStorage.getItem('colorMode') as ColorMode) || 'auto'
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return !isDaytime()
  })

  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)

  // PII: メモリのみ保持。localStorage/sessionStorage/URLには出力しない
  const [profile, setProfile] = useState<Profile>(emptyProfile)

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

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const goToday = () => {
    setViewYear(new Date().getFullYear())
    setViewMonth(new Date().getMonth() + 1)
  }

  const isCurrentMonth =
    viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth() + 1

  return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <div className="container">

        {/* PII入力は ProfileSection コンポーネントに責務を限定 */}
        <ProfileSection profile={profile} onChange={setProfile} />

        {/* 月切り替え */}
        <div className="month-nav">
          <button className="month-btn" onClick={prevMonth}>◀</button>
          <span className="month-label">{viewYear}年{viewMonth}月</span>
          <button className="month-btn" onClick={nextMonth}>▶</button>
          {!isCurrentMonth && (
            <button className="month-today-btn" onClick={goToday}>今月</button>
          )}
        </div>

        {/* ナビゲーション */}
        <nav className="nav">
          <button className={`nav-tab ${page === 'kintai' ? 'nav-tab-active' : ''}`} onClick={() => setPage('kintai')}>勤怠</button>
          <button className={`nav-tab ${page === 'kotsu'  ? 'nav-tab-active' : ''}`} onClick={() => setPage('kotsu')} >交通費</button>
          <div className="nav-spacer" />
          <div className="mode-toggle">
            <button className={`mode-btn ${colorMode === 'light' ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('light')}>☀️ ライト</button>
            <button className={`mode-btn ${colorMode === 'auto'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('auto')} >🌓 自動</button>
            <button className={`mode-btn ${colorMode === 'dark'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('dark')} >🌙 ダーク</button>
          </div>
        </nav>

        {/* profile は PIIを扱うページにのみ渡す */}
        {page === 'kintai'
          ? <KintaiPage key={`kintai-${viewYear}-${viewMonth}`} viewYear={viewYear} viewMonth={viewMonth} profile={profile} />
          : <KotsuPage  key={`kotsu-${viewYear}-${viewMonth}`}  viewYear={viewYear} viewMonth={viewMonth} />
        }

      </div>
    </div>
  )
}

export default App
