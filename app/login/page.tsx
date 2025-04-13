"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { FileText, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabaseClient"
import { v4 as uuidv4 } from "uuid"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          const tenantId = session.user.user_metadata?.tenant_id
          if (tenantId && window.location.pathname === "/login") {
            router.push(`/${tenantId}/home`)
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      }
    }

    checkAuthAndRedirect()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else if (data.session) {
        const tenantId = data.user.user_metadata?.tenant_id
        setSuccess("Login successful. Redirecting...")
        setTimeout(() => {
          router.push(`/${tenantId}/home`)
        }, 2000)
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    }

    setIsLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const tenantId = uuidv4() // Generate unique tenant_id (can be improved later)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            tenant_id: tenantId,
          },
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess("Registration successful. Please check your email to confirm your account.")
        setTimeout(() => {
          setIsLogin(true)
        }, 3000)
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-8 p-8">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl ml-2">Yesp Accounts</CardTitle>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </h2>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}
          <form className="space-y-6" onSubmit={isLogin ? handleLogin : handleRegister}>
            {!isLogin && (
              <div>
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className="mt-1"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="email-address">Email address</Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full flex justify-center py-2 px-4"
              disabled={isLoading || success !== ""}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  {isLogin ? "Signing in..." : "Registering..."}
                </>
              ) : (
                <span>{isLogin ? "Sign in" : "Register"}</span>
              )}
            </Button>
          </form>
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
                setSuccess("")
              }}
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              {isLogin ? "Need an account? Register" : "Already have an account? Sign in"}
            </Button>
          </div>
          
        </CardContent>
      </Card>
    </div>
  )
}
