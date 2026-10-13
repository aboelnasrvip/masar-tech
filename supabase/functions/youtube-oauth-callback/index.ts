import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (request) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const adminRedirect = Deno.env.get('ADMIN_APP_URL') || 'http://localhost:5174/settings'

  if (!code) {
    return Response.redirect(`${adminRedirect}?youtube=error`, 302)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('YOUTUBE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('YOUTUBE_CLIENT_SECRET') ?? '',
      redirect_uri: Deno.env.get('YOUTUBE_REDIRECT_URI') ?? `${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-oauth-callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.refresh_token && !tokens.access_token) {
    return Response.redirect(`${adminRedirect}?youtube=error`, 302)
  }

  let channelTitle = 'YouTube'
  let channelId = ''
  if (tokens.access_token) {
    const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const channelJson = await channelRes.json()
    channelId = channelJson.items?.[0]?.id ?? ''
    channelTitle = channelJson.items?.[0]?.snippet?.title ?? 'YouTube'
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  await admin.from('youtube_connections').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('youtube_connections').insert({
    channel_id: channelId,
    channel_title: channelTitle,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
  })

  return Response.redirect(`${adminRedirect}?youtube=connected`, 302)
})
