"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronDown, ChevronUp } from "lucide-react"

const dashboardLinks = [
  "Home", "Governance", "Neurons", "Subnets", "Data Centers", "Releases", "Canisters",
  "ICP Transactions", "Circulation", "Node Providers", "Node Machines", "SNS", "SNS Tokenomics Analyzer",
  "Chain Fusion", "Bitcoin", "Ethereum", "Changelog"
]
const icLinks = [
  "Internet Computer Home", "Run a Node Machine", "Submit a Proposal"
]
const supportLinks = [
  "IC Support", "View Status", "IC Wiki", "Developer Forum", "Developer Grants"
]

function FooterSection({ title, links, open, onToggle, isMobile }: {
  title: string, links: string[], open?: boolean, onToggle?: () => void, isMobile?: boolean
}) {
  return (
    <div>
      <div
        className={`flex items-center justify-between ${isMobile ? "py-3 border-b border-gray-700" : "mb-3"}`}
        onClick={isMobile ? onToggle : undefined}
        style={{ cursor: isMobile ? "pointer" : "default" }}
      >
        <span className={`font-semibold ${isMobile ? "text-base text-white" : "text-sm text-white"}`}>{title}</span>
        {isMobile && (
          open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>
      {(open || !isMobile) && (
        <ul className={`${isMobile ? "pl-2 pb-2" : ""} space-y-2`}>
          {links.map(link => (
            <li key={link}>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors flex items-center">
                {link}
                {link === "View Status" && (
                  <span className="ml-2 bg-white text-gray-800 text-xs px-2 py-0.5 rounded-full font-medium">Working</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FooterDemo() {
  const [openSections, setOpenSections] = useState<{[k: string]: boolean}>({
    "ICP Dashboard": false,
    "Internet Computer": false,
    "Support": false,
  })

  // Responsive breakpoints
  const [width, setWidth] = useState(1200)
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener("resize", handleResize)
    setWidth(window.innerWidth)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  const isMobile = width <= 600
  const isTablet = width > 600 && width <= 950
  const isDesktop = width > 950

  // For SSR hydration safety, use state
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // Accordion toggle
  const handleToggle = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="bg-[#16161d] flex flex-col">
      <footer className="w-full px-4 md:px-8 py-8 bg-[#16161d]">
        {/* Logo */}
        <div className="mb-8 flex items-center">
          <Image src="/images.svg" alt="ICP Logo" width={32} height={32} className="w-8 h-8 mr-2" />
          <span className="font-bold text-white text-lg">ICP DASHBOARD</span>
        </div>

        {/* Desktop: 3 columns */}
        {isDesktop && (
          <div className="grid grid-cols-3 gap-12 mb-8">
            <div>
              <span className="font-semibold text-sm text-white mb-3 block">ICP Dashboard</span>
              <ul className="space-y-2">
                {dashboardLinks.map(link => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors flex items-center">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-semibold text-sm text-white mb-3 block">Internet Computer</span>
              <ul className="space-y-2">
                {icLinks.map(link => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors flex items-center">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-semibold text-sm text-white mb-3 block">Support</span>
              <ul className="space-y-2">
                {supportLinks.map(link => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors flex items-center">
                      {link}
                      {link === "View Status" && (
                        <span className="ml-2 bg-white text-gray-800 text-xs px-2 py-0.5 rounded-full font-medium">Working</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tablet: 3 columns, but more compact */}
        {isTablet && (
          <div className="grid grid-cols-3 gap-6 mb-8">
            <FooterSection title="ICP Dashboard" links={dashboardLinks} />
            <FooterSection title="Internet Computer" links={icLinks} />
            <FooterSection title="Support" links={supportLinks} />
          </div>
        )}

        {/* Mobile: Accordion */}
        {isMobile && (
          <div className="space-y-2 mb-8">
            <FooterSection
              title="ICP Dashboard"
              links={dashboardLinks}
              open={openSections["ICP Dashboard"]}
              onToggle={() => handleToggle("ICP Dashboard")}
              isMobile
            />
            <FooterSection
              title="Internet Computer"
              links={icLinks}
              open={openSections["Internet Computer"]}
              onToggle={() => handleToggle("Internet Computer")}
              isMobile
            />
            <FooterSection
              title="Support"
              links={supportLinks}
              open={openSections["Support"]}
              onToggle={() => handleToggle("Support")}
              isMobile
            />
          </div>
        )}

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-6 mt-6 text-gray-400 text-sm">
          © 2025 Internet Computer
        </div>
      </footer>
    </div>
  )
}