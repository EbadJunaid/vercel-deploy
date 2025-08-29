"use client"

import { useState, useEffect } from "react"
import type { MetricsData, DataCenter } from "@/types"

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalSubnets: 0,
    totalNodes: 0,
    totalNodeProviders: 0,
    totalDataCenters: 0,
    totalCountries: 0,
    totalRegions: 0,
    totalDCOwners: 0,
  })
  const [loading, setLoading] = useState(true)
  const [topCountries, setTopCountries] = useState<string[]>([])

  // Fetch basic metrics (every 5 seconds)
  useEffect(() => {
    const fetchBasicMetrics = async () => {
      try {
        const [subnetsRes, nodesRes, providersRes] = await Promise.all([
          fetch("https://ic-api.internetcomputer.org/api/v3/metrics/ic-subnet-total").catch(() => null),
          fetch("https://ic-api.internetcomputer.org/api/v3/metrics/ic-nodes-count").catch(() => null),
          fetch("https://ic-api.internetcomputer.org/api/v3/node-providers-count").catch(() => null),
        ])

        const results = await Promise.allSettled([
          subnetsRes?.ok ? subnetsRes.json() : Promise.reject(),
          nodesRes?.ok ? nodesRes.json() : Promise.reject(),
          providersRes?.ok ? providersRes.json() : Promise.reject(),
        ])

        const [subnetsData, nodesData, providersData] = results.map((result) =>
          result.status === "fulfilled" ? result.value : null,
        )

        setMetrics((prev) => ({
          ...prev,
          totalSubnets: subnetsData?.subnet_total?.[0]?.[1] ? Number.parseInt(subnetsData.subnet_total[0][1]) : 47,
          totalNodes: nodesData?.total_nodes?.[0]?.[1] ? Number.parseInt(nodesData.total_nodes[0][1]) : 701,
          totalNodeProviders: providersData?.node_providers_count || 94,
        }))
      } catch (error) {
        console.error("Failed to fetch basic metrics:", error)
        // Fallback values are already set in initial state
      }
    }

    fetchBasicMetrics()
    const interval = setInterval(fetchBasicMetrics, 5000) // Every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Fetch data centers (every 1 minute)
  useEffect(() => {
    const fetchDataCenters = async () => {
      try {
        const response = await fetch("https://ic-api.internetcomputer.org/api/v3/data-centers")
        const data = await response.json()

        if (data.data_centers) {
          const datacenters = Object.values(data.data_centers) as DataCenter[]

          // Extract unique regions (first part before comma)
          const uniqueRegions = new Set(datacenters.map((dc) => dc.region.split(",")[2]?.trim()).filter(Boolean))

          // Extract unique countries (second part after comma)
          const uniqueCountries = new Set(datacenters.map((dc) => dc.region.split(",")[1]?.trim()).filter(Boolean))

          // Count country frequencies for top countries
          const countryFrequency: { [key: string]: number } = {}
          datacenters.forEach((dc) => {
            const country = dc.region.split(",")[1]?.trim()
            if (country) {
              countryFrequency[country] = (countryFrequency[country] || 0) + 1
            }
          })

          // Get top 6 countries by frequency
          const sortedCountries = Object.entries(countryFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([country]) => country.toLowerCase())

          const uniqueOwners = new Set(datacenters.map((dc) => dc.owner).filter(Boolean))

          setMetrics((prev) => ({
            ...prev,
            totalDataCenters: datacenters.length || 83,
            totalCountries: uniqueCountries.size || 32,
            totalRegions: uniqueRegions.size || 57,
            totalDCOwners: uniqueOwners.size || 62,
          }))

          setTopCountries(sortedCountries)
          setLoading(false)
        }
      } catch (error) {
        console.error("Failed to fetch data centers:", error)
        setTopCountries(["us", "de", "sg", "jp", "ch", "nl"]) // Fallback
        setLoading(false)
      }
    }

    fetchDataCenters()
    const interval = setInterval(fetchDataCenters, 60000) // Every 1 minute
    return () => clearInterval(interval)
  }, [])

  return { metrics, loading, topCountries }
}
