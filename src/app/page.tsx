"use client"

import { useState, useEffect, useRef } from "react"
import type { DataCenter } from "@/types"
import { useMetrics } from "@/hooks/useMetrics"
import { useRealTimeMetrics } from "@/hooks/useRealTimeMetrics"
import { Header } from "@/components/Header"
import { EarthComponent, EarthComponentRef } from "@/components/EarthComponent" // Your new component
import { ZoomControls } from "@/components/ZoomControls"
import { StatsPanel } from "@/components/StatsPanel"
import { MobileDataCenterModal } from "@/components/MobileDataCenterModal"
import { CycleBurnRate } from "@/components/CycleBurnRate"
import { BottomMetrics } from "@/components/BottomMetrics"
import { SubnetsTable } from "@/components/SubnetsTable"
import { DataCentersModule } from "@/components/DataCentersModule"
import { NodeProvidersModule } from "@/components/NodeProvidersModule"
import { NodeMachinesModule } from "@/components/NodeMachinesModule"
import { PowerConsumptionModule } from "@/components/PowerConsumptionModule"
import { MetricsModule } from "@/components/useful"
import { useMediaQuery } from "react-responsive"
import { FooterDemo } from "@/components/footer"

export default function Dashboard() {
  const [isMobile,  setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isMedium, setIsMedium] = useState(false) 
  const [selectedDataCenter, setSelectedDataCenter] = useState<DataCenter | null>(null)
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { metrics, loading, topCountries } = useMetrics()
  const { metrics: realTimeMetrics, loading: realTimeLoading } = useRealTimeMetrics()

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      // setIsTablet(width >= 768 && width < 1280)
      setIsMedium(width >= 768 && width < 1100)
      setIsTablet(width >= 1100 && width < 1280)
      console.log("screensize", width, { isMobile: width < 768, isMedium: width >= 768 && width < 1024, isTablet: width >= 1024 && width < 1280 });
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  useEffect(() => setMounted(true), [])

  const handleMobileDataCenterClick = (dataCenter: DataCenter) => {
    setSelectedDataCenter(dataCenter)
    setIsMobileModalOpen(true)
  }

  const isWide = useMediaQuery({ minWidth: 1280 })

  const earthRef = useRef<EarthComponentRef>(null)

  const handleZoomIn = () => earthRef.current?.zoomIn()
  const handleZoomOut = () => earthRef.current?.zoomOut()
  const handleResetZoom = () => earthRef.current?.resetZoom()
  

  if (!mounted) return null

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-x-hidden">
      <div className="bg-[#1d0e35] xl:h-[120vh] md:h-full sm:h-full flex flex-col justify-between relative">
        <div className="absolute top-0 left-0 w-full z-20">
          <Header />
        </div>
        {/* Main Content */}
        <div className={`relative flex flex-col ${isWide ? "lg:flex-row" : ""} justify-between h-[100%]`}>
          {/* Left ction - Earth + Cycle Burn Rate */}
          <div className="relative w-full flex flex-col">
            {/* Earth Section - Replace Canvas with raw HTML implementation */}
            <div className="h-full relative flex relative items-start justify-start overflow-hidden z-0 "> 
              <div
                className="
                xl:absolute xl:1 
                xl: w-full xl:h-full
                "
              >

                <EarthComponent
                  ref={earthRef}
                  isMobile={isMobile}
                  isTablet={isTablet}
                  isMedium={isMedium}     
                  onMobileDataCenterClick={handleMobileDataCenterClick}
                />
              </div>
              <div className="xl:absolute xl:top-50 xl:left-4 md:absolute md:top-[40%] md:left-4">
                {/* Note: ZoomControls might need to be adapted or removed since they were for Three.js Canvas */}
                <ZoomControls
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetZoom={handleResetZoom}
                />
              </div>
            </div>

            {/* Cycle Burn Rate Section - Compact */}
            <div className="xl:absolute xl:bottom-40  lg:bottom-40 xl:left-4 bg-transparent flex-shrink-0 p-3 md:p-4">
              <CycleBurnRate tcyclesPerSecond={realTimeMetrics.tcyclesPerSecond} loading={realTimeLoading} />
            </div>
          </div>

          {/* Right Section - Stats Panel */}
          {isWide && (
            <div className="xl:absolute xl:top-15 xl:right-10  xl:w-86 p-2 md:p-4 z-10">
              <StatsPanel metrics={metrics} loading={loading} topCountries={topCountries} />
            </div>
          )}
        </div>

        {/* If not wide, show StatsPanel below the globe */}
        {!isWide && (
          <div className="sm:w-full p-2 md:p-4 z-10 ">
            <StatsPanel metrics={metrics} loading={loading} topCountries={topCountries} />
          </div>
        )}

        {/* Bottom Metrics */}
        <div className=" xl:absolute xl:bottom-0 xl:left-0 w-full bg-transparent z-10">
          <BottomMetrics />
        </div>
      </div>

      {/* Subnets Table */}
      <div className="p-2 md:p-4">
        <SubnetsTable />
      </div>

      {/* First Row of Modules */}
      <div className="p-2 md:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <DataCentersModule />
          <NodeProvidersModule />
          <NodeMachinesModule />
        </div>
      </div>

      {/* Second Row of Modules - Now using the reusable MetricsModule */}
      <div className="p-2 md:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <PowerConsumptionModule />
          <MetricsModule type="instructions" />
          <MetricsModule type="canisters" />
        </div>
      </div>

      {/* Third Row of Modules - New Metrics */}
      <div className="p-2 md:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MetricsModule type="transactions" />
          <MetricsModule type="cycle-burn" />
          <MetricsModule type="finalization" />
        </div>
      </div>

      {/* Fourth Row of Modules - Responsive 2-Column Layout */}
      <div className="p-2 sm:p-3 md:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricsModule type="internet-identities" />
          <MetricsModule type="conversion-rate" />
        </div>
      </div>

      {/* Footer */}
      <FooterDemo/>

      <MobileDataCenterModal
        dataCenter={selectedDataCenter}
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
      />
    </div>
  )
}