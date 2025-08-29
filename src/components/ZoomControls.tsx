"use client"

import { Plus, Minus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom?: () => void
}

export function ZoomControls({ onZoomIn, onZoomOut, onResetZoom }: ZoomControlsProps) {
  const handleZoomIn = () => {
    onZoomIn()
  }

  const handleZoomOut = () => {
    onZoomOut()
  }

  const handleResetZoom = () => {
    if (onResetZoom) {
      onResetZoom()
    }
  }

  return (
    <div className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2 z-10">
      {/* Zoom In Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomIn}
        className="bg-gray-800/90 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 w-8 h-8 md:w-10 md:h-10 transition-all duration-200 backdrop-blur-sm"
        title="Zoom In"
      >
        <Plus className="w-3 h-3 md:w-4 md:h-4" />
      </Button>
      
      {/* Zoom Out Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomOut}
        className="bg-gray-800/90 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 w-8 h-8 md:w-10 md:h-10 transition-all duration-200 backdrop-blur-sm"
        title="Zoom Out"
      >
        <Minus className="w-3 h-3 md:w-4 md:h-4" />
      </Button>
      
      {/* Reset Zoom Button */}
      {onResetZoom && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleResetZoom}
          className="bg-gray-800/90 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 w-8 h-8 md:w-10 md:h-10 transition-all duration-200 backdrop-blur-sm"
          title="Reset Zoom"
        >
          <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
        </Button>
      )}
      

    </div>
  )
}