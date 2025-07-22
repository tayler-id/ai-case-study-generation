"use client"

import { useState } from "react"
import { LayoutDashboard, PlusSquare, Settings, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectScopingModal, ProjectScope } from "@/components/ProjectScopingModal"

interface User {
  name: string
  email: string
}

interface SidebarProps {
  onCreateNewStudy: (scope: ProjectScope) => void
  currentView: 'dashboard' | 'study'
  onViewChange: (view: 'dashboard' | 'study') => void
  user: User
  onSignOut: () => void
}

export function Sidebar({ onCreateNewStudy, currentView, onViewChange, user, onSignOut }: SidebarProps) {
  const [showScopingModal, setShowScopingModal] = useState(false)

  const handleCreateNew = () => {
    setShowScopingModal(true)
  }

  const handleScopeSubmit = (scope: ProjectScope) => {
    onCreateNewStudy(scope)
    onViewChange('study')
  }

  return (
    <>
      <div className="w-64 bg-slate-900 text-slate-50 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <span className="font-semibold text-lg">Case Study AI</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${
                currentView === 'dashboard' 
                  ? 'bg-slate-800 text-slate-50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50'
              }`}
              onClick={() => onViewChange('dashboard')}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-400 hover:bg-slate-800 hover:text-slate-50"
              onClick={handleCreateNew}
            >
              <PlusSquare className="w-5 h-5" />
              <span>Create New Study</span>
            </Button>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-50 truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-slate-400 hover:bg-slate-800 hover:text-slate-50"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-slate-400 hover:bg-slate-800 hover:text-slate-50"
              onClick={onSignOut}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      <ProjectScopingModal
        open={showScopingModal}
        onOpenChange={setShowScopingModal}
        onSubmit={handleScopeSubmit}
      />
    </>
  )
}