import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getStoredUser, getStoredToken } from './services/api'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import CandidateDashboard from './pages/CandidateDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import CandidateInterviews from './pages/CandidateInterviews'
import RecruiterInterviews from './pages/RecruiterInterviews'
import CandidateCareerHub from './pages/CandidateCareerHub'
import CandidateResumes from './pages/CandidateResumes'
import RecruiterFinancial from './pages/RecruiterFinancial'
import RecruiterRanking from './pages/RecruiterRanking'
import CareerAdminLogin from './pages/CareerAdminLogin'

function PrivateRoute({ children, allowedRoles }) {
  const token = getStoredToken()
  const user = getStoredUser()
  if (!token || !user) return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirect = user.role === 'RECRUITER' ? '/recruiter' : '/candidate'
    return <Navigate to={redirect} replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="magic-bg" aria-hidden="true">
        <div className="magic-portal" />
      </div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/candidate"
          element={
            <PrivateRoute allowedRoles={['CANDIDATE', 'ADMIN']}>
              <CandidateDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/candidate/interviews"
          element={
            <PrivateRoute allowedRoles={['CANDIDATE', 'ADMIN']}>
              <CandidateInterviews />
            </PrivateRoute>
          }
        />
        <Route
          path="/candidate/career"
          element={
            <PrivateRoute allowedRoles={['CANDIDATE', 'ADMIN']}>
              <CandidateCareerHub />
            </PrivateRoute>
          }
        />
        <Route
          path="/candidate/resumes"
          element={
            <PrivateRoute allowedRoles={['CANDIDATE', 'ADMIN']}>
              <CandidateResumes />
            </PrivateRoute>
          }
        />
        <Route
          path="/recruiter"
          element={
            <PrivateRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <RecruiterDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/recruiter/interviews"
          element={
            <PrivateRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <RecruiterInterviews />
            </PrivateRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/ranking"
          element={
            <PrivateRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <RecruiterRanking />
            </PrivateRoute>
          }
        />
        <Route
          path="/recruiter/financial"
          element={
            <PrivateRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <RecruiterFinancial />
            </PrivateRoute>
          }
        />
        <Route path="/career-admin/login" element={<CareerAdminLogin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
