import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 
import { initThemeListener } from './store'
import { warmBackend } from './lib/perf'

// Starts watching the OS's prefers-color-scheme setting so the site updates
// live whenever the phone/computer switches light/dark while the tab is
// already open and theme is set to 'system' — without this, the theme only
// ever gets checked once, on load.
initThemeListener()

// Wakes the Render backend right now, while the app is still booting, instead
// of waiting for the first real request to hit a sleeping server.
warmBackend()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)