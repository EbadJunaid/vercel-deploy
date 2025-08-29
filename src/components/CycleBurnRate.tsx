"use client"

import { useMemo } from "react"
import { HelpTooltip } from "./HelpTooltip"

interface CycleBurnRateProps {
  tcyclesPerSecond: number
  loading?: boolean
}

export function CycleBurnRate({ tcyclesPerSecond, loading = false }: CycleBurnRateProps) {
  // Use useMemo to prevent unnecessary re-calculations and potential infinite loops
  const formattedValue = useMemo(() => {
    return tcyclesPerSecond > 0 ? tcyclesPerSecond.toFixed(6) : "0.000000"
  }, [tcyclesPerSecond])
  
  return (
    //<div className="bg-transparent backdrop-blur-sm border border-slate-600/50 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 md:p-4 text-white w-full shadow-2xl">
      <div className="bg-transparent w-full rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 md:p-4">

      <div className="flex items-start mb-2 sm:mb-3 gap-2">
        {/* CHANGED: Help icon now directly after the title text */}
        <div className="flex jusity-center items-center gap-1">
          <h3 className="text-xs sm:text-sm md:text-base font-medium text-slate-300 leading-tight mr-3">
            Cycle Burn Rate 
           
          </h3>
          <HelpTooltip content="The rate at which cycles are consumed by the Internet Computer network for computation and storage, measured in TCYCLES per second." />
        </div>
      </div>
      
      <div className="space-y-1 sm:space-y-2">
        <div className="flex items-baseline space-x-1 sm:space-x-2 flex-wrap">
          <span className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white font-mono leading-none">
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : (
              <span className="transition-all duration-500 ease-out break-all">
                {formattedValue}
              </span>
            )}
          </span>
          <span className="text-xs sm:text-sm text-slate-300 flex-shrink-0">
            TCYCLES/s
          </span>
        </div>
      </div>
    </div>
  )
}