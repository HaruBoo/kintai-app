/**
 * delete-user — ユーザーを削除する Edge Function
 *
 * ブラウザから呼び出すと、このサーバー側の関数が
 * service_role_key を使って安全にユーザーを削除する。
 *
 * 受け取るデータ（JSON）:
 *   userId : 削除するユーザーの ID
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS ヘッダー（ブラウザからの呼び出しを許可する設定）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // ブラウザが事前に送る「確認リクエスト」に応答する（CORS対応）
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // リクエストから削除対象のユーザーIDを取り出す
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId は必須です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // service_role_key を使った管理者用クライアントを作成
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 呼び出し元のユーザーが管理者かチェックする
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '認証情報がありません' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // トークンからログイン中のユーザーを取得
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)

    if (!caller) {
      return new Response(
        JSON.stringify({ error: 'ログインしていません' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 呼び出し元が管理者かどうか確認する
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: '管理者のみ実行できます' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 自分自身は削除できないようにする
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: '自分自身は削除できません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ユーザーを削除する（profiles テーブルも cascade で自動削除される）
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ message: 'ユーザーを削除しました' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (_e) {
    return new Response(
      JSON.stringify({ error: '予期しないエラーが発生しました' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
