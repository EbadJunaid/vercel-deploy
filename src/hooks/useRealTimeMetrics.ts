"use client"

import { useState, useEffect } from "react"

interface RealTimeMetrics {
  ethEquivalentTxns: number
  transactions: number
  instructionsPerSecond: number
  tcyclesPerSecond: number
}

export function useRealTimeMetrics() {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    ethEquivalentTxns: 0,
    transactions: 0,
    instructionsPerSecond: 0,
    tcyclesPerSecond: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRealTimeMetrics = async () => {
      try {
        const [ethRes, txnRes, instructionRes, cycleBurnRes] = await Promise.all([
          fetch("https://ic-api.internetcomputer.org/api/v3/metrics/eth-equivalent-txns").catch(() => null),
          fetch("https://ic-api.internetcomputer.org/api/v3/metrics/message-execution-rate").catch(() => null),
          fetch("https://ic-api.internetcomputer.org/api/v3/metrics/instruction-rate").catch(() => null),
          fetch("https://ic-api.internetcomputer.org/api/v3/metrics/cycle-burn-rate").catch(() => null),
        ])

        const results = await Promise.allSettled([
          ethRes?.ok ? ethRes.json() : Promise.reject(),
          txnRes?.ok ? txnRes.json() : Promise.reject(),
          instructionRes?.ok ? instructionRes.json() : Promise.reject(),
          cycleBurnRes?.ok ? cycleBurnRes.json() : Promise.reject(),
        ])

        const [ethData, txnData, instructionData, cycleBurnData] = results.map((result) =>
          result.status === "fulfilled" ? result.value : null,
        )

        const ethTxns = ethData?.eth_equivalent_txns?.[1]
          ? Math.floor(Number.parseFloat(ethData.eth_equivalent_txns[1]))
          : 605329

        const transactions = txnData?.message_execution_rate?.[0]?.[1]
          ? Math.floor(Number.parseFloat(txnData.message_execution_rate[0][1]))
          : 3631

        const instructionsRaw = instructionData?.instruction_rate?.[1]
          ? Number.parseFloat(instructionData.instruction_rate[1])
          : 59461000000
        const instructionsPerSecond = Math.floor(instructionsRaw / 1000000)

        const cycleBurnRaw = cycleBurnData?.cycle_burn_rate?.[0]?.[1]
          ? Number.parseFloat(cycleBurnData.cycle_burn_rate[0][1])
          : 65970217479
        const tcyclesPerSecond = Number.parseFloat((cycleBurnRaw / 1000000000000).toFixed(6))

        setMetrics({
          ethEquivalentTxns: ethTxns,
          transactions: transactions,
          instructionsPerSecond: instructionsPerSecond,
          tcyclesPerSecond: tcyclesPerSecond,
        })

        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch real-time metrics:", error)
        // Set fallback values
        setMetrics({
          ethEquivalentTxns: 605329,
          transactions: 3631,
          instructionsPerSecond: 59461,
          tcyclesPerSecond: 0.06597,
        })
        setLoading(false)
      }
    }

    fetchRealTimeMetrics()
    const interval = setInterval(fetchRealTimeMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  return { metrics, loading }
}
