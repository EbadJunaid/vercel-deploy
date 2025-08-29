"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {HelpTooltip} from "./HelpTooltip"


interface MetricData {
  timestamp: number
  value: number
  updateValue?: number
  queryValue?: number
  conversionValue?: number
  avgConversionValue?: number
  date: string
  displayDate: string
}

type TimeRange = "1D" | "7D" | "1M" | "3M" | "1Y" | "All"

interface MetricsModuleProps {
  type: "instructions" | "canisters" | "transactions" | "cycle-burn" | "finalization" | "internet-identities" | "conversion-rate"
}

interface ModuleConfig {
  title: string
  subtitle: string
  unit: string
  helpText: string
  apiEndpoint: string
  apiKey: string
  fallbackValue: number
  valueProcessor: (value: string) => number
  valueFormatter: (value: number) => string
  tooltipFormatter: (value: number) => string
  yAxisFormatter?: (value: number) => string
  gradientId: string
  updateGradientId?: string
  queryGradientId?: string
  conversionGradientId?: string
  avgConversionGradientId?: string
  hasEndParameter: boolean
  hasDualMetrics: boolean
  apiInterval: number
  secondApiEndpoint?: string
  secondApiKey?: string
  conversionApiEndpoint?: string
  avgConversionApiEndpoint?: string
}

const moduleConfigs: Record<string, ModuleConfig> = {
  instructions: {
    title: "Million Instructions Executed",
    subtitle: "(Per second)",
    unit: "MIEPs",
    helpText: "The number of instructions executed per second across all canisters on the Internet Computer, measured in millions.",
    apiEndpoint: "https://ic-api.internetcomputer.org/api/v3/metrics/instruction-rate",
    apiKey: "instruction_rate",
    fallbackValue: 58.698,
    valueProcessor: (value: string) => Number.parseFloat(value) / 1000000,
    valueFormatter: (value: number) => value.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, "'"),
    tooltipFormatter: (value: number) => value.toFixed(2),
    gradientId: "instructionGradient",
    hasEndParameter: false,
    hasDualMetrics: false,
    apiInterval: 5000
  },
  
  canisters: {
    title: "Canister Smart Contracts",
    subtitle: "(Dapps or Code Units)",
    unit: "",
    helpText: "The total number of registered canisters running on the Internet Computer blockchain.",
    apiEndpoint: "https://ic-api.internetcomputer.org/api/v3/metrics/registered-canisters-count",
    apiKey: "running_canisters",
    fallbackValue: 953300,
    valueProcessor: (value: string) => Number.parseInt(value),
    valueFormatter: (value: number) => value.toLocaleString().replace(/,/g, "'"),
    tooltipFormatter: (value: number) => value.toLocaleString(),
    gradientId: "canisterGradient",
    hasEndParameter: false,
    hasDualMetrics: false,
    apiInterval: 10000
  },
  
  transactions: {
    title: "Transactions",
    subtitle: "",
    unit: "TX/s",
    helpText: "The number of update and query transactions executed per second across the Internet Computer blockchain.",
    apiEndpoint: "https://ic-api.internetcomputer.org/api/v3/metrics/message-execution-rate",
    apiKey: "message_execution_rate",
    fallbackValue: 3699.96,
    valueProcessor: (value: string) => Number.parseFloat(value),
    valueFormatter: (value: number) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'"),
    tooltipFormatter: (value: number) => value.toFixed(2),
    gradientId: "transactionGradient",
    updateGradientId: "updateGradient",
    queryGradientId: "queryGradient",
    hasEndParameter: true,
    hasDualMetrics: true,
    apiInterval: 15000
  },
  
  "cycle-burn": {
    title: "Cycle Burn Rate",
    subtitle: "",
    unit: "TCYCLES/s",
    helpText: "The rate at which cycles are being burned on the Internet Computer. Cycles are burned when canisters consume resources such as computation, memory, and storage. The burn rate is measured in trillion cycles per second.",
    apiEndpoint: "https://ic-api.internetcomputer.org/api/v3/metrics/cycle-burn-rate",
    apiKey: "cycle_burn_rate",
    fallbackValue: 0.0664,
    valueProcessor: (value: string) => Number.parseFloat(value) / 1000000000000,
    valueFormatter: (value: number) => value.toFixed(4),
    tooltipFormatter: (value: number) => value.toFixed(4),
    yAxisFormatter: (value: number) => {
      const billions = value * 1000;
      if (billions >= 1000) {
        return `${(billions / 1000).toFixed(1)}T`
      } else {
        return `${billions.toFixed(0)}B`
      }
    },
    gradientId: "cycleBurnGradient",
    hasEndParameter: true,
    hasDualMetrics: false,
    apiInterval: 20000
  },
  
  finalization: {
    title: "Finalization Rate",
    subtitle: "",
    unit: "Blocks/s",
    helpText: "The rate at which blocks are being finalized on the Internet Computer.",
    apiEndpoint: "https://ic-api.internetcomputer.org/api/v3/metrics/block-rate",
    apiKey: "block_rate",
    fallbackValue: 89.26,
    valueProcessor: (value: string) => Number.parseFloat(value),
    valueFormatter: (value: number) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'"),
    tooltipFormatter: (value: number) => value.toFixed(2),
    gradientId: "finalizationGradient",
    hasEndParameter: true,
    hasDualMetrics: false,
    apiInterval: 25000
  },
  
  "internet-identities": {
    title: "Internet Identities",
    subtitle: "",
    unit: "",
    helpText: "The total number of Internet Identities created on the Internet Computer.",
    apiEndpoint: "https://ic-api.internetcomputer.org/api/v3/metrics/internet-identity-user-count",
    apiKey: "internet_identity_user_count",
    fallbackValue: 1111111,
    valueProcessor: (value: string) => Number.parseInt(value),
    valueFormatter: (value: number) => value.toLocaleString().replace(/,/g, "'"),
    tooltipFormatter: (value: number) => value.toLocaleString(),
    yAxisFormatter: (value: number) => {
      const millions = value / 1000000;
      // console.log("yep",millions);
      return `${millions.toFixed(2)}M`
    },
    gradientId: "internetIdentitiesGradient",
    hasEndParameter: true,
    hasDualMetrics: false,
    apiInterval: 1200000 // 20 minutes
  },
  
  "conversion-rate": {
    title: "Conversion Rate",
    subtitle: "(ICP-TCYCLES)",
    unit: "TCYCLES",
    helpText: "This chart shows the conversion rate between ICP and Trillion Cycles (TCYCLES), as well as the 30-day moving average of the conversion rate. The Y-axis represents the amount of TCYCLES per ICP token. Cycles are the unit of measurement for resources consumed by canisters, such as processing, memory, storage, and network bandwidth. Since 1 TCYCLES always equals 1 XDR (Special Drawing Rights, a supplementary foreign exchange asset defined by the IMF), this chart effectively represents the ICP-XDR exchange rate. The average ICP-XDR rate over the preceding 30 days is used to compute monthly node provider rewards.",
    apiEndpoint: "https://ic-api.internetcomputer.org/api/v3/icp-xdr-conversion-rates",
    apiKey: "icp_xdr_conversion_rates",
    fallbackValue: 3.8558,
    valueProcessor: (value: string) => Number.parseFloat(value)/10000,
    valueFormatter: (value: number) => value.toFixed(4),
    tooltipFormatter: (value: number) => value.toFixed(4),
    yAxisFormatter: (value: number) => {
      return `${value.toFixed(1)}T`
    },
    gradientId: "conversionRateGradient",
    conversionGradientId: "conversionGradient",
    avgConversionGradientId: "avgConversionGradient",
    hasEndParameter: true,
    hasDualMetrics: true,
    apiInterval: 20000, // 20 seconds
    conversionApiEndpoint: "https://ic-api.internetcomputer.org/api/v3/icp-xdr-conversion-rates",
    avgConversionApiEndpoint: "https://ic-api.internetcomputer.org/api/v3/avg-icp-xdr-conversion-rates"
  }
}

// Simple help tooltip component

// const HelpTooltip = ({ content }: { content: string }) => (
//   <div className="group relative inline-block">
//     <div className="w-4 h-4 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center cursor-help">
//       ?
//     </div>
//     <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
//       {content}
//     </div>
//   </div>
// )




// const HelpTooltip = ({ content }: { content: string }) => {
//   const [isVisible, setIsVisible] = useState(false)
//   const [isMobile, setIsMobile] = useState(false)
//   const tooltipRef = useRef<HTMLDivElement>(null)
//   const buttonRef = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     const checkMobile = () => setIsMobile(window.innerWidth < 768)
//     checkMobile()
//     window.addEventListener('resize', checkMobile)
//     return () => window.removeEventListener('resize', checkMobile)
//   }, [])

//   const handleClick = (e: React.MouseEvent) => {
//     if (isMobile) {
//       e.stopPropagation()
//       setIsVisible(!isVisible)
//     }
//   }

//   const handleMouseEnter = () => {
//     if (!isMobile) setIsVisible(true)
//   }

//   const handleMouseLeave = () => {
//     if (!isMobile) setIsVisible(false)
//   }

//   useEffect(() => {
//     if (isMobile && isVisible) {
//       const handleClickOutside = () => setIsVisible(false)
//       document.addEventListener('click', handleClickOutside)
//       return () => document.removeEventListener('click', handleClickOutside)
//     }
//   }, [isMobile, isVisible])

//   return (
//     <div className="relative inline-block">
//       <div
//         ref={buttonRef}
//         className="w-4 h-4 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center cursor-help"
//         onClick={handleClick}
//         onMouseEnter={handleMouseEnter}
//         onMouseLeave={handleMouseLeave}
//       >
//         ?
//       </div>
//       {isVisible && (
//         <div
//           ref={tooltipRef}
//           className={`
//             absolute z-50 px-2 py-2 bg-slate-800 text-white text-sm rounded-lg
//             min-w-35 md:min-w 37 lg:min-w-40 max-w-[50vw] text-wrap
//             ${isMobile 
//               ? 'w-30 top-6 left-1/2 transform -translate-x-1/2' 
//               : 'bottom-full mb-2 left-1/2 transform -translate-x-1/2'
//             }
//             ${isVisible ? 'opacity-100' : 'opacity-0'}
//             transition-opacity duration-200
//           `}
//           style={{
//             // Prevent going off-screen
//             left: 'clamp(8px, 50%, calc(100vw - 264px))',
//             transform: 'translateX(-50%)'
//           }}
//         >
//           {content}
//         </div>
//       )}
//     </div>
//   )
// }








interface RechartsTooltipPayload<T> {
  value: number
  payload: T
}
interface MetricsTooltipProps<T> {
  active?: boolean
  payload?: Array<RechartsTooltipPayload<T>>
  config: ModuleConfig
}

const CustomTooltip = ({ active, payload, config }: MetricsTooltipProps<MetricData>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    
    if (config.hasDualMetrics && config.title === "Transactions" && payload.length === 2) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span className="text-cyan-400 text-sm">Update: {config.tooltipFormatter(data.updateValue || 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
              <span className="text-purple-400 text-sm">Query: {config.tooltipFormatter(data.queryValue || 0)}</span>
            </div>
          </div>
          <p className="text-slate-300 text-sm mt-2">{data.displayDate}</p>
        </div>
      )
    } else if (config.hasDualMetrics && config.title === "Conversion Rate" && payload.length === 2) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span className="text-cyan-400 text-sm">Current Rate: {config.tooltipFormatter(data.conversionValue || 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
              <span className="text-purple-400 text-sm">30-Day Moving Average: {config.tooltipFormatter(data.avgConversionValue || 0)}</span>
            </div>
          </div>
          <p className="text-slate-300 text-sm mt-2">{data.displayDate}</p>
        </div>
      )
    } else {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold text-lg">{config.tooltipFormatter(payload[0].value)}</p>
          <p className="text-slate-300 text-sm">{data.displayDate}</p>
        </div>
      )
    }
  }
  return null
}

// Legend component for dual metrics
const DualMetricsLegend = ({ config }: { config: ModuleConfig }) => {
  if (config.title === "Transactions") {
    return (
      <div className="flex items-center gap-4 mt-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
          <span className="text-cyan-400 text-sm">Update</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-400"></div>
          <span className="text-purple-400 text-sm">Query</span>
        </div>
      </div>
    )
  } else if (config.title === "Conversion Rate") {
    return (
      <div className="flex items-center gap-4 mt-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
          <span className="text-cyan-400 text-sm">Current Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-400"></div>
          <span className="text-purple-400 text-sm">30-Day Moving Average</span>
        </div>
      </div>
    )
  }
  return null
}

export function MetricsModule({ type }: MetricsModuleProps) {
  const config = moduleConfigs[type]
  
  // Early return if config is not found
  // Given the union type for `type`, a valid config must always exist

  const [currentValue, setCurrentValue] = useState(config.fallbackValue)
  const [chartData, setChartData] = useState<MetricData[]>([])
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1D")
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [yAxisTicks, setYAxisTicks] = useState<number[]>([])
  const [initialLoad, setInitialLoad] = useState(false)

  // Function to calculate dynamic Y-axis ticks based on data
  const calculateYAxisTicks = useCallback((data: MetricData[]) => {
    if (data.length === 0) return [0, 20, 40, 60, 80, 100]
    
    let values: number[] = []
    
    if (config.hasDualMetrics && config.title === "Transactions") {
      values = data.flatMap(d => [d.updateValue || 0, d.queryValue || 0])
    } else if (config.hasDualMetrics && config.title === "Conversion Rate") {
      values = data.flatMap(d => [d.conversionValue || 0, d.avgConversionValue || 0])
    } else {
      values = data.map(d => d.value)
    }
    
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    
    const padding = (maxValue - minValue) * 0.1
    const adjustedMin = Math.max(0, minValue - padding)
    const adjustedMax = maxValue + padding
    
    const interval = (adjustedMax - adjustedMin) / 4
    const ticks = []
    
    for (let i = 0; i <= 4; i++) {
      ticks.push(adjustedMin + (interval * i))
    }
    
    return ticks
  }, [config])

  // Custom tick formatter for Y-axis
  const formatYAxisTick = useCallback((value: number) => {
    if (config.yAxisFormatter) {
      return config.yAxisFormatter(value)
    }
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    } else {
      return value.toFixed(0)
    }
  }, [config])

  // Fetch chart data function
  const fetchChartData = useCallback(async (range: TimeRange) => {
    setChartLoading(true)
    try {
      const now = Math.floor(Date.now() / 1000)
      let startTime: number
      let step: number

      // Calculate start time and step based on range
      switch (range) {
        case "1D":
          startTime = now - 86400
          step = 1200
          break
        case "7D":
          startTime = now - 604800
          step = 1800
          break
        case "1M":
          startTime = now - 2592000
          step = 10800
          break
        case "3M":
          startTime = now - 7776000
          step = 43200
          break
        case "1Y":
          startTime = now - 31536000
          step = 86400
          break
        case "All":
          const launchDate = new Date("2021-06-03").getTime() / 1000
          startTime = launchDate
          step = 86400
          break
        default:
          startTime = now - 86400
          step = 600
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      let apiUrl = `${config.apiEndpoint}?start=${Math.floor(startTime)}&step=${step}`
      
      if (config.hasEndParameter) {
        apiUrl += `&end=${now}`
      }

      if (config.hasDualMetrics && config.title === "Transactions") {
        const [updateResponse, queryResponse] = await Promise.all([
          fetch(`${apiUrl}&message_type=update`, { signal: controller.signal }),
          fetch(`${apiUrl}&message_type=query`, { signal: controller.signal })
        ])

        clearTimeout(timeoutId)

        if (!updateResponse.ok || !queryResponse.ok) {
          console.log(`Failed to fetch ${type} chart data:`, updateResponse.status, queryResponse.status)
          return
        }

        const [updateData, queryData] = await Promise.all([
          updateResponse.json(),
          queryResponse.json()
        ])

        if (updateData?.[config.apiKey] && queryData?.[config.apiKey] && 
            Array.isArray(updateData[config.apiKey]) && Array.isArray(queryData[config.apiKey])) {
          
          const queryMap = new Map<number, number>(
            queryData[config.apiKey].map(([timestamp, value]: [number, string]) => [
              timestamp,
              config.valueProcessor(value),
            ])
          )

          const chartPoints: MetricData[] = updateData[config.apiKey]
            .map(([timestamp, updateValue]: [number, string]) => {
              const processedUpdateValue = config.valueProcessor(updateValue)
              const processedQueryValue = queryMap.get(timestamp) ?? 0
              const totalValue = processedUpdateValue + processedQueryValue

              if (isNaN(processedUpdateValue) || isNaN(timestamp)) return null

              const date = new Date(timestamp * 1000)

              return {
                timestamp: timestamp * 1000,
                value: totalValue,
                updateValue: processedUpdateValue,
                queryValue: processedQueryValue,
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
            .filter((point: MetricData | null): point is MetricData => point !== null)

          if (chartPoints.length > 0) {
            chartPoints.sort((a, b) => a.timestamp - b.timestamp)
            setChartData(chartPoints)
            setYAxisTicks(calculateYAxisTicks(chartPoints))
          }
        }
      } else if (config.hasDualMetrics && config.title === "Conversion Rate") {
        const conversionUrl = `${config.conversionApiEndpoint}?start=${Math.floor(startTime)}&step=${step}&end=${now}`
        const avgConversionUrl = `${config.avgConversionApiEndpoint}?start=${Math.floor(startTime)}&step=${step}&end=${now}`
        
        const [conversionResponse, avgConversionResponse] = await Promise.all([
          fetch(conversionUrl, { signal: controller.signal }),
          fetch(avgConversionUrl, { signal: controller.signal })
        ])

        clearTimeout(timeoutId)

        if (!conversionResponse.ok || !avgConversionResponse.ok) {
          console.log(`Failed to fetch ${type} chart data:`, conversionResponse.status, avgConversionResponse.status)
          return
        }

        const [conversionData, avgConversionData] = await Promise.all([
          conversionResponse.json(),
          avgConversionResponse.json()
        ])

        if (conversionData?.icp_xdr_conversion_rates && avgConversionData?.avg_icp_xdr_conversion_rates && 
            Array.isArray(conversionData.icp_xdr_conversion_rates) && Array.isArray(avgConversionData.avg_icp_xdr_conversion_rates)) {
          
          const avgConversionMap = new Map<number, number>(
            avgConversionData.avg_icp_xdr_conversion_rates.map(
              ([timestamp, value]: [number, string]) => [
                timestamp,
                config.valueProcessor(value),
              ]
            )
          )

          const chartPoints: MetricData[] = conversionData.icp_xdr_conversion_rates
            .map(([timestamp, conversionValue]: [number, string]) => {
              const processedConversionValue = config.valueProcessor(conversionValue)
              const processedAvgConversionValue = avgConversionMap.get(timestamp) || 0

              if (isNaN(processedConversionValue) || isNaN(timestamp)) return null

              const date = new Date(timestamp * 1000)

              return {
                timestamp: timestamp * 1000,
                value: processedConversionValue,
                conversionValue: processedConversionValue,
                avgConversionValue: processedAvgConversionValue,
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
            .filter((point: MetricData | null): point is MetricData => point !== null)

          if (chartPoints.length > 0) {
            chartPoints.sort((a, b) => a.timestamp - b.timestamp)
            setChartData(chartPoints)
            setYAxisTicks(calculateYAxisTicks(chartPoints))
          }
        }
      } else {
        const response = await fetch(apiUrl, { signal: controller.signal })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.log(`Failed to fetch ${type} chart data:`, response.status)
          return
        }

        const data = await response.json()

        if (data && data[config.apiKey] && Array.isArray(data[config.apiKey]) && data[config.apiKey].length > 0) {
          const chartPoints: MetricData[] = data[config.apiKey]
            .map(([timestamp, value]: [number, string]) => {
              const processedValue = config.valueProcessor(value)
              if (isNaN(processedValue) || isNaN(timestamp)) return null

              const date = new Date(timestamp * 1000)

              return {
                timestamp: timestamp * 1000,
                value: processedValue,
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
            .filter((point: MetricData | null): point is MetricData => point !== null)

          if (chartPoints.length > 0) {
            chartPoints.sort((a, b) => a.timestamp - b.timestamp)
            setChartData(chartPoints)
            setYAxisTicks(calculateYAxisTicks(chartPoints))
          }
        }
      }
    } catch (error) {
      const err = error as unknown
      const isAbortError = typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError'
      if (isAbortError) {
        console.log(`${type} chart data fetch was aborted (timeout):`, err)
      } else {
        console.log(`Error fetching ${type} chart data:`, err)
      }
    } finally {
      setChartLoading(false)
    }
  }, [type, config, calculateYAxisTicks])

  // Fetch current metric value
  const fetchCurrentValue = useCallback(async () => {
    try {
      const response = await fetch(config.apiEndpoint)

      if (!response.ok) {
        console.log(`Failed to fetch current ${type}:`, response.status)
        setCurrentValue(config.fallbackValue)
        return
      }

      const data = await response.json()

      // Handle the JSON structure based on your examples
      let current = config.fallbackValue
      
      if (data?.[config.apiKey]) {
        if (Array.isArray(data[config.apiKey]) && data[config.apiKey].length >= 2) {
          // Handle array format like [timestamp, "value"]
          current = config.valueProcessor(data[config.apiKey][1])
        } else if (Array.isArray(data[config.apiKey]) && data[config.apiKey].length > 0 && Array.isArray(data[config.apiKey][0])) {
          // Handle nested array format like [[timestamp, "value"], ...]
          const latestEntry = data[config.apiKey][data[config.apiKey].length - 1]
          if (latestEntry && latestEntry.length > 1) {
            current = config.valueProcessor(latestEntry[1])
          }
        }
      }

      setCurrentValue(current)
    } catch (error) {
      console.log(`Error fetching current ${type}:`, error)
      setCurrentValue(config.fallbackValue)
    }
  }, [config, type])

  // Initial data fetch
  useEffect(() => {
    if (!initialLoad) {
      const initializeData = async () => {
        setLoading(true)
        await fetchCurrentValue()
        await fetchChartData("1D")
        setInitialLoad(true)
        setLoading(false)
      }
      
      initializeData()
    }
  }, [initialLoad, fetchCurrentValue, fetchChartData])

  // Set up intervals for current value updates
  useEffect(() => {
    if (!initialLoad) return

    const interval = setInterval(() => {
      fetchCurrentValue()
    }, config.apiInterval)

    return () => {
      clearInterval(interval)
    }
  }, [initialLoad, fetchCurrentValue, config.apiInterval])

  const handleRangeChange = useCallback((range: TimeRange) => {
    setSelectedRange(range)
    fetchChartData(range)
  }, [fetchChartData])

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
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base md:text-lg font-semibold">{config.title}</h2>
            <HelpTooltip content={config.helpText} />
          </div>
          {config.subtitle && <p className="text-sm text-slate-400">{config.subtitle}</p>}
        </div>
        <div className="flex items-center">
          <TrendingUp className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <div className="text-3xl md:text-4xl font-bold mb-1">
          {config.valueFormatter(currentValue)}
          {config.unit && <span className="text-lg text-slate-400 ml-2">{config.unit}</span>}
        </div>
        {config.hasDualMetrics && <DualMetricsLegend config={config} />}
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
                <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                </linearGradient>
                {config.hasDualMetrics && config.title === "Transactions" && (
                  <>
                    <linearGradient id="updateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                    </linearGradient>
                  </>
                )}
                {config.hasDualMetrics && config.title === "Conversion Rate" && (
                  <>
                    <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="avgConversionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                    </linearGradient>
                  </>
                )}
                {config.title === "Internet Identities" && (
                  <linearGradient id="internetIdentitiesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                )}
              </defs>

              <CartesianGrid strokeDasharray="none" stroke="#374151" opacity={0.2} horizontal={true} vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                axisLine={false} 
                tickLine={false} 
                tick={false} 
                height={0} 
              />
              <YAxis
                ticks={yAxisTicks}
                tickFormatter={formatYAxisTick}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                width={40}
                domain={['dataMin', 'dataMax']}
              />

              <Tooltip content={<CustomTooltip config={config} />} />

              {config.hasDualMetrics && config.title === "Transactions" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="updateValue"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    fill="url(#updateGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#ffffff",
                      stroke: "#22d3ee",
                      strokeWidth: 2,
                      style: { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" },
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="queryValue"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    fill="url(#queryGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#ffffff",
                      stroke: "#a855f7",
                      strokeWidth: 2,
                      style: { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" },
                    }}
                  />
                </>
              ) : config.hasDualMetrics && config.title === "Conversion Rate" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="conversionValue"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    fill="url(#conversionGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#ffffff",
                      stroke: "#22d3ee",
                      strokeWidth: 2,
                      style: { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" },
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgConversionValue"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    fill="url(#avgConversionGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#ffffff",
                      stroke: "#a855f7",
                      strokeWidth: 2,
                      style: { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" },
                    }}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill={`url(#${config.gradientId})`}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#ffffff",
                    stroke: "#8b5cf6",
                    strokeWidth: 2,
                    style: { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" },
                  }}
                />
              )}
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