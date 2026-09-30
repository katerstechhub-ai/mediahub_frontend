import { io } from 'socket.io-client'
import { API_URL } from '../api'

let socket = null
// Listeners live here (not on the socket) so they survive disconnect/reconnect.
const listeners = new Set()

function createSocket() {
  const s = io(API_URL, {
    // function form so reconnects always use the current token
    auth: (cb) => cb({ token: localStorage.getItem('auth_token') }),
    transports: ['websocket', 'polling'],
  })
  s.on('notification:refresh', () => {
    listeners.forEach((fn) => {
      try {
        fn()
      } catch (err) {
        console.error('Notification listener failed:', err)
      }
    })
  })
  s.on('connect_error', (err) => console.warn('Notification socket:', err.message))
  return s
}

export function connectSocket() {
  if (!localStorage.getItem('auth_token')) return null
  if (!socket) socket = createSocket()
  return socket
}

export function getSocket() {
  return connectSocket()
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Calls cb whenever the server says notifications changed. Returns an unsubscribe fn.
export function onNotificationsChanged(cb) {
  listeners.add(cb)
  connectSocket()
  return () => {
    listeners.delete(cb)
  }
}