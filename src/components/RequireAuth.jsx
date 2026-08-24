import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ children, allowedRoles }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'Admin' ? '/admin/reports' : '/dashboard'} replace />
  }
  return children
}
