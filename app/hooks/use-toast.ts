// This is a simplified version of the toast hook from shadcn/ui
import { useState, useEffect, useCallback } from "react"

export type ToastVariant = "default" | "destructive"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

interface ToastActionType {
  toast: (props: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const TOAST_TIMEOUT = 5000

export function useToast(): ToastActionType {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast = { id, title, description, variant }
      
      setToasts((prevToasts) => [...prevToasts, newToast])
      
      // Show notification using browser API
      if (typeof window !== "undefined") {
        const toastElement = document.createElement("div")
        toastElement.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg ${
          variant === "destructive" ? "bg-red-500" : "bg-green-500"
        } text-white z-50 animate-in fade-in slide-in-from-top-5`
        
        const titleElement = document.createElement("div")
        titleElement.className = "font-medium"
        titleElement.textContent = title || ""
        
        const descriptionElement = document.createElement("div")
        descriptionElement.className = "text-sm opacity-90"
        descriptionElement.textContent = description || ""
        
        toastElement.appendChild(titleElement)
        toastElement.appendChild(descriptionElement)
        document.body.appendChild(toastElement)
        
        setTimeout(() => {
          toastElement.classList.add("animate-out", "fade-out", "slide-out-to-right-5")
          setTimeout(() => {
            document.body.removeChild(toastElement)
            dismiss(id)
          }, 300)
        }, TOAST_TIMEOUT)
      }
      
      return id
    },
    [dismiss]
  )

  return {
    toast,
    dismiss,
  }
}
