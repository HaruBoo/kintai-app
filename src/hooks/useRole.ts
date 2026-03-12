/**
 * useRole — ログイン中ユーザーのロールを取得するカスタムフック
 *
 * Supabase の profiles テーブルから role を読み込む。
 * - 'admin'    → 管理者画面を表示
 * - 'employee' → 従業員画面を表示
 * - null       → 読み込み中
 */

import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import type { Session } from '@supabase/supabase-js'

// ロールの型
export type Role = 'admin' | 'employee'

export function useRole(session: Session | null) {
  // null = 読み込み中、'admin' or 'employee' = 取得完了
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    // ログアウト状態はスキップ
    if (!session) {
      setRole(null)
      return
    }

    // profiles テーブルからログイン中ユーザーの role を取得
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        console.log('[useRole] data:', data, 'error:', error)
        if (error || !data) {
          // プロフィールが見つからない場合は employee 扱いにする
          console.warn('ロール取得に失敗しました。employee として扱います。', error)
          setRole('employee')
        } else {
          // 'admin' 以外はすべて 'employee' として扱う（安全側に倒す）
          setRole(data.role === 'admin' ? 'admin' : 'employee')
        }
      })
  }, [session])

  return role
}
