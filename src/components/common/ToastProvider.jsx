import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

function ToastContainer({ toasts }) {
  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className={`rounded-2xl border p-4 shadow-xl transition-transform ${toast.type === 'error' ? 'border-clay bg-red-50 text-clay' : toast.type === 'success' ? 'border-moss bg-green-50 text-moss' : 'border-line bg-white text-ink'}`}>
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.message && <p className="mt-1 text-sm opacity-90">{toast.message}</p>}
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const nextToast = { id, title: toast.title || '', message: toast.message || '', type: toast.type || 'default' }
    setToasts((current) => [nextToast, ...current])
    window.setTimeout(() => removeToast(id), toast.duration || 4000)
  }, [removeToast])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
