import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { StudentLayout } from '@/layouts/StudentLayout'
import { AccountPage } from '@/pages/AccountPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { ConfirmEmailPage } from '@/pages/ConfirmEmailPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
// import { CommunityPage } from '@/pages/CommunityPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { ExamsPage } from '@/pages/ExamsPage'
import { ExamTakePage } from '@/pages/ExamTakePage'
import { LandingPage } from '@/pages/LandingPage'
import { LearnPage } from '@/pages/LearnPage'
import { LessonPage } from '@/pages/LessonPage'
import { LivePage } from '@/pages/LivePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ProgressPage } from '@/pages/ProgressPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TermDetailPage } from '@/pages/TermDetailPage'
import { MonthDetailPage } from '@/pages/MonthDetailPage'
import { WalletPage } from '@/pages/WalletPage'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { initSession } from '@/store/slices/authSlice'

export default function App() {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)

  useEffect(() => {
    void dispatch(initSession())
  }, [dispatch])

  useEffect(() => {
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="neuro-bg min-h-svh">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<StudentLayout />}>
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/courses" element={<CatalogPage />} />
            <Route path="/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/courses/:slug/terms/:termId" element={<TermDetailPage />} />
            <Route path="/courses/:slug/terms/:termId/months/:monthId" element={<MonthDetailPage />} />
            <Route path="/checkout/:planId" element={<CheckoutPage />} />
            <Route path="/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/exams/:examId" element={<ExamTakePage />} />
            <Route path="/wallet" element={<WalletPage />} />
            {/* <Route path="/community" element={<CommunityPage />} /> */}
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
