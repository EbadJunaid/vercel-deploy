"use client"

import { useState, useEffect } from "react"
import { X, ChevronDown, ExternalLink } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import type { DataCenter } from "@/types"

interface MobileDataCenterModalProps {
  dataCenter: DataCenter | null
  isOpen: boolean
  onClose: () => void
}

export function MobileDataCenterModal({ dataCenter, isOpen, onClose }: MobileDataCenterModalProps) {
  const [dataCenters, setDataCenters] = useState<DataCenter[]>([])
  const [expandedIndex, setExpandedIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch all data centers and filter by region when modal opens
  useEffect(() => {
    if (!isOpen || !dataCenter) return

    const fetchDataCenters = async () => {
      try {
        setLoading(true)
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/data-centers")
        const data = await response.json()

        if (data.data_centers) {
          const allCenters = Object.values(data.data_centers) as DataCenter[]
          // Filter data centers by the same region AND total_nodes > 0
          const regionCenters = allCenters.filter((dc) => dc.region === dataCenter.region && dc.total_nodes > 0)

          setDataCenters(regionCenters)

          // Find the index of the clicked data center and set it as expanded
          const clickedIndex = regionCenters.findIndex((dc) => dc.key === dataCenter.key)
          setExpandedIndex(clickedIndex >= 0 ? clickedIndex : 0)
        }
      } catch (error) {
        console.error("Failed to fetch data centers:", error)
        // Fallback to single data center
        setDataCenters([dataCenter])
        setExpandedIndex(0)
      } finally {
        setLoading(false)
      }
    }

    fetchDataCenters()
  }, [isOpen, dataCenter])

  // ONLY disable body scroll for mobile modal (when screen width < 768px)
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      // Disable body scroll ONLY on mobile
      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.width = "100%"
    } else {
      // Re-enable body scroll
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
    }
  }, [isOpen])

  const handleDataCenterClick = (index: number) => {
    setExpandedIndex(index)
  }

  if (!isOpen || !dataCenter) return null

  // Get country flag
  const countryCode = dataCenter.region.split(",")[1]?.trim()?.toLowerCase() || "un"
  const regionDisplay = dataCenter.region

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center ">
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 border-t border-slate-600/50 rounded-t-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-600/50 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-4 rounded-sm overflow-hidden bg-slate-700 flex items-center justify-center">
              <Image
                src={`https://flagcdn.com/w20/${countryCode}.png`}
                alt={`${countryCode} flag`}
                width={20}
                height={15}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                  e.currentTarget.parentElement!.innerHTML = "🌍"
                }}
              />
            </div>
            <span className="text-purple-300 text-sm font-medium">{regionDisplay}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-8">
          {" "}
          {/* Add pb-8 for bottom spacing */}
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-slate-700/50 rounded-lg mb-2"></div>
                  <div className="h-32 bg-slate-700/30 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0 pb-6">
              {" "}
              {/* Add pb-6 for extra bottom spacing */}
              {dataCenters.map((dc, index) => {
                const isExpanded = index === expandedIndex

                return (
                  <div key={dc.key} className="border-b border-slate-600/30 last:border-b-0">
                    {/* Data Center Header */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
                      onClick={() => handleDataCenterClick(index)}
                    >
                      <h3 className="text-lg font-semibold text-white">{dc.name}</h3>
                      <ChevronDown
                        className={`w-5 h-5 text-purple-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-6 space-y-4">
                        {/* Data Center ID */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-600/20">
                          <span className="text-slate-300 text-sm">Data Center ID</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-purple-400 font-mono text-sm">{dc.key}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </div>
                        </div>

                        {/* Data Center Owner */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-600/20">
                          <span className="text-slate-300 text-sm">Data Center Owner</span>
                          <span className="text-white font-medium">{dc.owner}</span>
                        </div>

                        {/* Replica Nodes */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-600/20">
                          <span className="text-slate-300 text-sm">Replica Nodes</span>
                          <span className="text-white font-bold text-lg">
                            {dc.total_replica_nodes || dc.total_nodes}
                          </span>
                        </div>

                        {/* API Boundary Nodes */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-600/20">
                          <span className="text-slate-300 text-sm">API Boundary Nodes</span>
                          <span className="text-white font-bold text-lg">{dc.total_api_boundary_nodes || 0}</span>
                        </div>

                        {/* Total Nodes */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-600/20">
                          <span className="text-slate-300 text-sm">Total Nodes</span>
                          <span className="text-white font-bold text-lg">{dc.total_nodes}</span>
                        </div>

                        {/* Node Providers */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-600/20">
                          <span className="text-slate-300 text-sm">Node Providers</span>
                          <span className="text-white font-bold text-lg">{dc.node_providers}</span>
                        </div>

                        {/* Subnets */}
                        <div className="flex items-center justify-between py-3">
                          <span className="text-slate-300 text-sm">Subnets</span>
                          <span className="text-white font-bold text-lg">{Array.isArray(dc.subnets) ? dc.subnets.length : 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
