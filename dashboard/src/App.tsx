import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { ExamsAdminPage } from '@/pages/ExamsAdminPage'
// import { CommunityAdminPage } from '@/pages/CommunityAdminPage'
import { CourseEditorPage } from '@/pages/CourseEditorPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { LessonEditorPage } from '@/pages/LessonEditorPage'
import { LiveSessionsPage } from '@/pages/LiveSessionsPage'
import { LoginPage } from '@/pages/LoginPage'
import { MessagesPage } from '@/pages/MessagesPage'
import { MonthEditorPage } from '@/pages/MonthEditorPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { SecurityEventsPage } from '@/pages/SecurityEventsPage'
import { SecurityStudentPage } from '@/pages/SecurityStudentPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StudentsPage } from '@/pages/StudentsPage'
import { TermEditorPage } from '@/pages/TermEditorPage'
import { WalletPage } from '@/pages/WalletPage'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { initSession } from '@/store/slices/authSlice'

export default function App() {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)
  const { status, user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    void dispatch(initSession())
  }, [dispatch])

  useEffect(() => {
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="neuro-bg flex min-h-svh items-center justify-center">
        <div className="neuro-raised-sm rounded-3xl px-6 py-4">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="neuro-bg min-h-svh">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<CourseEditorPage />} />
          <Route path="/courses/:courseId/terms/:termId" element={<TermEditorPage />} />
          <Route path="/courses/:courseId/terms/:termId/months/:monthId" element={<MonthEditorPage />} />
          <Route path="/lessons/:lessonId" element={<LessonEditorPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/exams" element={<ExamsAdminPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          {/* <Route path="/community" element={<CommunityAdminPage />} /> */}
          <Route path="/live" element={<LiveSessionsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/security" element={<SecurityEventsPage />} />
          <Route path="/security/:studentId" element={<SecurityStudentPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </div>
  )
}
