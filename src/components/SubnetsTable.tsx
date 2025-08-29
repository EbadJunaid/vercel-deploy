"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HelpTooltip } from "./HelpTooltip"

interface Subnet {
  subnet_id: string
  subnet_authorization: string
  subnet_type: string
  subnet_specialization?: string | null
  total_countries: number
  total_nodes: number
  nakamoto_coefficient_overall: number
  memory_usage: number
  total_canisters: number
  instruction_rate?: number
  message_execution_rate?: number
}

interface SubnetMetrics {
  transactions: number
  computeLoad: number
}

function CountryFlags({ count, maxShow = 3 }: { count: number; maxShow?: number }) {
  // Sample country codes - in real implementation, you'd get actual country data
  const sampleCountries = ["fr", "ch", "cn", "us", "de", "in", "jp", "gb", "ca", "au"]
  const showCount = Math.min(count, maxShow)
  const remaining = Math.max(0, count - maxShow)

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: showCount }).map((_, i) => (
        <Image
          key={i}
          src={`https://flagcdn.com/w20/${sampleCountries[i % sampleCountries.length]}.png`}
          alt="Country flag"
          width={20}
          height={15}
          className="w-4 h-3 rounded-sm object-cover"
        />
      ))}
      {remaining > 0 && <span className="text-xs text-gray-400 ml-1">+{remaining}</span>}
    </div>
  )
}

function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const percentage = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${className}`} style={{ width: `${percentage}%` }} />
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"

  const k = 1024
  const sizes = ["B", "KiB", "MiB", "GiB", "TiB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const value = bytes / Math.pow(k, i)
  return `${value.toFixed(1)} ${sizes[i]}`
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

function DecentralizationScore({ score }: { score: number }) {
  const normalizedScore = Math.min(score, 5)
  const filledBars = Math.floor(normalizedScore)
  const partialBar = normalizedScore - filledBars

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-white">{score.toFixed(1)}</span>
      <span className="text-xs text-gray-400">/5</span>
      <div className="flex space-x-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 h-4 rounded-sm ${
              i < filledBars ? "bg-blue-500" : i === filledBars && partialBar > 0 ? "bg-blue-500" : "bg-gray-600"
            }`}
            style={{
              opacity: i === filledBars && partialBar > 0 ? partialBar : 1,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function SubnetsTable() {
  const [subnets, setSubnets] = useState<Subnet[]>([])
  const [totalSubnets, setTotalSubnets] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [subnetMetrics, setSubnetMetrics] = useState<Record<string, SubnetMetrics>>({})
  const [error, setError] = useState<string | null>(null)

  const subnetsPerPage = 6
  const totalPages = Math.ceil(totalSubnets / subnetsPerPage)
  const startIndex = (currentPage - 1) * subnetsPerPage
  const endIndex = startIndex + subnetsPerPage

  // Fetch total subnets count
  useEffect(() => {
    const fetchTotalSubnets = async () => {
      try {
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/metrics/ic-subnet-total")
        const data = await response.json()
        const total = data.subnet_total?.[0]?.[1] ? Number.parseInt(data.subnet_total[0][1]) : 47
        setTotalSubnets(total)
      } catch (error) {
        console.error("Failed to fetch total subnets:", error)
        setTotalSubnets(47) // Fallback
      }
    }

    fetchTotalSubnets()
  }, [])

  // Fetch subnets data
  useEffect(() => {
    const fetchSubnets = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/subnets")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.subnets && Array.isArray(data.subnets)) {
          setSubnets(data.subnets)
        } else {
          throw new Error("Invalid subnets data format")
        }
      } catch (error) {
        console.error("Failed to fetch subnets:", error)
        setError("Failed to load subnets data")
        setSubnets([])
      } finally {
        setLoading(false)
      }
    }

    fetchSubnets()
    const interval = setInterval(fetchSubnets, 180000) // Every 3 minutes
    return () => clearInterval(interval)
  }, [])

  // Fetch metrics for visible subnets
  useEffect(() => {
    const fetchSubnetMetrics = async (subnetId: string) => {
      try {
        const [txResponse, computeResponse] = await Promise.all([
          fetch(`https://ic-api.internetcomputer.org/api/v3/metrics/message-execution-rate?subnet=${subnetId}`).catch(
            () => null,
          ),
          fetch(`https://ic-api.internetcomputer.org/api/v3/metrics/instruction-rate?subnet=${subnetId}`).catch(
            () => null,
          ),
        ])

        const [txData, computeData] = await Promise.all([
          txResponse?.ok ? txResponse.json().catch(() => null) : null,
          computeResponse?.ok ? computeResponse.json().catch(() => null) : null,
        ])

        const transactions = txData?.message_execution_rate?.[0]?.[1]
          ? Number.parseFloat(txData.message_execution_rate[0][1])
          : 0

        const computeRaw = computeData?.instruction_rate?.[1] ? Number.parseFloat(computeData.instruction_rate[1]) : 0
        const computeLoad = Math.ceil(computeRaw / 1000000)

        setSubnetMetrics((prev) => ({
          ...prev,
          [subnetId]: { transactions, computeLoad },
        }))
      } catch (error) {
        console.error(`Failed to fetch metrics for subnet ${subnetId}:`, error)
        setSubnetMetrics((prev) => ({
          ...prev,
          [subnetId]: { transactions: 0, computeLoad: 0 },
        }))
      }
    }

    const visibleSubnets = subnets.slice(startIndex, endIndex)
    visibleSubnets.forEach((subnet) => {
      fetchSubnetMetrics(subnet.subnet_id)
    })

    // Set up interval for metrics refresh (every 1 minute)
    const interval = setInterval(() => {
      visibleSubnets.forEach((subnet) => {
        fetchSubnetMetrics(subnet.subnet_id)
      })
    }, 60000)

    return () => clearInterval(interval)
  }, [subnets, currentPage, startIndex, endIndex])

  const visibleSubnets = subnets.slice(startIndex, endIndex)

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4 w-32"></div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-6">
        <div className="text-center text-red-400">
          <p className="mb-2">Error loading subnets data</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white">{totalSubnets} Subnets</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>
            {startIndex + 1}-{Math.min(endIndex, subnets.length)} of {totalSubnets}
          </span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Subnets</span>
                  <HelpTooltip content="Subnet identifier and authorization level" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                  <HelpTooltip content="Subnet type classification" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Countries</span>
                  <HelpTooltip content="Number of countries hosting subnet nodes" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Nodes</span>
                  <HelpTooltip content="Total number of nodes in subnet" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Decentralization</span>
                  <HelpTooltip content="Nakamoto coefficient measuring decentralization" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>State</span>
                  <HelpTooltip content="Memory usage of the subnet" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Canisters</span>
                  <HelpTooltip content="Total number of canisters deployed" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Transactions</span>
                  <HelpTooltip content="Transaction rate per second" />
                </div>
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-300">
                <div className="flex items-center space-x-1">
                  <span>Compute Load</span>
                  <HelpTooltip content="Million Instructions Executed Per Second" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleSubnets.map((subnet) => {
              const metrics = subnetMetrics[subnet.subnet_id] || { transactions: 0, computeLoad: 0 }
              return (
                <tr key={subnet.subnet_id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="py-4 px-2">
                    <div>
                      <div className="text-sm font-medium text-blue-400">
                        {subnet.subnet_id.slice(0, 5)}...{subnet.subnet_id.slice(-3)}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {subnet.subnet_authorization.replace("_", " ")}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 capitalize">
                      {subnet.subnet_specialization || subnet.subnet_type}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <CountryFlags count={subnet.total_countries} />
                  </td>
                  <td className="py-4 px-2">
                    <span className="text-sm font-medium text-white">{subnet.total_nodes}</span>
                  </td>
                  <td className="py-4 px-2">
                    <DecentralizationScore score={subnet.nakamoto_coefficient_overall} />
                  </td>
                  <td className="py-4 px-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-white">{formatBytes(subnet.memory_usage)}</div>
                      <ProgressBar
                        value={subnet.memory_usage}
                        max={1000000000000} // 1TB max for visualization
                        className="bg-purple-500"
                      />
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-white">{formatNumber(subnet.total_canisters)}</div>
                      <ProgressBar value={subnet.total_canisters} max={100000} className="bg-green-500" />
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-white">{Math.round(metrics.transactions)} TX/s</div>
                      <ProgressBar value={metrics.transactions} max={1000} className="bg-blue-500" />
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-white">{metrics.computeLoad} MIEPs</div>
                      <ProgressBar value={metrics.computeLoad} max={10000} className="bg-orange-500" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Horizontal Scroll */}
      <div className="lg:hidden overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-9 gap-2 text-xs font-medium text-gray-300 mb-3 px-2">
            <div>Subnets</div>
            <div>Type</div>
            <div>Countries</div>
            <div>Nodes</div>
            <div>Decent.</div>
            <div>State</div>
            <div>Canisters</div>
            <div>TX/s</div>
            <div>MIEPs</div>
          </div>
          {visibleSubnets.map((subnet) => {
            const metrics = subnetMetrics[subnet.subnet_id] || { transactions: 0, computeLoad: 0 }
            return (
              <div key={subnet.subnet_id} className="grid grid-cols-9 gap-2 py-3 px-2 border-b border-gray-800 text-xs">
                <div>
                  <div className="text-blue-400 font-medium">{subnet.subnet_id.slice(0, 4)}...</div>
                  <div className="text-gray-400 text-xs">{subnet.subnet_authorization.slice(0, 6)}</div>
                </div>
                <div>
                  <span className="bg-blue-900/50 text-blue-300 px-1 py-0.5 rounded text-xs">
                    {(subnet.subnet_specialization || subnet.subnet_type).slice(0, 3)}
                  </span>
                </div>
                <div>
                  <CountryFlags count={subnet.total_countries} maxShow={2} />
                </div>
                <div className="text-white font-medium">{subnet.total_nodes}</div>
                <div className="text-white">{subnet.nakamoto_coefficient_overall.toFixed(1)}</div>
                <div className="text-white">{formatBytes(subnet.memory_usage)}</div>
                <div className="text-white">{formatNumber(subnet.total_canisters)}</div>
                <div className="text-white">{Math.round(metrics.transactions)}</div>
                <div className="text-white">{metrics.computeLoad}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-400">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
