import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'masar-admin-theme'

function readTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem(THEME_KEY)
  return saved === 'light' ? 'light' : 'dark'
}

type UiState = {
  theme: ThemeMode
  sidebarOpen: boolean
}

const initialState: UiState = {
  theme: readTheme(),
  sidebarOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload
      window.localStorage.setItem(THEME_KEY, action.payload)
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(THEME_KEY, state.theme)
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
  },
})

export const { setTheme, toggleTheme, setSidebarOpen } = uiSlice.actions
export default uiSlice.reducer
