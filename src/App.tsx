import { useState, useEffect } from 'react'
import './App.css'
import KintaiPage from './KintaiPage'
import KotsuPage from './KotsuPage'
import PayslipPage from './PayslipPage'
import ProfilePage from './ProfilePage'
import LoginPage from './LoginPage'
import AdminPage from './AdminPage'
import SetPasswordPage from './SetPasswordPage'
import ChangePasswordModal from './components/ChangePasswordModal'
import { supabase, isInviteFlow } from './services/supabase'
import { useRole } from './hooks/useRole'
import type { Session } from '@supabase/supabase-js'


type ColorMode = 'auto' | 'light' | 'dark'

const isDaytime = () => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18
}

function App() {
  const [page, setPage] = useState<'kintai' | 'kotsu' | 'payslip' | 'profile'>('kintai')

  // ログインセッション（null = 未ログイン）
  const [session, setSession] = useState<Session | null>(null)

  // セッションの読み込みが完了したか（完了前は画面を表示しない）
  const [sessionLoaded, setSessionLoaded] = useState(false)

  // 招待リンクから来たユーザーにパスワード設定画面を表示するフラグ
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(isInviteFlow)

  // パスワード変更モーダルの表示フラグ
  const [showChangePassword, setShowChangePassword] = useState(false)

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

  // プロフィール（Supabase から取得）
  const [empNo, setEmpNo] = useState('')
  const [name,  setName]  = useState('')

  // ロール取得（'admin' | 'employee' | null=読み込み中）
  const role = useRole(session)

  // アプリ起動時にログイン状態を確認する
  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoaded(true)
    })

    // ログイン・ログアウトの変化を監視する
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // コンポーネントが消えるときに監視を止める
    return () => subscription.unsubscribe()
  }, [])

  // セッションが確立したらプロフィールを取得する
  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('name, emp_no')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name    ?? '')
          setEmpNo(data.emp_no ?? '')
        }
      })
  }, [session])

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

  // セッション確認中はローディング表示（接続失敗で真っ白になるのを防ぐ）
  if (!sessionLoaded) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#aaa' }}>
      読み込み中...
    </div>
  )

  // 未ログインはログイン画面を表示
  if (!session) return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <LoginPage />
    </div>
  )

  // 招待リンクからログインした場合はパスワード設定画面を表示
  if (needsPasswordSetup) return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <SetPasswordPage onComplete={() => setNeedsPasswordSetup(false)} />
    </div>
  )

  // ロール取得中はローディング表示
  if (!role) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#aaa' }}>
      読み込み中...
    </div>
  )

  // ログイン時に選んだタブを確認する（管理者が一般タブでログインした場合は一般画面を表示）
  const loginTab = sessionStorage.getItem('loginTab')
  const showAdmin = role === 'admin' && loginTab === 'admin'

  // ===== 管理者画面 =====
  if (showAdmin) return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <div className="container">

        {/* ヘッダー */}
        <div className="admin-header">
          <p className="swell login-logo" style={{ margin: 0 }}>Swell</p>
          <span className="admin-badge">管理者</span>
          <div style={{ flex: 1 }} />

          {/* カラーモード切り替え */}
          <div className="mode-toggle">
            <button className={`mode-btn ${colorMode === 'light' ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('light')}>☀️ ライト</button>
            <button className={`mode-btn ${colorMode === 'auto'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('auto')} >🌓 自動</button>
            <button className={`mode-btn ${colorMode === 'dark'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('dark')} >🌙 ダーク</button>
          </div>

          {/* パスワード変更 */}
          <button className="btn-logout" onClick={() => setShowChangePassword(true)}>
            パスワード変更
          </button>

          {/* ログアウト */}
          <button className="btn-logout" onClick={() => supabase.auth.signOut()}>
            ログアウト
          </button>
        </div>

        {/* パスワード変更モーダル */}
        {showChangePassword && (
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        )}

        {/* 管理者コンテンツ */}
        <AdminPage />

      </div>
    </div>
  )

  // ===== 従業員画面（従来の画面） =====
  return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <div className="container">

        {/* プロフィール表示（Supabase から取得） */}
        {(empNo || name) && (
          <div className="profile-display">
            {empNo && <span className="profile-display-item"><span className="profile-display-label">社員番号</span>{empNo}</span>}
            {name  && <span className="profile-display-item"><span className="profile-display-label">氏名</span>{name}</span>}
          </div>
        )}

        {/* 月切り替え */}
        <div className="month-nav">
          <button className="month-btn" onClick={prevMonth}>◀</button>
          <span className="month-label">{viewYear}年{viewMonth}月</span>
          <button className="month-btn" onClick={nextMonth}>▶</button>
          {!isCurrentMonth && (
            <button className="month-today-btn" onClick={goToday}>今月</button>
          )}
        </div>

        {/* パスワード変更・ログアウトボタン（右端） */}
        <div className="logout-area">
          <button className="btn-logout" onClick={() => setShowChangePassword(true)}>
            パスワード変更
          </button>
          <button className="btn-logout" onClick={() => supabase.auth.signOut()}>
            ログアウト
          </button>
        </div>

        {/* パスワード変更モーダル */}
        {showChangePassword && (
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        )}

        {/* カラーモード切り替え */}
        <div className="mode-toggle" style={{ marginBottom: '8px' }}>
          <button className={`mode-btn ${colorMode === 'light' ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('light')}>☀️ ライト</button>
          <button className={`mode-btn ${colorMode === 'auto'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('auto')} >🌓 自動</button>
          <button className={`mode-btn ${colorMode === 'dark'  ? 'mode-btn-active' : ''}`} onClick={() => setColorMode('dark')} >🌙 ダーク</button>
        </div>

        {/* ナビゲーション */}
        <nav className="nav">
          <button className={`nav-tab ${page === 'kintai'  ? 'nav-tab-active' : ''}`} onClick={() => setPage('kintai')} >勤怠</button>
          <button className={`nav-tab ${page === 'kotsu'   ? 'nav-tab-active' : ''}`} onClick={() => setPage('kotsu')}  >交通費</button>
          <button className={`nav-tab ${page === 'payslip' ? 'nav-tab-active' : ''}`} onClick={() => setPage('payslip')}>給与明細</button>
          <button className={`nav-tab ${page === 'profile' ? 'nav-tab-active' : ''}`} onClick={() => setPage('profile')}>プロフィール</button>
        </nav>

        {/* profile は PIIを扱うページにのみ渡す */}
        {page === 'kintai'  && <KintaiPage  key={`kintai-${viewYear}-${viewMonth}`} viewYear={viewYear} viewMonth={viewMonth} profile={{ empNo, name }} />}
        {page === 'kotsu'   && <KotsuPage   key={`kotsu-${viewYear}-${viewMonth}`}  viewYear={viewYear} viewMonth={viewMonth} />}
        {page === 'payslip' && <PayslipPage />}
        {page === 'profile' && <ProfilePage />}

      </div>
    </div>
  )
}

export default App
