import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export default function useSocket(token) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setIsConnected(false)
      return undefined
    }

    const apiUrl = import.meta.env.VITE_API_URL
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (apiUrl && /^https?:\/\//i.test(apiUrl) ? new URL(apiUrl).origin : import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message)
      setIsConnected(false)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [token])

  return {
    socket: socketRef.current,
    isConnected,
  }
}
