"use client"

import { AnimatedNumber } from "./AnimatedNumber"
import { HelpTooltip } from "./HelpTooltip"

interface MetricCardProps {
  title: string
  value: number
  unit: string
  helpText: string
  loading?: boolean
  className?: string
}

export function MetricCard({ title, value, unit, helpText, loading = false, className = "" }: MetricCardProps) {
  return (
    <div
      className={`bg-[#413555]/60 border border-white/10 rounded-2xl p-3 md:p-4 lg:p-4 text-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${className}`}

    >
      <div className="flex items-start mb-2 md:mb-3">
        <h4 className="text-base md:sx lg:sx xl:text-base text-slate-300 leading-tight mr-3">{title}</h4>
        <HelpTooltip content={helpText} />
      </div>

      <div className="flex items-baseline space-x-1">
        <div className="text-lg md:text-2xl lg:text-2xl xl:text-2xl font-bold">
          {loading ? (
            <span className="animate-pulse">...</span>
          ) : (
            <AnimatedNumber value={value} className="text-white" />
          )}
        </div>
        <div className="text-xs md:text-sm lg:text-base text-slate-400">{unit}</div>
      </div>
    </div>
  )
}
