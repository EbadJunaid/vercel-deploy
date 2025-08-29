"use client"

import { useState, useEffect } from "react"
import { Search, Sun, Moon, Menu, Command } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SearchModal } from "./SearchModal"
import { MobileMenu } from "./MobileMenu"

export function Header() {
  const [isDark, setIsDark] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
      document.body.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
      document.body.classList.remove("dark")
    }
  }, [isDark])

  return (
    <>
      {/* <header className="bg-transparent backdrop-blur-sm border-b border-gray-700/20 px-4 md:px-6 py-4 relative z-50"> */}
        <header className="bg-transparent px-4 md:px-6 py-4 ">

        <div className="flex items-center justify-between ">
          <div className="flex items-center space-x-4 md:space-x-8  w-full">
            <div className="flex items-center space-x-2 ">
              {/* Replace this div with your custom logo */}
              <div className="w-6 h-6 md:w-8 md:h-8  flex items-center justify-center shadow-lg">
               <Image src="/images.svg" alt="Logo" width={32} height={32} className="w-full h-full" />
                {/* <span className="text-white font-bold text-xs md:text-sm">IC</span> */}
              </div>
              <span className="text-white font-semibold text-sm md:text-base">DASHBOARD</span>
            </div>
          
            <nav className="hidden lg:flex items-right justify-end mr-10 lg:w-full space-x-6 ">
              <a href="#" className="text-white hover:text-indigo-400 transition-colors text-sm">
                Network
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Governance
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                DAOs
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Chain Fusion
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Tokens
              </a>
            </nav>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center pl-10 pr-4 py-2 bg-gray-800/60 backdrop-blur-sm border border-gray-600/50 text-gray-400 placeholder-gray-400 rounded-xl w-48 lg:w-64 text-left hover:border-gray-500/50 transition-all duration-200 hover:bg-gray-700/60"
              >
                Search
                <span className="ml-auto text-xs bg-gray-700/80 px-2 py-1 rounded-lg flex items-center">
                  <Command className="w-3 h-3 mr-1" />K
                </span>
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="hidden lg:flex text-gray-400 hover:text-white"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isDark={isDark}
        onThemeToggle={() => setIsDark(!isDark)}
      />
    </>
  )
}
