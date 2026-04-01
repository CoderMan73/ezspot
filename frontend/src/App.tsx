import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from "./pages/HomePage"
import UploadPage from "./pages/UploadPage"
import CasPage from "./pages/CasPage"
import GeneratedReportsPage from "./pages/GeneratedReportsPage"
import GlobalUploadStatus from "./components/GlobalUploadStatus"
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cas" element={<CasPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/reports" element={<GeneratedReportsPage />} />
      </Routes>

      <GlobalUploadStatus />
    </BrowserRouter>
  )
}

export default App