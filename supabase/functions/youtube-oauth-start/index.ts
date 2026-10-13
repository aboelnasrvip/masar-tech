const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientId = Deno.env.get('YOUTUBE_CLIENT_ID') ?? ''
  const redirectUri = Deno.env.get('YOUTUBE_REDIRECT_URI') ?? `${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-oauth-callback`

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'YouTube OAuth is not configured' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
  })

  return new Response(JSON.stringify({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
