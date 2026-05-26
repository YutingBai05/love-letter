import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/components/AuthProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGuard } from '@/components/AuthGuard'
import { HomePage } from '@/pages/HomePage'
import { PostcardEditorPage } from '@/pages/PostcardEditorPage'
import { LetterEditorPage } from '@/pages/LetterEditorPage'
import { QAPage } from '@/pages/QAPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
            <Route path="/editor/postcard" element={<AuthGuard><PostcardEditorPage /></AuthGuard>} />
            <Route path="/editor/postcard/:id" element={<AuthGuard><PostcardEditorPage /></AuthGuard>} />
            <Route path="/editor/letter" element={<AuthGuard><LetterEditorPage /></AuthGuard>} />
            <Route path="/editor/letter/:id" element={<AuthGuard><LetterEditorPage /></AuthGuard>} />
            <Route path="/qa" element={<AuthGuard><QAPage /></AuthGuard>} />
            <Route path="/library" element={<AuthGuard><LibraryPage /></AuthGuard>} />
            <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  )
}
