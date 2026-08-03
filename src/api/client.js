import axios from 'axios'

// Point this at your .NET Web API. Set VITE_API_BASE_URL in a .env file
// (see .env.example). Falls back to a typical local Kestrel dev port.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:5001/api'

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the JWT (issued by the .NET auth endpoint) to every request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('spacebook_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Central 401 handling — bounce to login if the token is invalid/expired.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('spacebook_token')
      localStorage.removeItem('spacebook_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
