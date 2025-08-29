"use client"

import { MetricCard } from "./MetricCard"
import { useRealTimeMetrics } from "@/hooks/useRealTimeMetrics"

export function BottomMetrics() {
  const { metrics, loading } = useRealTimeMetrics()

  const helpTexts = {
    ethEquivalent:
      "Not all Transactions are equal. ICP performs ~130x the amount of computational work of Ethereum per transaction.",
    transactions:
      "The total number of messages being executed per second across all subnets in the Internet Computer network.",
    instructions:
      "Million Instructions Executed Per Second (MIPS) measures the computational throughput of the Internet Computer network.",
  }

  return (
    <div className="w-full px-3 md:px-6 py-3 md:py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <MetricCard
          title="ETH-equivalent Transactions"
          value={metrics.ethEquivalentTxns}
          unit="TX/s"
          helpText={helpTexts.ethEquivalent}
          loading={loading}
        />

        <MetricCard
          title="Transactions"
          value={metrics.transactions}
          unit="TX/s"
          helpText={helpTexts.transactions}
          loading={loading}
        />

        <MetricCard
          title="Million Instructions Executed Per Second"
          value={metrics.instructionsPerSecond}
          unit="MIEPs"
          helpText={helpTexts.instructions}
          loading={loading}
        />
      </div>
    </div>
  )
}
