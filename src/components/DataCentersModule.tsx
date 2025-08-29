"use client"

import { useState, useEffect } from "react"
import { ExternalLink } from "lucide-react"
import Image from "next/image"
import type { DataCenter } from "@/types"

function CountryFlag({ countryCode, className = "w-5 h-4" }: { countryCode: string; className?: string }) {
  return (
    <Image
      src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
      alt={`${countryCode} flag`}
      width={20}
      height={16}
      className={`${className} object-cover flex-shrink-0`}
    />
  )
}

export function DataCentersModule() {
  const [dataCenters, setDataCenters] = useState<DataCenter[]>([])
  const [totalDataCenters, setTotalDataCenters] = useState(0)
  const [totalCountries, setTotalCountries] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDataCenters = async () => {
      try {
        setLoading(true)
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/data-centers")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.data_centers) {
          const datacenters = Object.values(data.data_centers) as DataCenter[]

          // Shuffle and take 5 random data centers
          const shuffled = [...datacenters].sort(() => 0.5 - Math.random())
          const randomFive = shuffled.slice(0, 5)

          // Calculate unique countries
          const uniqueCountries = new Set(datacenters.map((dc) => dc.region.split(",")[1]?.trim()).filter(Boolean))

          setDataCenters(randomFive)
          setTotalDataCenters(datacenters.length)
          setTotalCountries(uniqueCountries.size)
        } else {
          throw new Error("Invalid data centers format")
        }
      } catch (error) {
        console.error("Failed to fetch data centers:", error)
        // Set fallback data
        setDataCenters([])
        setTotalDataCenters(83)
        setTotalCountries(32)
      } finally {
        setLoading(false)
      }
    }

    fetchDataCenters()
    const interval = setInterval(fetchDataCenters, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 md:p-6 text-white h-full shadow-2xl">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-32"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 md:p-6 text-white h-full shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg md:text-xl font-semibold">Data Centers</h2>
        <button className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center space-x-1">
          <span>View</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-3xl md:text-4xl font-bold mb-1">{totalDataCenters}</div>
          <div className="text-sm text-slate-300">Data Centers</div>
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-bold mb-1">{totalCountries}</div>
          <div className="text-sm text-slate-300">Countries</div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-2 gap-4 mb-3 text-sm text-slate-400 border-b border-slate-600 pb-2">
        <div>Name</div>
        <div className="text-right">Node Machines</div>
      </div>

      {/* Data Centers List */}
      <div className="space-y-3">
        {dataCenters.map((dc) => {
          const countryCode = dc.region.split(",")[1]?.trim().toLowerCase()
          const cityName = dc.region.split(",")[2]?.trim() || dc.name

          return (
            <div
              key={dc.key}
              className="grid grid-cols-2 gap-4 items-center py-2 px-2 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 min-w-0">
                {countryCode && <CountryFlag countryCode={countryCode} />}
                <span className="text-base font-medium text-white truncate">{cityName}</span>
              </div>
              <div className="text-right text-base font-semibold text-white">{dc.total_nodes}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
