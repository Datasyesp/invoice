"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  FileText,
  Search,
  Wifi,
  WifiOff,
  Package,
  Users,
  BarChart,
  LayoutDashboard,
  Settings,
  Bell,
  Zap,
  Sun,
  Moon,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabaseClient"

// Import your components
import { Dashboard } from "./components/dashboard"
import { Products } from "./components/products"
import { Invoice } from "./components/invoice"
import { Customers } from "./components/customers"
import { Reports } from "./components/reports"

import { Subscription } from "./components/subscription"
import UserSettings from "./components/Settings" // Assuming the file is saved as user-settings.tsx

export default function DashboardLayout({
  children,
  userId,
}: {
  children: React.ReactNode
  userId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState("dashboard") // Default to dashboard
  const [searchQuery, setSearchQuery] = useState("")
  const [isOnline, setIsOnline] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const { theme, setTheme } = useTheme()

  // Check authentication with Supabase
  const checkAuth = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      } else {
        // Check for tenant_id in user metadata
        const tenantId = session.user.user_metadata?.tenant_id

        // If user is logged in but accessing wrong tenant ID
        if (tenantId && tenantId !== userId && pathname.includes("/home")) {
          router.push(`/${tenantId}/home`)
          return
        }

        setUser(session.user)
      }
    } catch (error) {
      console.error("Error checking auth:", error)
      router.push("/login")
    }
  }, [router, userId, pathname])

  useEffect(() => {
    checkAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login")
      } else {
        const tenantId = session.user.user_metadata?.tenant_id
        if (tenantId && pathname === "/login") {
          router.push(`/${tenantId}/home`)
        }
        setUser(session.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkAuth, pathname, router])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const pathParts = pathname.split("/")
    const currentTab = pathParts[pathParts.length - 1]
    setActiveTab(currentTab === "home" ? "dashboard" : currentTab)
  }, [pathname])

  const renderContent = useMemo(() => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />
      case "products":
        return <Products />
      case "invoice":
        return <Invoice />
      case "customers":
        return <Customers />
      case "reports":
        return <Reports />
      case "setting":
        return <UserSettings />
      case "subscription":
        return <Subscription />
      default:
        return children // Default to the children prop
    }
  }, [activeTab, children])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isOnline={isOnline}
          company={{ name: "Yesp Invoice" }}
          user={user}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-800">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
      <div className="text-center">
        <motion.div
          className="relative w-24 h-24 mx-auto mb-8"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          <motion.div
            className="absolute inset-0 border-t-4 border-navy-600 dark:border-navy-400 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* <FileText className="h-12 w-12 text-navy-600 dark:text-navy-400" /> */}
          </motion.div>
        </motion.div>
        <motion.h2
          className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Refreshing Your Invoice Dashboard
        </motion.h2>
        <motion.p
          className="text-lg text-gray-600 dark:text-gray-400 mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Updating your personalized experience...
        </motion.p>
        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 bg-navy-600 dark:bg-navy-400 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1, 0] }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                delay: index * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Sidebar({
  activeTab,
  setActiveTab,
  userId,
}: { activeTab: string; setActiveTab: (tab: string) => void; userId: string }) {
  return (
    <div className="flex h-screen w-16 flex-col items-center space-y-8 bg-[#212b36] py-4">
      <TooltipProvider>
        <div className="flex flex-col items-center space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl bg-gray-900 p-0 shadow-lg shadow-indigo-500/50"
              >
                <FileText className="h-5 w-5 text-white" />
                <span className="sr-only">Yesp Invoice</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Yesp Invoice</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <nav className="flex flex-1 flex-col items-center space-y-2">
          <SidebarButton
            icon={LayoutDashboard}
            label="Dashboard"
            tab="dashboard"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userId={userId}
          />
          <SidebarButton
            icon={Package}
            label="Items"
            tab="products"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userId={userId}
          />
          <SidebarButton
            icon={FileText}
            label="Invoices"
            tab="invoice"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userId={userId}
          />
          <SidebarButton
            icon={Users}
            label="Customers"
            tab="customers"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userId={userId}
          />
          <SidebarButton
            icon={BarChart}
            label="Reports"
            tab="reports"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userId={userId}
          />
          <SidebarButton
            icon={Settings}
            label="Settings"
            tab="setting"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userId={userId}
          />
        </nav>
        <div className="mt-auto pb-4">
          <SidebarButton
            icon={Zap}
            label="Subscription"
            tab="subscription"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userId={userId}
          />
        </div>
      </TooltipProvider>
    </div>
  )
}

function SidebarButton({
  icon: Icon,
  label,
  tab,
  activeTab,
  setActiveTab,
  userId,
}: {
  icon: React.ElementType
  label: string
  tab: string
  activeTab: string
  setActiveTab: (tab: string) => void
  userId: string
}) {
  const router = useRouter()

  const handleClick = () => {
    setActiveTab(tab)
    if (userId) {
      // Ensure we're using the tenant ID from the URL for consistent routing
      router.push(`/${userId}/${tab === "dashboard" ? "home" : tab}`)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-lg ${
            activeTab === tab ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
          onClick={handleClick}
        >
          <Icon className="h-5 w-5" />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function Navbar({
  searchQuery,
  setSearchQuery,
  isOnline,
  company,
  user,
}: {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isOnline: boolean
  company: { name: string; logo?: string }
  user: any
}) {
  const [notifications, setNotifications] = React.useState([
    { type: "new_invoice", message: "New invoice created: #INV-001" },
  ])
  const { theme, setTheme } = useTheme()

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center flex-1">
          <h1 className="text-xl font-semibold mr-4 dark:text-white">{company.name}</h1>
      
        </div>
        <div className="flex items-center space-x-4">
       
          
          {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}

          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}

function UserMenu({ user }: { user: any }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const tenantId = user?.user_metadata?.tenant_id
  const fullName = user?.user_metadata?.full_name

  if (isLoggingOut) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mb-4"
          />
          <p className="text-lg font-semibold dark:text-white">Logging out...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we securely log you out.</p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt={user?.email || "User"} />
            <AvatarFallback>{user?.email ? user.email.charAt(0).toUpperCase() : "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email || "user@example.com"}</p>
            {tenantId && (
              <p className="text-xs leading-none text-muted-foreground mt-1">
                Tenant ID: {tenantId.substring(0, 8)}...
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-red-500 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
