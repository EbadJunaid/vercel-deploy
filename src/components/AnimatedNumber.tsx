"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface AnimatedNumberProps {
  value: number
  className?: string
  duration?: number
  formatNumber?: boolean
}

export function AnimatedNumber({ 
  value, 
  className = "", 
  duration = 500, 
  formatNumber = true 
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | null>(null)
  const previousValue = useRef(value)
  const displayValueRef = useRef(value)

  const formatValue = useCallback((num: number) => {
    if (!formatNumber) return num.toString()
    return num.toLocaleString()
  }, [formatNumber])

  useEffect(() => {
    // Only animate if value actually changed
    if (previousValue.current === value) return
    
    previousValue.current = value
    setIsAnimating(true)
    
    const startValue = displayValueRef.current
    const difference = value - startValue
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Simple easing function
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.floor(startValue + difference * easeOutCubic)
      
      setDisplayValue(currentValue)
      displayValueRef.current = currentValue

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        displayValueRef.current = value
        setIsAnimating(false)
        animationRef.current = null
      }
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    animationRef.current = requestAnimationFrame(animate)

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [value, duration])

  // Keep displayValue and ref in sync if external value changes while not animating
  useEffect(() => {
    if (!isAnimating) {
      setDisplayValue(value)
      displayValueRef.current = value
    }
  }, [value, isAnimating])

  return (
    <span className={`${className} ${isAnimating ? "text-blue-400 transition-colors duration-200" : ""}`}>
      {formatValue(displayValue)}
    </span>
  )
}