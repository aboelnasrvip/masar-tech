import { Moon, Sun } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleTheme } from '@/store/slices/uiSlice'

export function ThemeToggle() {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      className="neuro-raised-xs neuro-hover flex h-11 w-11 items-center justify-center rounded-2xl"
      aria-label={theme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 neuro-accent" />
      ) : (
        <Moon className="h-5 w-5 neuro-accent" />
      )}
    </button>
  )
}
