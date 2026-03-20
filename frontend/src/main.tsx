import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ProfileProvider } from './context/ProfileContext'
import AuthGate from './components/Auth/AuthGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)
