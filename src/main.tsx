import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import Submit from './pages/Submit'
import Manager from './pages/Manager'
createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><Routes>
    <Route path="/submit" element={<Submit />} />
    <Route path="/manager/*" element={<Manager />} />
    <Route path="*" element={<Navigate to="/submit" replace />} />
  </Routes></BrowserRouter></StrictMode>)
