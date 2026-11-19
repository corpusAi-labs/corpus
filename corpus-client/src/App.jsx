import { Routes, Route, Navigate } from 'react-router-dom'
import AuthInit from './components/AuthInit.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import SetPassword from './pages/auth/SetPassword.jsx'
import GoogleCallback from './pages/auth/GoogleCallback.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'
import SpacesPage from './pages/spaces/SpacesPage.jsx'
import SpaceDetailPage from './pages/spaces/SpaceDetailPage.jsx'
import Pricing from './pages/Pricing.jsx'
import DriftPage from './pages/drift/DriftPage.jsx'
import Extension from './pages/Extension.jsx'
import Security from './pages/Security.jsx'
import SettingsPage from './pages/settings/SettingsPage.jsx'

function App() {
  return (
    <AuthInit>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/extension" element={<Extension />} />
        <Route path="/security" element={<Security />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/spaces" element={<ProtectedRoute><SpacesPage /></ProtectedRoute>} />
        <Route path="/spaces/:id" element={<ProtectedRoute><SpaceDetailPage /></ProtectedRoute>} />
        <Route path="/drift" element={<ProtectedRoute><DriftPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthInit>
  )
}

export default App
