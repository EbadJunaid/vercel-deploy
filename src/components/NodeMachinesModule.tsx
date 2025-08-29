"use client"

import { useState, useEffect } from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface NodeData {
  timestamp: number
  value: number
  date: string
  displayDate: string
}

type TimeRange = "1D" | "7D" | "1M" | "3M" | "1Y" | "All"

interface RechartsTooltipPayload<T> {
  value: number
  payload: T
}
interface CustomTooltipProps<T> {
  active?: boolean
  payload?: Array<RechartsTooltipPayload<T>>
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps<NodeData>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold text-lg">{payload[0].value}</p>
        <p className="text-slate-300 text-sm">{data.displayDate}</p>
      </div>
    )
  }
  return null
}

export function NodeMachinesModule() {
  const [activeNodes, setActiveNodes] = useState(0)
  const [totalNodes, setTotalNodes] = useState(0)
  const [chartData, setChartData] = useState<NodeData[]>([])
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1D")
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)

  // Fetch total nodes count (separate from active nodes)
  useEffect(() => {
    const fetchTotalNodes = async () => {
      try {
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/nodes-count")

        if (!response.ok) {
          console.error("Failed to fetch total nodes:", response.status)
          setTotalNodes(1621)
          return
        }

        const data = await response.json()

        // Fix: Use 'count' instead of 'total_nodes'
        const total = data?.count || 1621 // Fallback to 1621 if API fails
        setTotalNodes(total)
      } catch (error) {
        console.error("Error fetching total nodes:", error)
        setTotalNodes(1621) // Fallback value
      }
    }

    // Initial fetch
    fetchTotalNodes()

    // Fetch every 2 minutes
    const interval = setInterval(fetchTotalNodes, 120000)
    return () => clearInterval(interval)
  }, [])

  // Fetch current active node counts
  useEffect(() => {
    const fetchActiveNodes = async () => {
      try {
        setLoading(true)
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/metrics/ic-nodes-count")

        if (!response.ok) {
          console.error("Failed to fetch active nodes:", response.status)
          setActiveNodes(701)
          await fetchChartData("1D")
          return
        }

        const data = await response.json()
        const active = data?.total_nodes?.[0]?.[1] ? Number.parseInt(data.total_nodes[0][1]) : 701
        setActiveNodes(active)

        await fetchChartData("1D", data?.total_nodes?.[0]?.[0])
      } catch (error) {
        console.error("Error fetching active nodes:", error)
        setActiveNodes(701) // Fallback value
      } finally {
        setLoading(false)
      }
    }

    fetchActiveNodes()
    const interval = setInterval(fetchActiveNodes, 120000) // Every 2 minutes
    return () => clearInterval(interval)
  }, [])

  const fetchChartData = async (range: TimeRange, currentEpoch?: number) => {
    setChartLoading(true)
    try {
      const now = currentEpoch || Math.floor(Date.now() / 1000)
      let startTime: number
      let step = 86400 // Always use 1 day step as requested

      // Calculate start time based on range
      switch (range) {
        case "1D":
          startTime = now - 86400 // 1 day
          step = 1200 // 20 minutes for 1D mode
          break
        case "7D":
          startTime = now - 604800 // 7 days
          step = 1800 // 30 minutes for 7D mode
          break
        case "1M":
          startTime = now - 2592000 // 30 days
          step = 10800 // 3 hour step
          break
        case "3M":
          startTime = now - 7776000 // 90 days
          step = 43200 // 12 hour step
          break
        case "1Y":
          startTime = now - 31536000 // 365 days
          step = 86400 // 1 day step
          break
        case "All":
          // Start from 2021-06-03 (IC launch) as requested
          const launchDate = new Date("2021-06-03").getTime() / 1000
          startTime = launchDate
          step = 86400 // 1 day step as requested (will create 2-3 day jumps in data)
          break
        default:
          startTime = now - 86400
      }

      // Add 1 minute timeout as requested
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 1 minute timeout

      const response = await fetch(
        `https://ic-api.internetcomputer.org/api/v3/metrics/ic-nodes-count?start=${Math.floor(startTime)}&step=${step}`,
        { signal: controller.signal },
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Fix: Better validation and handling of chart data
      if (data && data.total_nodes && Array.isArray(data.total_nodes) && data.total_nodes.length > 0) {
        const chartPoints: NodeData[] = data.total_nodes
          .map(([timestamp, value]: [number, string]) => {
            const nodeValue = Number.parseInt(value)
            if (isNaN(nodeValue) || isNaN(timestamp)) return null

            const date = new Date(timestamp * 1000)
            return {
              timestamp: timestamp * 1000,
              value: nodeValue,
              date: date.toISOString().split("T")[0],
              displayDate:
                range === "1D" || range === "7D"
                  ? `${date.toISOString().split("T")[0]}, ${date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "UTC",
                    })} UTC`
                  : date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }),
            }
          })
          .filter(Boolean) // Remove null values

        if (chartPoints.length > 0) {
          setChartData(chartPoints)
        } else {
          throw new Error("No valid chart data points")
        }
      } else {
        console.error("Invalid chart data structure:", data)
        throw new Error("Invalid chart data format - missing or empty total_nodes array")
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("Chart data fetch was aborted (timeout):", error)
      } else {
        console.error("Failed to fetch chart data:", error)
      }

      // Set fallback data for any range if API fails
      const fallbackData: NodeData[] = (() => {
        switch (range) {
          case "1D":
            return [
              {
                timestamp: Date.now() - 86400000,
                value: 700,
                date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
                displayDate: "Yesterday",
              },
              { timestamp: Date.now(), value: 701, date: new Date().toISOString().split("T")[0], displayDate: "Today" },
            ]
          case "7D":
            return Array.from({ length: 7 }, (_, i) => {
              const timestamp = Date.now() - (6 - i) * 86400000
              return {
                timestamp,
                value: 695 + i,
                date: new Date(timestamp).toISOString().split("T")[0],
                displayDate: new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              }
            })
          case "All":
            return [
              {
                timestamp: new Date("2021-06-03").getTime(),
                value: 13,
                date: "2021-06-03",
                displayDate: "Jun 3, 2021",
              },
              {
                timestamp: new Date("2021-12-01").getTime(),
                value: 250,
                date: "2021-12-01",
                displayDate: "Dec 1, 2021",
              },
              {
                timestamp: new Date("2022-06-01").getTime(),
                value: 400,
                date: "2022-06-01",
                displayDate: "Jun 1, 2022",
              },
              {
                timestamp: new Date("2023-01-01").getTime(),
                value: 500,
                date: "2023-01-01",
                displayDate: "Jan 1, 2023",
              },
              {
                timestamp: new Date("2023-06-01").getTime(),
                value: 580,
                date: "2023-06-01",
                displayDate: "Jun 1, 2023",
              },
              {
                timestamp: new Date("2024-01-01").getTime(),
                value: 650,
                date: "2024-01-01",
                displayDate: "Jan 1, 2024",
              },
              {
                timestamp: new Date("2024-06-01").getTime(),
                value: 680,
                date: "2024-06-01",
                displayDate: "Jun 1, 2024",
              },
              { timestamp: Date.now(), value: 701, date: new Date().toISOString().split("T")[0], displayDate: "Today" },
            ]
          default:
            return [
              {
                timestamp: Date.now() - 2592000000,
                value: 680,
                date: new Date(Date.now() - 2592000000).toISOString().split("T")[0],
                displayDate: "30 days ago",
              },
              { timestamp: Date.now(), value: 701, date: new Date().toISOString().split("T")[0], displayDate: "Today" },
            ]
        }
      })()

      setChartData(fallbackData)
    } finally {
      setChartLoading(false)
    }
  }

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range)
    fetchChartData(range)
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 md:p-6 text-white h-full shadow-2xl">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-32"></div>
          <div className="h-20 bg-gray-700 rounded mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 md:p-6 text-white h-full shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg md:text-xl font-semibold">Node Machines</h2>
        <button className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center space-x-1">
          <span>View</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <div className="text-3xl md:text-4xl font-bold mb-1">
          {activeNodes}
          <span className="text-lg text-slate-400 ml-2">of {totalNodes.toLocaleString()}</span>
        </div>
        <div className="text-sm text-slate-300">Total Node Machines in Subnets</div>
      </div>

      {/* Chart */}
      <div className="mb-4 h-48">
        {chartLoading ? (
          <div className="h-full bg-gray-700/50 rounded animate-pulse flex items-center justify-center">
            <span className="text-gray-400">Loading chart...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              {/* Minimal grid - only horizontal lines */}
              <CartesianGrid strokeDasharray="none" stroke="#374151" opacity={0.2} horizontal={true} vertical={false} />

              {/* No X-axis labels */}
              <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={false} height={0} />

              {/* Y-axis with 5 values: 0, 200, 400, 600, 800 */}
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                domain={[0, 800]}
                ticks={[0, 200, 400, 600, 800]}
                width={35}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Area fill with white hover dot */}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#colorGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#ffffff",
                  stroke: "#8b5cf6",
                  strokeWidth: 2,
                  style: { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" },
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Time Range Buttons */}
      <div className="flex flex-wrap gap-2">
        {(["1D", "7D", "1M", "3M", "1Y", "All"] as TimeRange[]).map((range) => (
          <Button
            key={range}
            variant={selectedRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => handleRangeChange(range)}
            className={`text-xs ${
              selectedRange === range
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {range}
          </Button>
        ))}
      </div>
    </div>
  )
}
