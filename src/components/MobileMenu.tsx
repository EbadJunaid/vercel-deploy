"use client"

import { X, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onThemeToggle: () => void
}

export function MobileMenu({ isOpen, onClose, isDark, onThemeToggle }: MobileMenuProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden">
      <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <span className="text-white font-semibold">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-4">
          <a href="#" className="block text-white hover:text-purple-400 transition-colors py-2">
            Network
          </a>
          <a href="#" className="block text-gray-400 hover:text-white transition-colors py-2">
            Governance
          </a>
          <a href="#" className="block text-gray-400 hover:text-white transition-colors py-2">
            DAOs
          </a>
          <a href="#" className="block text-gray-400 hover:text-white transition-colors py-2">
            Chain Fusion
          </a>
          <a href="#" className="block text-gray-400 hover:text-white transition-colors py-2">
            Tokens
          </a>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Theme</span>
              <Button variant="ghost" size="icon" onClick={onThemeToggle} className="text-gray-400 hover:text-white">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}
