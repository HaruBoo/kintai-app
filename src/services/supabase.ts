/**
 * supabase.ts — Supabase クライアントの初期化
 *
 * このファイルを通じてデータベース・認証機能を使う。
 * API キーは .env ファイルから読み込む（コードに直接書かない）。
 */

import { createClient } from '@supabase/supabase-js'

// .env ファイルの値を読み込む（VITE_ から始まる変数は自動で使えるようになる）
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

// createClient を呼ぶ前にハッシュを確認する
// （createClient が URL ハッシュを読み取って消してしまうため、先に確認が必要）
// type=invite（招待リンク）または type=recovery（パスワードリセットリンク）の両方を検出する
const _hash = window.location.hash
export const isInviteFlow = _hash.includes('type=invite') || _hash.includes('type=recovery')

// Supabase クライアントを作成してエクスポート
// このオブジェクトを使ってログイン・データ取得などを行う
export const supabase = createClient(supabaseUrl, supabaseKey)
