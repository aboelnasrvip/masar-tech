import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeEgPhone(input: string) {
  const digits = input.replace(/\D/g, '')

  if (digits.startsWith('20') && digits.length >= 12) return digits.slice(0, 12)
  if (digits.startsWith('0') && digits.length === 11) return `20${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('1')) return `20${digits}`

  return digits
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return json({ error: 'invalid login credentials' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const anon = createClient(supabaseUrl, anonKey)

    let email = String(identifier).trim()

    if (!email.includes('@')) {
      const phone = normalizeEgPhone(email)
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()

      if (profileError || !profile) {
        return json({ error: 'phone not found' }, 401)
      }

      const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id)
      if (userError || !userData.user?.email) {
        return json({ error: 'phone not found' }, 401)
      }

      email = userData.user.email
    }

    const { data, error } = await anon.auth.signInWithPassword({ email, password })
    if (error) {
      return json({ error: error.message }, 401)
    }

    return json({ session: data.session, user: data.user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unexpected error'
    return json({ error: message }, 500)
  }
})
