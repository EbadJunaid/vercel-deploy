"use client"

import { useState, useEffect } from "react"
import { ExternalLink } from "lucide-react"

interface NodeProvider {
  display_name: string
  total_nodes: number
  principal_id: string
}

export function NodeProvidersModule() {
  const [nodeProviders, setNodeProviders] = useState<NodeProvider[]>([])
  const [totalProviders, setTotalProviders] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNodeProviders = async () => {
      try {
        setLoading(true)
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/node-providers")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.node_providers && Array.isArray(data.node_providers)) {
          // Shuffle and take 5 random providers
          const shuffled = [...data.node_providers].sort(() => 0.5 - Math.random())
          const randomFive = shuffled.slice(0, 5)

          setNodeProviders(randomFive)
          setTotalProviders(data.node_providers.length)
        } else {
          throw new Error("Invalid node providers format")
        }
      } catch (error) {
        console.error("Failed to fetch node providers:", error)
        // Set fallback data
        setNodeProviders([])
        setTotalProviders(94)
      } finally {
        setLoading(false)
      }
    }

    fetchNodeProviders()
    const interval = setInterval(fetchNodeProviders, 30000)
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
        <h2 className="text-lg md:text-xl font-semibold">Node Providers</h2>
        <button className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center space-x-1">
          <span>View</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <div className="text-3xl md:text-4xl font-bold mb-1">{totalProviders}</div>
        <div className="text-sm text-slate-300">Providers</div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-2 gap-4 mb-3 text-sm text-slate-400 border-b border-slate-600 pb-2">
        <div>Name</div>
        <div className="text-right">Node Machines</div>
      </div>

      {/* Providers List */}
      <div className="space-y-3">
        {nodeProviders.map((provider) => (
          <div
            key={provider.principal_id}
            className="grid grid-cols-2 gap-4 items-center py-2 px-2 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <span className="text-base font-medium text-white truncate block">
                {provider.display_name || "Unknown Provider"}
              </span>
            </div>
            <div className="text-right text-base font-semibold text-white">{provider.total_nodes}</div>
          </div>
        ))}
      </div>
    </div>
  )
}