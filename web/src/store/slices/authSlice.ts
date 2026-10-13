import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Session, User } from '@supabase/supabase-js'
import { toArabicAuthError } from '@/lib/auth-errors'
import { setPendingEmail } from '@/lib/pending-email'
import { isEmail, looksLikePhone, normalizeEgPhone } from '@/lib/phone'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export type UserRole = 'student' | 'teacher' | 'admin'

export type Profile = {
  id: string
  full_name: string
  phone: string
  parent_phone: string | null
  city: string | null
  governorate: string | null
  school: string | null
  educational_stage: string | null
  grade: string | null
  role: UserRole
  avatar: string | null
}

type AuthState = {
  status: 'idle' | 'loading' | 'ready'
  session: Session | null
  user: User | null
  profile: Profile | null
  error: string | null
  info: string | null
}

export type SignUpPayload = {
  email: string
  password: string
  fullName: string
  phone: string
  parentPhone: string
  city: string
  governorate: string
  school: string
  educationalStage: string
  grade: string
}

const initialState: AuthState = {
  status: 'idle',
  session: null,
  user: null,
  profile: null,
  error: null,
  info: null,
}

async function loadProfile(userId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

async function signInWithIdentifier(identifier: string, password: string) {
  const supabase = getSupabase()
  const value = identifier.trim()

  if (isEmail(value)) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: value,
      password,
    })
    if (error) throw error
    return data
  }

  if (looksLikePhone(value)) {
    const { data, error } = await supabase.functions.invoke('auth-login', {
      body: {
        identifier: normalizeEgPhone(value),
        password,
      },
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
  if (!session?.user) {
    return { session: null, user: null, profile: null }
  }

  const profile = await loadProfile(session.user.id)
  return { session, user: session.user, profile }
})

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (payload: { identifier: string; password: string }) => {
    if (!isSupabaseConfigured()) {
      throw new Error('SUPABASE_NOT_CONFIGURED')
    }

    const data = await signInWithIdentifier(payload.identifier, payload.password)
    const user = data.user ?? data.session?.user
    if (!user) throw new Error('invalid login credentials')

    const profile = await loadProfile(user.id)
    return { session: data.session, user, profile }
  },
)

export const signUp = createAsyncThunk('auth/signUp', async (payload: SignUpPayload) => {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }

  const supabase = getSupabase()
  const email = payload.email.trim()
  const phone = normalizeEgPhone(payload.phone)
  const parentPhone = normalizeEgPhone(payload.parentPhone)

  const { data: emailTaken } = await supabase.rpc('is_email_registered', {
    p_email: email,
  })
  if (emailTaken) {
    throw new Error('EMAIL_ALREADY_REGISTERED')
  }

  const { data: phoneTaken } = await supabase.rpc('is_phone_registered', {
    p_phone: phone,
  })
  if (phoneTaken) {
    throw new Error('PHONE_ALREADY_REGISTERED')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: payload.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: payload.fullName.trim(),
        phone,
        parent_phone: parentPhone,
        city: payload.city.trim(),
        governorate: payload.governorate,
        school: payload.school.trim(),
        educational_stage: payload.educationalStage,
        grade: payload.grade,
        role: 'student',
      },
    },
  })

  if (error) throw error

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('EMAIL_ALREADY_REGISTERED')
  }

  setPendingEmail(email)

  return {
    needsConfirmation: !data.session,
    email,
  }
})

export const resendConfirmation = createAsyncThunk('auth/resend', async (email: string) => {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }

  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
  return email.trim()
})

export const signOut = createAsyncThunk('auth/signOut', async () => {
  if (!isSupabaseConfigured()) return
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthMessages(state) {
      state.error = null
      state.info = null
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
        state.session = null
        state.user = null
        state.profile = null
      })
      .addCase(signIn.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.info = null
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
      .addCase(signUp.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.info = null
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.status = 'ready'
        state.info = action.payload.needsConfirmation
          ? `بعتنالك رابط تأكيد على ${action.payload.email}. افتح الإيميل عشان تفعّل حسابك.`
          : 'تم إنشاء الحساب بنجاح'
      })
      .addCase(signUp.rejected, (state, action) => {
        state.status = 'ready'
        state.error = toArabicAuthError(action.error.message ?? '')
      })
      .addCase(resendConfirmation.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.info = null
      })
      .addCase(resendConfirmation.fulfilled, (state, action) => {
        state.status = 'ready'
        state.info = `بعتنالك رابط جديد على ${action.payload}. افتح أحدث إيميل.`
      })
      .addCase(resendConfirmation.rejected, (state, action) => {
        state.status = 'ready'
        state.error = toArabicAuthError(action.error.message ?? '')
      })
      .addCase(signOut.fulfilled, (state) => {
        state.session = null
        state.user = null
        state.profile = null
        state.error = null
        state.info = null
        state.status = 'ready'
      })
  },
})

export const { clearAuthMessages } = authSlice.actions
export default authSlice.reducer
