// hooks/useTokenRefresh.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient' // Import the initialized Supabase client

export function useTokenRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const refreshToken = async () => {
      setIsRefreshing(true)
      try {
        const session = supabase.auth.session() // Get the current session

        if (!session) {
          // If no session exists, redirect to login
          router.push('/login')
          return
        }

        // Refresh session if necessary
        const { error } = await supabase.auth.refreshSession()

        if (error) {
          // If token refresh fails, log out the user
          supabase.auth.signOut()
          router.push('/login')
        } else {
          // Successfully refreshed the token
          console.log('Token refreshed successfully')
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    // Set an interval to refresh token every 10 minutes (adjust as necessary)
    const intervalId = setInterval(refreshToken, 600000) // Refresh every 10 minutes

    // Cleanup the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, [router])

  return isRefreshing
}
