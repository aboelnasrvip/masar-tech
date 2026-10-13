import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = request.headers.get('Authorization') ?? ''
  const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { path, title, description } = await request.json()
  const { data: file, error: fileError } = await admin.storage.from('course-resources').download(path)
  if (fileError || !file) {
    return new Response(JSON.stringify({ error: fileError?.message ?? 'file missing' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: connection } = await admin.from('youtube_connections').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!connection?.refresh_token) {
    return new Response(JSON.stringify({ error: 'not_connected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('YOUTUBE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('YOUTUBE_CLIENT_SECRET') ?? '',
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const tokens = await tokenRes.json()
  if (!tokens.access_token) {
    return new Response(JSON.stringify({ error: 'token_refresh_failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': file.type || 'video/mp4',
      'X-Upload-Content-Length': String(file.size),
    },
    body: JSON.stringify({
      snippet: { title: title || 'درس مسار تك', description: description || '' },
      status: { privacyStatus: 'unlisted' },
    }),
  })

  const location = start.headers.get('Location')
  if (!location) {
    return new Response(JSON.stringify({ error: 'upload_session_failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const uploaded = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'video/mp4' },
    body: file,
  })
  const video = await uploaded.json()
  if (!video.id) {
    return new Response(JSON.stringify({ error: video.error?.message ?? 'upload_failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ video_id: video.id, title: video.snippet?.title, thumbnail: video.snippet?.thumbnails?.high?.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
