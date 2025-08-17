import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SimpleEnhancedApp from './components/SimpleEnhancedApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SimpleEnhancedApp />
  </StrictMode>,
)
