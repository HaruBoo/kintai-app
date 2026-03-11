import { useState, useEffect } from 'react'
import './App.css'
import KintaiPage from './KintaiPage'
import KotsuPage from './KotsuPage'

type ColorMode = 'auto' | 'light' | 'dark'

// 社員情報の型（メモリ上にのみ存在）
export type Profile = {
  empNo: string  // 社員番号
  name: string   // 氏名
}

const isDaytime = () => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18
}

function App() {
  const [page, setPage] = useState<'kintai' | 'kotsu'>('kintai')

  // カラーモード（カラーモードのみlocalStorageに保存。個人情報は含まない）
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

  // 社員情報：メモリ上にのみ保持
  // localStorage / sessionStorage / URL / console には一切出力しない
  const [profile, setProfile] = useState<Profile>({ empNo: '', name: '' })

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

  // カラーモードのみ保存（個人情報は保存しない）
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

        {/* 社員情報エリア
            ・入力値はReactのstateにのみ保持（localStorageには保存しない）
            ・ページを閉じると消える仕様（個人情報保護のため）
        */}
        <div className="profile-section">
          <div className="profile-field">
            <label>社員番号</label>
            {/* type="password" で画面上も非表示 */}
            <input
              type="password"
              className="profile-input"
              placeholder="社員番号"
              autoComplete="off"
              value={profile.empNo}
              onChange={e => setProfile(p => ({ ...p, empNo: e.target.value }))}
            />
          </div>
          <div className="profile-field">
            <label>氏名</label>
            <input
              type="text"
              className="profile-input"
              placeholder="氏名"
              autoComplete="off"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <p className="profile-notice">※ 入力情報はこの端末のメモリにのみ保持されます</p>
        </div>

        {/* 月切り替えエリア */}
        <div className="month-nav">
          <button className="month-btn" onClick={prevMonth}>◀</button>
          <span className="month-label">{viewYear}年{viewMonth}月</span>
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

        {page === 'kintai'
          ? <KintaiPage key={`kintai-${viewYear}-${viewMonth}`} viewYear={viewYear} viewMonth={viewMonth} profile={profile} />
          : <KotsuPage  key={`kotsu-${viewYear}-${viewMonth}`}  viewYear={viewYear} viewMonth={viewMonth} />
        }

      </div>
    </div>
  )
}

export default App
