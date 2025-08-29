"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl mx-4 shadow-2xl">
        <div className="flex items-center p-4 border-b border-gray-700">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <Input
            placeholder="Search networks, nodes, subnets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0"
            autoFocus
          />
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-400 mb-2">Quick Actions</div>
          <div className="space-y-2">
            <div className="p-2 hover:bg-gray-800 rounded cursor-pointer text-white">View Network Statistics</div>
            <div className="p-2 hover:bg-gray-800 rounded cursor-pointer text-white">Browse Data Centers</div>
            <div className="p-2 hover:bg-gray-800 rounded cursor-pointer text-white">Subnet Information</div>
          </div>
        </div>
      </div>
    </div>
  )
}
