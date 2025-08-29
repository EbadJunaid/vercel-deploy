"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface HelpTooltipProps {
  content: string
  className?: string
}

export function HelpTooltip({ content, className = "" }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, placement: "top" as "top" | "bottom" })
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isVisible && buttonRef.current && mounted) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const tooltipWidth = isMobile ? 200 : 256
      const tooltipHeight = 80

      let left = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2
      let top = buttonRect.top - tooltipHeight - 8
      let placement: "top" | "bottom" = "top"

      // Adjust horizontal position if tooltip would overflow
      if (left < 8) {
        left = 8
      } else if (left + tooltipWidth > windowWidth - 8) {
        left = windowWidth - tooltipWidth - 8
      }

      // If tooltip would overflow at top, show it below
      if (top < 8) {
        top = buttonRect.bottom + 8
        placement = "bottom"
      }

      setPosition({ top, left, placement })
    }
  }, [isVisible, mounted, isMobile])

  useEffect(() => {
    if (isMobile && isVisible) {
      const handleClickOutside = (e: MouseEvent) => {
        if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
          setIsVisible(false)
        }
      }
      
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isMobile, isVisible])

  const handleClick = (e: React.MouseEvent) => {
    if (isMobile) {
      e.stopPropagation()
      setIsVisible(!isVisible)
    }
  }

  const handleMouseEnter = () => {
    if (!isMobile) setIsVisible(true)
  }

  const handleMouseLeave = () => {
    if (!isMobile) setIsVisible(false)
  }

  const tooltipContent = isVisible && mounted ? (
    <div
      className={`
        fixed z-[99999] px-3 py-2 bg-slate-900/98 backdrop-blur-md border border-slate-600 rounded-lg shadow-2xl text-sm text-white
        transition-opacity duration-200 pointer-events-auto
        ${isMobile ? 'w-48 sm:w-56 max-w-[calc(100vw-16px)]' : 'w-64 max-w-[280px]'}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="text-gray-100 leading-relaxed">
        {content}
      </div>
      
      {/* Arrow for desktop */}
      {!isMobile && (
        <div
          className={`
            absolute w-2 h-2 bg-slate-900 border border-slate-600 transform rotate-45
            ${position.placement === "top" 
              ? "top-full -mt-[5px] border-t-0 border-l-0" 
              : "bottom-full -mb-[5px] border-b-0 border-r-0"
            }
          `}
          style={{
            left: "50%",
            transform: `translateX(-50%) rotate(45deg)`,
          }}
        />
      )}
    </div>
  ) : null

  if (!mounted) return null

  return (
    <>
      <div
        ref={buttonRef}
        className={`w-4 h-4 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center cursor-help hover:bg-slate-500 transition-colors ${className}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        ?
      </div>
      
      {/* Portal the tooltip to document.body */}
      {tooltipContent && createPortal(tooltipContent, document.body)}
      
      {/* Mobile backdrop to close tooltip */}
      {isVisible && isMobile && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[99998] bg-transparent" 
          onClick={() => setIsVisible(false)}
        />,
        document.body
      )}
    </>
  )
}