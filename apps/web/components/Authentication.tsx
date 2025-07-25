"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader, Shield, CheckCircle } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"

interface AuthenticationProps {
  onAuthenticated?: (user: { name: string; email: string }) => void
}

export function Authentication({ onAuthenticated }: AuthenticationProps) {
  const { loginWithGoogle, isLoading, error, handleAuthCallback, clearError } = useAuthStore()
  const [localError, setLocalError] = useState<string | null>(null)

  // Handle OAuth callback on component mount
  useEffect(() => {
    const success = handleAuthCallback()
    if (success) {
      // Callback will be handled by the auth store
    }
  }, [handleAuthCallback])

  // Clear errors when component mounts
  useEffect(() => {
    clearError()
    setLocalError(null)
  }, [clearError])

  const handleGoogleAuth = async () => {
    setLocalError(null)
    clearError()
    
    try {
      await loginWithGoogle()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Authentication failed. Please try again.")
    }
  }

  const displayError = error || localError

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">CS</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Case Study AI</h1>
            <p className="text-muted-foreground mt-2">
              Transform your project data into actionable insights
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-foreground">Connect to Google Workspace</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-foreground">AI-powered case study generation</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-foreground">Real-time collaborative editing</span>
            </div>
          </div>

          {/* Authentication Button */}
          <div className="space-y-4">
            <Button
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            {displayError && (
              <p className="text-sm text-destructive text-center">{displayError}</p>
            )}
          </div>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Your data is encrypted and secure</span>
          </div>
        </div>
      </Card>
    </div>
  )
}