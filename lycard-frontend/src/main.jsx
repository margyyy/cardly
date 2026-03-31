import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import ComingSoon from './ComingSoon.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ComingSoon>
          <App />
        </ComingSoon>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
