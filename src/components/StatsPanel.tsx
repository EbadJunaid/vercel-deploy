"use client"

import React from "react"
import type { MetricsData } from "@/types"
import Image from "next/image"

type CountryFlagProps = {
  countryCode: string
  size?: number // desired CSS size in px (width). Height will be 3:4 unless square=true
  square?: boolean
  className?: string
  alt?: string
  lazy?: boolean
}

/**
 * CountryFlag: retina-aware flag images from flagcdn
 * - size: CSS width in px (default 24)
 * - square: force square crop (object-fit: cover). Otherwise uses 4:3 ratio (width:height = 4:3)
 *
 * Implementation notes:
 * - Chooses an appropriate flagcdn `wXX` source (20, 40, 80, 160) based on size * devicePixelRatio.
 * - Supplies the chosen intrinsic width/height to next/image so it can optimize properly.
 * - Uses inline style width/height to render at the desired CSS pixel size while underlying image is higher-res.
 */
function CountryFlag({
  countryCode,
  size = 24,
  square = true,
  className = "",
  alt,
  lazy = true,
}: CountryFlagProps) {
  // devicePixelRatio exists only on the client; this is a client component so it's safe.
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const desiredPx = Math.round(size * Math.max(1, dpr))

  // pick a sensible base width from flagcdn that is >= desiredPx
  // flagcdn supports many widths; we pick common steps.
  const chooseSourceWidth = (px: number) => {
    if (px <= 20) return 20
    if (px <= 40) return 40
    if (px <= 80) return 80
    return 160
  }

  const srcWidth = chooseSourceWidth(desiredPx)
  // native flag aspect ratio from flagcdn files is typically 4:3 (w:h = 4:3)
  const intrinsicWidth = srcWidth
  const intrinsicHeight = square ? srcWidth : Math.round((srcWidth * 3) / 4)

  const displayHeight = square ? size : Math.round((size * 3) / 4)
  const code = countryCode.toLowerCase()

  const src = `https://flagcdn.com/w${srcWidth}/${code}.png`

  return (
    <Image
      src={src}
      alt={alt ?? `${countryCode} flag`}
      width={intrinsicWidth}
      height={intrinsicHeight}
      style={{
        width: `${size}px`, // CSS size you want
        height: `${displayHeight}px`,
        objectFit: "cover",
      }}
      className={`${className} object-cover flex-shrink-0 rounded-none`}
      loading={lazy ? "lazy" : "eager"}
      // quality can be left default; CDN provides good PNGs. If needed, pass quality={75}
    />
  )
}

interface StatsPanelProps {
  metrics: MetricsData
  loading: boolean
  topCountries: string[]
}

export function StatsPanel({ metrics, loading, topCountries }: StatsPanelProps) {
  const extraCount = Math.max(0, topCountries.length - 12)

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="bg-[#231a3a] border border-slate-700 rounded-2xl p-4 text-white 
        w-full sm:w-full md:w-full lg:w-full xl:w-96 xl:max-w-[400px] min-h-[350px] h-full flex flex-col mx-1 sm:mx-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Decentralization</h2>
          <div className="flex space-x-2">
            <button className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 transition">
              <span className="sr-only">Previous</span>
              <svg width="14" height="14" fill="none">
                <path d="M9 3l-4 4 4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 transition">
              <span className="sr-only">Play</span>
              <svg width="14" height="14" fill="none">
                <path d="M5 3v8l6-4-6-4z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 transition">
              <span className="sr-only">List</span>
              <svg width="14" height="14" fill="none">
                <rect x="3" y="4" width="8" height="2" rx="1" fill="#fff" />
                <rect x="3" y="8" width="8" height="2" rx="1" fill="#fff" />
              </svg>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 mb-4" />

        {/* Subnets and Flags */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex-shrink-0">
            <button className="bg-[#2d2350] text-xs px-3 py-1 rounded mb-2 font-medium flex items-center gap-1">
              All subnets <span className="text-slate-400">&rarr;</span>
            </button>
            <span className="text-4xl sm:text-5xl font-bold">{loading ? "..." : metrics.totalSubnets}</span>
            <div className="text-xs text-slate-300 mt-1">
              Subnets in {loading ? "..." : metrics.totalCountries} Countries
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end">
            <div className="flex flex-row flex-wrap gap-1 mb-1 max-w-[200px] sm:max-w-none">
              {topCountries.slice(0, 12).map((country) => (
                <CountryFlag key={country} countryCode={country} size={26} square className="shadow-sm" />
              ))}
            </div>
            {extraCount > 0 && <span className="text-xs text-emerald-400 font-semibold">+{extraCount}</span>}
          </div>
        </div>

        <div className="border-t border-slate-700 my-4" />

        <div className="flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold">{loading ? "..." : metrics.totalNodes}</span>
              <span className="text-xs text-slate-300 mt-1">Node Machines</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold">{loading ? "..." : metrics.totalNodeProviders}</span>
              <span className="text-xs text-slate-300 mt-1">Node Providers</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold">{loading ? "..." : metrics.totalDataCenters}</span>
              <span className="text-xs text-slate-300 mt-1">Data Centers</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-2">
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold">{loading ? "..." : metrics.totalDCOwners}</span>
              <span className="text-xs text-slate-300 mt-1">DC Owners</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold">{loading ? "..." : metrics.totalRegions}</span>
              <span className="text-xs text-slate-300 mt-1">Regions</span>
            </div>
            <div />
          </div>
        </div>
      </div>
    </div>
  )
}
