import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Session, User } from '@supabase/supabase-js'
import { toArabicAuthError } from '@/lib/auth-errors'
import { isEmail, looksLikePhone, normalizeEgPhone } from '@/lib/phone'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export type UserRole = 'student' | 'teacher' | 'admin'

export type Profile = {
  id: string
  full_name: string
  phone: string
  role: UserRole
  avatar: string | null
}

type AuthState = {
  status: 'idle' | 'loading' | 'ready'
  session: Session | null
  user: User | null
  profile: Profile | null
  error: string | null
}

const initialState: AuthState = {
  status: 'idle',
  session: null,
  user: null,
  profile: null,
  error: null,
}

function assertStaff(profile: Profile | null) {
  if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
    throw new Error('FORBIDDEN_ROLE')
  }
}

async function loadProfile(userId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('profiles').select('id, full_name, phone, role, avatar').eq('id', userId).maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

async function signInWithIdentifier(identifier: string, password: string) {
  const supabase = getSupabase()
  const value = identifier.trim()

  if (isEmail(value)) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: value, password })
    if (error) throw error
    return data
  }

  if (looksLikePhone(value)) {
    const { data, error } = await supabase.functions.invoke('auth-login', {
      body: { identifier: normalizeEgPhone(value), password },
    })
    if (error) throw error
    if (data?.error) throw new Error(String(data.error))
    if (data?.session) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      if (sessionError) throw sessionError
      return data
    }
  }

  throw new Error('invalid login credentials')
}

export const initSession = createAsyncThunk('auth/init', async () => {
  if (!isSupabaseConfigured()) {
    return { session: null, user: null, profile: null }
  }

  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session?.user) return { session: null, user: null, profile: null }

  const profile = await loadProfile(session.user.id)
  if (profile && profile.role !== 'admin' && profile.role !== 'teacher') {
    await supabase.auth.signOut()
    return { session: null, user: null, profile: null }
  }

  return { session, user: session.user, profile }
})

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (payload: { identifier: string; password: string }) => {
    if (!isSupabaseConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED')

    const data = await signInWithIdentifier(payload.identifier, payload.password)
    const user = data.user ?? data.session?.user
    if (!user) throw new Error('invalid login credentials')

    const profile = await loadProfile(user.id)
    try {
      assertStaff(profile)
    } catch (error) {
      await getSupabase().auth.signOut()
      throw error
    }

    return { session: data.session, user, profile }
  },
)

export const signOut = createAsyncThunk('auth/signOut', async () => {
  if (!isSupabaseConfigured()) return
  const { error } = await getSupabase().auth.signOut()
  if (error) throw error
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initSession.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(initSession.fulfilled, (state, action) => {
        state.status = 'ready'
        state.session = action.payload.session
        state.user = action.payload.user
        state.profile = action.payload.profile
      })
      .addCase(initSession.rejected, (state) => {
        state.status = 'ready'
      })
      .addCase(signIn.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = 'ready'
        state.session = action.payload.session
        state.user = action.payload.user
        state.profile = action.payload.profile
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'ready'
        state.error = toArabicAuthError(action.error.message ?? '')
      })
      .addCase(signOut.fulfilled, (state) => {
        state.status = 'ready'
        state.session = null
        state.user = null
        state.profile = null
        state.error = null
      })
  },
})

export const { clearAuthError } = authSlice.actions
export default authSlice.reducer
