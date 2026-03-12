/**
 * AdminPage — 管理者向けメインページ
 *
 * タブ構成:
 * - ユーザー管理: アカウントの追加・削除・ロール変更
 * - 勤怠確認:    全社員の勤怠データ一覧
 * - 交通費確認:  全社員の交通費データ一覧
 * - 給与明細:    給与明細の添付・送信
 */

import { useState } from 'react'
import AdminUsers from './components/admin/AdminUsers'
import AdminAttendance from './components/admin/AdminAttendance'
import AdminTransport from './components/admin/AdminTransport'
import AdminPayslip from './components/admin/AdminPayslip'

// 管理者タブの種類
type AdminTab = 'users' | 'attendance' | 'transport' | 'payslip'

function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users')

  return (
    <div>
      {/* 管理者ナビゲーション */}
      <nav className="admin-nav">
        <button
          className={`nav-tab ${tab === 'users' ? 'nav-tab-active' : ''}`}
          onClick={() => setTab('users')}
        >
          👥 ユーザー管理
        </button>
        <button
          className={`nav-tab ${tab === 'attendance' ? 'nav-tab-active' : ''}`}
          onClick={() => setTab('attendance')}
        >
          📋 勤怠確認
        </button>
        <button
          className={`nav-tab ${tab === 'transport' ? 'nav-tab-active' : ''}`}
          onClick={() => setTab('transport')}
        >
          🚃 交通費確認
        </button>
        <button
          className={`nav-tab ${tab === 'payslip' ? 'nav-tab-active' : ''}`}
          onClick={() => setTab('payslip')}
        >
          💰 給与明細
        </button>
      </nav>

      {/* タブコンテンツ */}
      <div className="admin-content">
        {tab === 'users'      && <AdminUsers />}
        {tab === 'attendance' && <AdminAttendance />}
        {tab === 'transport'  && <AdminTransport />}
        {tab === 'payslip'    && <AdminPayslip />}
      </div>
    </div>
  )
}

export default AdminPage
