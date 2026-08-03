import client from './client'

// Expected .NET endpoint: POST /api/auth/login
// Body: { email, password }
// Response: { token, user: { id, name, email, department, role } }
export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password })
  return data
}

// Expected .NET endpoint: POST /api/auth/logout  (optional, for token revocation)
export async function logout() {
  try {
    await client.post('/auth/logout')
  } catch {
    // non-fatal — clear local session regardless
  }
}

// Expected .NET endpoint: GET /api/auth/me
export async function getCurrentUser() {
  const { data } = await client.get('/auth/me')
  return data
}
