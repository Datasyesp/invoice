import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken')
      const uid = localStorage.getItem('userId')

      setIsAuthenticated(!!token && !!uid)
      setUserId(uid)

      // redirect logic
      if (!token || !uid) {
        if (pathname !== '/login') router.push('/login')
      } else {
        if (pathname === '/login') router.push(`/${uid}/home`)
      }
    }
  }, [pathname, router])

  return {
    isAuthenticated,
    userId,
  }
}
