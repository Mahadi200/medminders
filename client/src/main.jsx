import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './RootApp.jsx'
import logo from './assets/brand/medminders-logo.png'

const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = logo
document.head.appendChild(favicon)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
