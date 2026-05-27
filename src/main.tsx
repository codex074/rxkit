import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { AppRouter } from './routes/AppRouter'
import './styles/index.css'
import './styles/print.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  </StrictMode>,
)
