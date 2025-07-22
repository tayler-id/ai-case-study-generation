"use client"

import { useState } from "react"
import { Authentication } from "@/components/Authentication"
import { CaseStudyGenerator } from "@/components/CaseStudyGenerator"
import { useAuthStore } from "@/stores/useAuthStore"
import { User } from "@case-study/shared"

export default function CaseStudyPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore()

  const handleAuthenticated = (authenticatedUser: User) => {
    console.log('User authenticated:', authenticatedUser)
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show authentication screen if user is not logged in
  if (!isAuthenticated || !user) {
    return <Authentication onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <CaseStudyGenerator />
      </div>
    </div>
  )
}