import axios from 'axios'

export const api = axios.create({
  baseURL: "",
  withCredentials: true,
  timeout: 30000,
})

// Request Interceptor: แนบ access token
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor: ถ้าได้ 401 ให้ส่งคำขอ refresh token อัตโนมัติ
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const isRefreshEndpoint = originalRequest.url?.includes('/api/auth/refresh')
    // Wrong password / invalid credentials return 401 — must not trigger refresh + hard redirect to /login
    const isCredentialEndpoint =
      originalRequest.url?.includes('/api/auth/login') ||
      originalRequest.url?.includes('/api/auth/register')
    // Wrong current password returns 401 — not an expired session
    const isChangePasswordEndpoint = originalRequest.url?.includes('/api/auth/change-password')

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshEndpoint &&
      !isCredentialEndpoint &&
      !isChangePasswordEndpoint
    ) {
      originalRequest._retry = true

      if (isRefreshing) {
        // ถ้าระบบกำลังขอ token ใหม่อยู่ ให้ Request อื่นๆ มารอจ่าย token ใหม่ก่อน
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const { data } = await api.post('/api/auth/refresh')
        const newToken = data.data.accessToken
        setAccessToken(newToken)

        // เคลียร์คิวให้ Request ที่รออยู่
        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []

        // รัน Request เก่าซ้ำด้วย Token ใหม่
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // ถ้าขอ Token ใหม่ไม่ได้ (Refresh Token ก็ดันหมดอายุอีก) -> บังคับเด้งไปหน้า Lock Screen (หรือ Logout)
        clearAccessToken()
        refreshQueue = []
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// Access token: memory only (reduces XSS exfiltration via localStorage). Session uses httpOnly refresh cookie.
let _accessToken: string | null = null

export function setAccessToken(token: string) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function clearAccessToken() {
  _accessToken = null
}
