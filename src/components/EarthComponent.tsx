/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react"

interface EarthComponentProps {
  isMobile?: boolean
  isTablet?: boolean
  isMedium?: boolean
  onMobileDataCenterClick?: (dataCenter: any) => void
}

export interface EarthComponentRef {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  getCurrentZoom: () => number
}

interface DataCenter {
  key: string
  name: string
  owner: string
  region: string
  latitude: number
  longitude: number
  total_nodes: number
  total_replica_nodes?: number
  total_api_boundary_nodes?: number
  node_providers: number
  subnets?: any[]
}

interface EarthInstance {
  addSprite: (config: any) => any
  destroy?: () => void
  update?: () => void
  render?: () => void
  camera?: any
  orbit?: any
  autoRotate?: boolean
}

export const EarthComponent = forwardRef<EarthComponentRef, EarthComponentProps>(
  ({ isMobile = false, isTablet = false, isMedium = false, onMobileDataCenterClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const earthInstanceRef = useRef<EarthInstance | null>(null)
    const isInitialized = useRef(false)
    const isInitializing = useRef(false)
    const spritesCache = useRef<any[]>([])
    const isRecovering = useRef(false)
    const dataCentersData = useRef<DataCenter[]>([])
    const contextLostCount = useRef(0)
    const cleanupFunctions = useRef<(() => void)[]>([])
    const popupFunctionsRef = useRef<{
      showPopup: (region: string, group: DataCenter[]) => void
      hidePopup: () => void
    } | null>(null)
    const maxRecoveryAttempts = 3
    const animationFrameRef = useRef<number | null>(null)
    const timeoutRefs = useRef<NodeJS.Timeout[]>([])

    // Ref to allow recoverWebGLContext -> initializeEarth without direct circular deps
    const initializeEarthRef = useRef<(() => Promise<void>) | null>(null)

    // Base zoomState; will be kept in sync with props via effect
    const zoomState = useRef({
      current: 1.3,
      min: 1.3,
      max: 1.9,
      step: 0.2
    })

    // Utility function to safely clear timeouts
    const addTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
      const timeout = setTimeout(callback, delay)
      timeoutRefs.current.push(timeout)
      return timeout
    }, [])

    const clearAllTimeouts = useCallback(() => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current = []
    }, [])

    // Keep zoom state in sync with breakpoint props
    useEffect(() => {
      const initial = isMedium ? 1 : 1.3
      const min = isMedium ? 1 : 1.3
      const max = isMobile ? 1.6 : isTablet ? 1.8 : isMedium ? 1.4 : 1.9

      zoomState.current = {
        current: initial,
        min,
        max,
        step: 0.2
      }

      // Apply immediately if earth already exists
      if (earthInstanceRef.current && !isRecovering.current && !isInitializing.current) {
        try {
          applyZoom(zoomState.current.current)
          if (earthInstanceRef.current.update) earthInstanceRef.current.update()
          if (earthInstanceRef.current.render) earthInstanceRef.current.render()
        } catch (error) {
          console.warn("[EARTH] Error applying zoom during props change:", error)
        }
      }
    }, [isMobile, isTablet, isMedium])

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        if (earthInstanceRef.current && !isRecovering.current && !isInitializing.current) {
          try {
            const newZoom = Math.min(zoomState.current.current + zoomState.current.step, zoomState.current.max)
            zoomState.current.current = newZoom
            applyZoom(newZoom)
          } catch (error) {
            console.warn("[EARTH] Error during zoom in:", error)
          }
        }
      },
      zoomOut: () => {
        if (earthInstanceRef.current && !isRecovering.current && !isInitializing.current) {
          try {
            const newZoom = Math.max(zoomState.current.current - zoomState.current.step, zoomState.current.min)
            zoomState.current.current = newZoom
            applyZoom(newZoom)
          } catch (error) {
            console.warn("[EARTH] Error during zoom out:", error)
          }
        }
      },
      resetZoom: () => {
        if (earthInstanceRef.current && !isRecovering.current && !isInitializing.current) {
          try {
            zoomState.current.current = 1.1
            applyZoom(1.1)
          } catch (error) {
            console.warn("[EARTH] Error during zoom reset:", error)
          }
        }
      },
      getCurrentZoom: () => zoomState.current.current,
    }))

    const applyZoom = useCallback((zoomLevel: number) => {
      if (!earthInstanceRef.current || isRecovering.current || isInitializing.current) return

      try {
        const earth = earthInstanceRef.current
        const baseDistance = 24
        const newDistance = baseDistance / zoomLevel

        if (earth.orbit) {
          earth.orbit.minDistance = 8.1
          earth.orbit.maxDistance = 50
        }

        if (earth.camera?.position?.setLength) {
          earth.camera.position.setLength(newDistance)
        }

        if (earth.camera?.updateProjectionMatrix) {
          earth.camera.updateProjectionMatrix()
        }

        if (earth.orbit?.update) {
          earth.orbit.update()
        }

        if (earth.update) {
          earth.update()
        }
        if (earth.render) {
          earth.render()
        }
      } catch (error) {
        console.warn("[EARTH] Error in applyZoom:", error)
      }
    }, [])

    const disableEarthInteraction = useCallback(() => {
      if (!earthInstanceRef.current || isRecovering.current) return

      try {
        const earth = earthInstanceRef.current
        earth.autoRotate = false

        if (earth.orbit) {
          earth.orbit.enabled = false
        }
      } catch (error) {
        console.warn("[EARTH] Error disabling interaction:", error)
      }
    }, [])

    const enableEarthInteraction = useCallback(() => {
      if (!earthInstanceRef.current || isRecovering.current) return

      try {
        const earth = earthInstanceRef.current
        earth.autoRotate = true

        if (earth.orbit) {
          earth.orbit.enabled = true
        }
      } catch (error) {
        console.warn("[EARTH] Error enabling interaction:", error)
      }
    }, [])

    const calculateSmartPopupPosition = useCallback((mouseX: number, mouseY: number, earthBounds: DOMRect) => {
      const popupWidth = 380
      const popupHeight = 500
      const margin = 20

      const earthSectionLeft = earthBounds.left
      const earthSectionRight = earthBounds.right
      const earthSectionTop = earthBounds.top
      const earthSectionBottom = earthBounds.bottom

      const spaceRight = earthSectionRight - mouseX
      const spaceLeft = mouseX - earthSectionLeft
      const spaceBelow = earthSectionBottom - mouseY
      const spaceAbove = mouseY - earthSectionTop

      let left = mouseX
      let top = mouseY

      if (spaceRight >= popupWidth + margin) {
        left = mouseX + margin
      } else if (spaceLeft >= popupWidth + margin) {
        left = mouseX - popupWidth - margin
      } else {
        left = Math.max(
          earthSectionLeft + margin,
          Math.min(mouseX - popupWidth / 2, earthSectionRight - popupWidth - margin)
        )
      }

      if (spaceBelow >= popupHeight + margin) {
        top = mouseY + margin
      } else if (spaceAbove >= popupHeight + margin) {
        top = mouseY - popupHeight - margin
      } else {
        top = spaceBelow > spaceAbove
          ? Math.max(mouseY - popupHeight + spaceBelow - margin, earthSectionTop + margin)
          : Math.min(mouseY - margin, earthSectionBottom - popupHeight - margin)
      }

      left = Math.max(earthSectionLeft + margin, Math.min(left, earthSectionRight - popupWidth - margin))
      top = Math.max(earthSectionTop + margin, Math.min(top, earthSectionBottom - popupHeight - margin))

      return { left, top }
    }, [])

    const setCursor = useCallback((type: 'default' | 'pointer' | 'grab') => {
      if (containerRef.current) {
        containerRef.current.style.cursor = type
      }
    }, [])

    // recoverWebGLContext uses initializeEarthRef.current to avoid direct circular-dependency
    const recoverWebGLContext = useCallback(async () => {
      if (isRecovering.current || isInitializing.current || contextLostCount.current >= maxRecoveryAttempts) {
        console.warn(`[EARTH] Recovery blocked - recovering: ${isRecovering.current}, initializing: ${isInitializing.current}, attempts: ${contextLostCount.current}`)
        return
      }

      isRecovering.current = true
      contextLostCount.current++
      console.info(`[EARTH] Attempting WebGL context recovery (attempt ${contextLostCount.current}/${maxRecoveryAttempts})`)

      try {
        // Clear any ongoing operations
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        clearAllTimeouts()

        // Clean up existing instance more thoroughly
        if (earthInstanceRef.current) {
          try {
            if (earthInstanceRef.current.destroy) {
              earthInstanceRef.current.destroy()
            }
          } catch (err) {
            console.warn("[EARTH] Error destroying earth instance during recovery:", err)
          }
          earthInstanceRef.current = null
        }

        // Clear sprites cache
        spritesCache.current = []

        // Clean up popup
        const popup = document.getElementById("earth-popup")
        if (popup) {
          popup.style.display = "none"
          popup.classList.remove("visible")
        }

        // Wait longer for GPU to recover
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Verify container still exists
        if (!containerRef.current) {
          console.warn("[EARTH] Container no longer exists, aborting recovery")
          return
        }

        // Recreate the earth instance by calling the current initializeEarth if available
        if (initializeEarthRef.current) {
          await initializeEarthRef.current()
          console.info("[EARTH] WebGL context recovery successful")
        } else {
          console.warn("[EARTH] initializeEarth not available on recovery")
        }
      } catch (error) {
        console.error("[EARTH] WebGL context recovery failed:", error)

        // If recovery failed and we haven't reached max attempts, try again later
        if (contextLostCount.current < maxRecoveryAttempts) {
          addTimeout(() => {
            recoverWebGLContext()
          }, 5000)
        }
      } finally {
        isRecovering.current = false
      }
    }, [clearAllTimeouts, addTimeout])

    const setupWebGLContextHandlers = useCallback((canvas: HTMLCanvasElement) => {
      const contextLostHandler = (ev: Event) => {
        ev.preventDefault()
        console.warn("[EARTH] WebGL context lost event")
        console.log("Shit error comes in");
        // Hide any visible popups immediately
        const popup = document.getElementById("earth-popup")
        if (popup) {
          popup.style.display = "none"
          popup.classList.remove("visible")
        }

        // Clear any ongoing operations
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }

        clearAllTimeouts()
        console.log("Coming out of the function");
      }

      const contextRestoredHandler = () => {
        console.log("come on man ");
        console.info("[EARTH] WebGL context restored")
        // Wait for the context to be fully restored before attempting recovery
        addTimeout(() => {
          if (!isRecovering.current && contextLostCount.current < maxRecoveryAttempts) {
            recoverWebGLContext()
          }
        }, 1000) // Increased delay to ensure context is fully restored
      }

      canvas.addEventListener("webglcontextlost", contextLostHandler)
      canvas.addEventListener("webglcontextrestored", contextRestoredHandler)

      // Store cleanup function
      const cleanup = () => {
        canvas.removeEventListener("webglcontextlost", contextLostHandler)
        canvas.removeEventListener("webglcontextrestored", contextRestoredHandler)
      }
      cleanupFunctions.current.push(cleanup)

      return cleanup
    }, [addTimeout, clearAllTimeouts, recoverWebGLContext])

    const loadEarthScript = useCallback((): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).Earth) {
          console.info("[EARTH] Earth already present on window")
          resolve()
          return
        }

        console.info("[EARTH] injecting script /real-earth.js")
        const script = document.createElement("script")
        script.src = "/real-earth.js"
        script.async = true
        script.onload = () => {
          console.info("[EARTH] real-earth.js loaded")
          resolve()
        }
        script.onerror = (err) => {
          console.error("[EARTH] failed to load real-earth.js", err)
          reject(new Error("Failed to load Earth script"))
        }
        document.head.appendChild(script)

        // Cleanup function for script
        cleanupFunctions.current.push(() => {
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
        })
      })
    }, [])

    // Popup functionality setup
    const setupPopupFunctionality = useCallback((popup: HTMLElement) => {
      const popupContent = popup.querySelector(".popup-content")
      let currentGroupData: DataCenter[] = []
      let currentExpandedIndex = 0
      let isVisible = false
      let hideTimer: NodeJS.Timeout | null = null
      let mouseX = 0
      let mouseY = 0
      let popupPositioned = false
      let isHoveringPopup = false
      let isHoveringDataCenter = false

      const positionPopup = () => {
        if (!containerRef.current) return
        try {
          const earthBounds = containerRef.current.getBoundingClientRect()
          const { left, top } = calculateSmartPopupPosition(mouseX, mouseY, earthBounds)
          popup.style.left = `${left}px`
          popup.style.top = `${top}px`
          popupPositioned = true
        } catch (error) {
          console.warn("[EARTH] Error positioning popup:", error)
        }
      }

      const showPopup = (region: string, group: DataCenter[]) => {
        if (isRecovering.current || isInitializing.current) return

        try {
          if (hideTimer) {
            clearTimeout(hideTimer)
            hideTimer = null
          }

          currentGroupData = [...group] // Create a copy to avoid mutation issues
          currentExpandedIndex = 0
          isVisible = true
          popupPositioned = false
          popup.style.display = "block"
          popup.classList.add("visible")
          renderPopupContent()
          positionPopup()
          disableEarthInteraction()
        } catch (error) {
          console.warn("[EARTH] Error showing popup:", error)
        }
      }

      const hidePopup = () => {
        if (hideTimer || isRecovering.current) return

        hideTimer = addTimeout(() => {
          try {
            isVisible = false
            popup.style.display = "none"
            popup.classList.remove("visible")
            currentGroupData = []
            currentExpandedIndex = -1
            hideTimer = null
            enableEarthInteraction()
            setCursor('grab')
          } catch (error) {
            console.warn("[EARTH] Error hiding popup:", error)
          }
        }, 150)
      }

      const renderPopupContent = () => {
        if (!currentGroupData.length || !popupContent) return

        try {
          const firstDC = currentGroupData[0]
          const isMultiple = currentGroupData.length > 1

          const countryCode = firstDC.region.split(",")[1]?.trim()?.toLowerCase() || "un"
          const flagHtml = `<img src="https://flagcdn.com/w20/${countryCode}.png" alt="${countryCode} flag" onerror="this.style.display='none'; this.parentElement.innerHTML='🌍';" />`

          const regionParts = firstDC.region.split(",")
          const regionDisplay = regionParts.length >= 3
            ? `${regionParts[0]},${regionParts[1]},${regionParts[2]}`
            : firstDC.region

          let bodyHtml = ""

          if (isMultiple) {
            bodyHtml = currentGroupData
              .map((dc, index) => {
                const isExpanded = index === currentExpandedIndex

                if (isExpanded) {
                  return `
                  <div class="datacenter-item">
                    <div class="datacenter-header" data-index="${index}">
                      <div class="datacenter-name">${dc.name}</div>
                      <div class="expand-icon expanded">▼</div>
                    </div>
                    <div class="datacenter-details expanded">
                      <div class="detail-row">
                        <span class="detail-label">Data Center ID</span>
                        <span class="detail-value"><span class="detail-id">${dc.key}</span></span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Data Center Owner</span>
                        <span class="detail-value">${dc.owner}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Replica Nodes</span>
                        <span class="detail-value">${dc.total_replica_nodes || dc.total_nodes}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">API Boundary Nodes</span>
                        <span class="detail-value">${dc.total_api_boundary_nodes || 0}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Total Nodes</span>
                        <span class="detail-value">${dc.total_nodes}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Node Providers</span>
                        <span class="detail-value">${dc.node_providers}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Subnets</span>
                        <span class="detail-value">${dc.subnets ? dc.subnets.length : 0}</span>
                      </div>
                    </div>
                  </div>
                `
                } else {
                  return `
                  <div class="collapsed-item" data-index="${index}">
                    <div class="collapsed-name">${dc.name}</div>
                    <svg class="collapsed-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                `
                }
              })
              .join("")
          } else {
            const dc = firstDC
            bodyHtml = `
              <div class="datacenter-item">
                <div class="datacenter-header">
                  <div class="datacenter-name">${dc.name}</div>
                  <div class="expand-icon expanded">▼</div>
                </div>
                <div class="datacenter-details expanded">
                  <div class="detail-row">
                    <span class="detail-label">Data Center ID</span>
                    <span class="detail-value"><span class="detail-id">${dc.key}</span></span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Data Center Owner</span>
                    <span class="detail-value">${dc.owner}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Replica Nodes</span>
                    <span class="detail-value">${dc.total_replica_nodes || dc.total_nodes}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">API Boundary Nodes</span>
                    <span class="detail-value">${dc.total_api_boundary_nodes || 0}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Total Nodes</span>
                    <span class="detail-value">${dc.total_nodes}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Node Providers</span>
                    <span class="detail-value">${dc.node_providers}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Subnets</span>
                    <span class="detail-value">${dc.subnets ? dc.subnets.length : 0}</span>
                  </div>
                </div>
              </div>
            `
          }

          const fullHtml = `
            <div class="popup-header">
              <div class="popup-flag">${flagHtml}</div>
              <div class="popup-region">${regionDisplay}</div>
            </div>
            <div class="popup-body">${bodyHtml}</div>
          `

          popupContent.innerHTML = fullHtml

          if (isMultiple) {
            popupContent.querySelectorAll("[data-index]").forEach((el) => {
              const clickHandler = (e: Event) => {
                e?.stopPropagation?.()
                const index = Number.parseInt(el.getAttribute("data-index") || "0")
                toggleDataCenter(index)
              }
              el.addEventListener("click", clickHandler)

              // Store cleanup function
              cleanupFunctions.current.push(() => {
                el.removeEventListener("click", clickHandler)
              })
            })
          }
        } catch (error) {
          console.warn("[EARTH] Error rendering popup content:", error)
        }
      }

      const toggleDataCenter = (index: number) => {
        if (index === currentExpandedIndex) return
        currentExpandedIndex = index
        renderPopupContent()
      }

      // Mouse movement tracking
      const mouseMoveHandler = (e: MouseEvent) => {
        mouseX = e.clientX
        mouseY = e.clientY

        if (isVisible && popup.style.display === "block" && !popupPositioned) {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
          }
          animationFrameRef.current = requestAnimationFrame(() => {
            positionPopup()
          })
        }
      }

      document.addEventListener("mousemove", mouseMoveHandler)
      cleanupFunctions.current.push(() => {
        document.removeEventListener("mousemove", mouseMoveHandler)
      })

      const popupMouseEnterHandler = () => {
        isHoveringPopup = true
        if (hideTimer) {
          clearTimeout(hideTimer)
          hideTimer = null
        }
        setCursor('default')
      }

      const popupMouseLeaveHandler = () => {
        isHoveringPopup = false
        hidePopup()
      }

      popup.addEventListener("mouseenter", popupMouseEnterHandler)
      popup.addEventListener("mouseleave", popupMouseLeaveHandler)

      cleanupFunctions.current.push(() => {
        popup.removeEventListener("mouseenter", popupMouseEnterHandler)
        popup.removeEventListener("mouseleave", popupMouseLeaveHandler)
      })

      if (containerRef.current && !isMobile && !isTablet && !isMedium) {
        const containerMouseLeaveHandler = () => {
          if (isVisible && !isHoveringPopup) {
            isHoveringDataCenter = false
            hidePopup()
          }
        }

        containerRef.current.addEventListener("mouseleave", containerMouseLeaveHandler)
        cleanupFunctions.current.push(() => {
          containerRef.current?.removeEventListener("mouseleave", containerMouseLeaveHandler)
        })
      }

      if (!isMobile && !isTablet && !isMedium) {
        const globalMouseMoveHandler = (e: MouseEvent) => {
          if (isVisible && !isHoveringPopup) {
            try {
              const popupRect = popup.getBoundingClientRect()
              const isOverPopup = (
                e.clientX >= popupRect.left &&
                e.clientX <= popupRect.right &&
                e.clientY >= popupRect.top &&
                e.clientY <= popupRect.bottom
              )

              if (!isOverPopup && !isHoveringDataCenter) {
                hidePopup()
              }
            } catch (error) {
              console.warn("[EARTH] Error in global mouse move handler:", error)
            }
          }
        }

        document.addEventListener("mousemove", globalMouseMoveHandler)
        cleanupFunctions.current.push(() => {
          document.removeEventListener("mousemove", globalMouseMoveHandler)
        })
      }

      const resizeHandler = () => {
        if (isVisible && popup.style.display === "block") {
          popupPositioned = false
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
          }
          animationFrameRef.current = requestAnimationFrame(() => {
            positionPopup()
          })
        }
      }

      window.addEventListener("resize", resizeHandler)
      cleanupFunctions.current.push(() => {
        window.removeEventListener("resize", resizeHandler)
      })

      // Store popup functions in ref for external access
      popupFunctionsRef.current = {
        showPopup,
        hidePopup
      }

      return { showPopup, hidePopup }
    }, [isMobile, isTablet, isMedium, calculateSmartPopupPosition, disableEarthInteraction, enableEarthInteraction, setCursor, addTimeout])

    const createSprites = useCallback((earth: EarthInstance, centers: DataCenter[]) => {
      if (!earth || !centers || centers.length === 0 || !popupFunctionsRef.current || isRecovering.current) return

      try {
        const { showPopup, hidePopup } = popupFunctionsRef.current

        const regionMap: { [key: string]: DataCenter[] } = {}
        centers.forEach((dc: DataCenter) => {
          if (!regionMap[dc.region]) {
            regionMap[dc.region] = []
          }
          regionMap[dc.region].push(dc)
        })

        const regions = Object.keys(regionMap)
        let currentIndex = 0

        const createSpriteBatch = () => {
          if (isRecovering.current || isInitializing.current) return

          const batchSize = 3 // Reduced batch size for more stability
          const endIndex = Math.min(currentIndex + batchSize, regions.length)

          for (let i = currentIndex; i < endIndex; i++) {
            try {
              const region = regions[i]
              const group = regionMap[region]
              const first = group?.[0]
              const isMultiple = group && group.length > 1
              const imageFile = isMultiple ? "real-multiple.svg" : "real-single.svg"

              // Enhanced validation
              const hasValidGroup = Array.isArray(group) && group.length > 0
              const lat = first?.latitude
              const lng = first?.longitude
              const hasValidLatLng = typeof lat === "number" && isFinite(lat) && !Number.isNaN(lat) &&
                                     typeof lng === "number" && isFinite(lng) && !Number.isNaN(lng) &&
                                     lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
              const hasValidImage = typeof imageFile === "string" && imageFile.length > 0
              const earthAvailable = earth && typeof earth.addSprite === "function"

              if (!hasValidGroup || !hasValidLatLng || !hasValidImage || !earthAvailable) {
                console.warn(`[EARTH] Skipping region "${region}" - invalid data`, { 
                  hasValidGroup, hasValidLatLng, hasValidImage, earthAvailable, first 
                })
                continue
              }

              const sprite = earth.addSprite({
                image: imageFile,
                location: { lat: first.latitude, lng: first.longitude },
                scale: 0.2, // Reduced scale for better performance
                opacity: 1,
                hotspot: true,
                imageResolution: 32,
              })

              if (!sprite) {
                console.warn(`[EARTH] Failed to create sprite for region "${region}"`)
                continue
              }

              // Event handlers with proper error handling
              const handleMouseOver = () => {
                if (isMobile || isTablet || isRecovering.current || isInitializing.current) return
                try {
                  setCursor('default')
                  showPopup(region, group)
                } catch (error) {
                  console.warn("[EARTH] Error in sprite mouseover:", error)
                }
              }

              const handleMouseOut = () => {
                if (isMobile || isTablet || isRecovering.current || isInitializing.current) return
                try {
                  hidePopup()
                } catch (error) {
                  console.warn("[EARTH] Error in sprite mouseout:", error)
                }
              }

              const handleClick = (e: Event) => {
                if (isRecovering.current || isInitializing.current) return
                try {
                  e?.preventDefault?.()
                  if ((isMobile || isTablet) && !isMedium && onMobileDataCenterClick && first) {
                    onMobileDataCenterClick(first)
                  }
                } catch (error) {
                  console.warn("[EARTH] Error in sprite click:", error)
                }
              }

              sprite.addEventListener("mouseover", handleMouseOver)
              sprite.addEventListener("mouseout", handleMouseOut)
              sprite.addEventListener("click", handleClick)

              spritesCache.current.push(sprite)

              // Store cleanup functions
              cleanupFunctions.current.push(() => {
                try {
                  sprite.removeEventListener("mouseover", handleMouseOver)
                  sprite.removeEventListener("mouseout", handleMouseOut)
                  sprite.removeEventListener("click", handleClick)
                } catch (error) {
                  console.warn("[EARTH] Error cleaning up sprite listeners:", error)
                }
              })
            } catch (err) {
              console.warn(`[EARTH] Failed to create sprite for region "${regions[i]}"`, err)
              continue
            }
          }

          currentIndex = endIndex

          if (currentIndex < regions.length && !isRecovering.current && !isInitializing.current) {
            addTimeout(() => createSpriteBatch(), 150) // Increased delay for stability
          }
        }

        createSpriteBatch()
      } catch (error) {
        console.error("[EARTH] Error in createSprites:", error)
      }
    }, [isMobile, isTablet, isMedium, onMobileDataCenterClick, setCursor, addTimeout])

    const initializeEarth = useCallback(async () => {
      if (!containerRef.current || isInitializing.current) return

      isInitializing.current = true
      console.info("[EARTH] Starting Earth initialization")

      try {
        await loadEarthScript()

        // Clear existing content more safely
        if (containerRef.current) {
          const existingEarthDiv = containerRef.current.querySelector("#earth-container")
          if (existingEarthDiv) {
            existingEarthDiv.remove()
          }
        }

        const earthDiv = document.createElement("div")
        earthDiv.id = "earth-container"
        earthDiv.style.cssText = `
          width: 100%;
          height: 100%;
          position: relative;
        `

        // Create or reuse popup
        let popup = document.getElementById("earth-popup")
        if (!popup) {
          popup = document.createElement("div")
          popup.id = "earth-popup"
          popup.className = "earth-popup"
          popup.innerHTML = '<div class="popup-content"></div>'
          document.body.appendChild(popup)

          // Store cleanup function for popup
          cleanupFunctions.current.push(() => {
            if (popup && popup.parentNode) {
              popup.parentNode.removeChild(popup)
            }
          })
        }

        // Create styles
        const existingStyle = document.getElementById("earth-popup-styles")
        if (!existingStyle) {
          const style = document.createElement("style")
          style.id = "earth-popup-styles"
          style.textContent = `
            .earth-interaction-disabled {
              pointer-events: none !important;
            }

            .earth-interaction-disabled canvas {
              pointer-events: none !important;
              cursor: default !important;
            }

            .earth-popup {
              position: fixed;
              background: linear-gradient(135deg, #2D1B69 0%, #1A0B3D 100%);
              color: #fff;
              border-radius: 12px;
              font-size: 14px;
              display: none;
              min-width: 320px;
              max-width: 380px;
              max-height: 80vh;
              z-index: 9999;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
              pointer-events: auto;
              border: 1px solid rgba(139, 92, 246, 0.3);
              backdrop-filter: blur(20px);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              opacity: 0;
              transform: scale(0.95);
              transition: opacity 0.15s ease, transform 0.15s ease;
              overflow: hidden;
              cursor: default;
              will-change: transform, opacity;
            }

            .earth-popup.visible {
              opacity: 1;
              transform: scale(1);
            }

            .popup-header {
              padding: 16px 20px 12px 20px;
              border-bottom: 1px solid rgba(139, 92, 246, 0.2);
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .popup-flag {
              width: 20px;
              height: 15px;
              border-radius: 2px;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #4F46E5;
            }

            .popup-flag img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .popup-region {
              color: #A78BFA;
              font-size: 13px;
              font-weight: 500;
            }

            .popup-body {
              padding: 0 0 20px 0;
              max-height: calc(80vh - 60px);
              overflow-y: auto;
            }

            .popup-body::-webkit-scrollbar {
              width: 6px;
            }

            .popup-body::-webkit-scrollbar-track {
              background: rgba(139, 92, 246, 0.1);
              border-radius: 3px;
            }

            .popup-body::-webkit-scrollbar-thumb {
              background: rgba(139, 92, 246, 0.5);
              border-radius: 3px;
            }

            .popup-body::-webkit-scrollbar-thumb:hover {
              background: rgba(139, 92, 246, 0.7);
            }

            .datacenter-item {
              border-bottom: 1px solid rgba(139, 92, 246, 0.1);
            }

            .datacenter-item:last-child {
              border-bottom: none;
            }

            .datacenter-header {
              padding: 16px 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              cursor: pointer;
              transition: background-color 0.15s ease;
            }

            .datacenter-header:hover {
              background: rgba(139, 92, 246, 0.1);
            }

            .datacenter-name {
              font-size: 18px;
              font-weight: 600;
              color: #FFFFFF;
            }

            .expand-icon {
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #A78BFA;
              transition: transform 0.15s ease;
            }

            .expand-icon.expanded {
              transform: rotate(180deg);
            }

            .datacenter-details {
              padding: 0 20px 20px 20px;
              display: none;
            }

            .datacenter-details.expanded {
              display: block;
            }

            .detail-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px solid rgba(139, 92, 246, 0.1);
            }

            .detail-row:last-child {
              border-bottom: none;
            }

            .detail-label {
              color: #A78BFA;
              font-size: 13px;
              font-weight: 500;
            }

            .detail-value {
              color: #FFFFFF;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .detail-id {
              color: #8B5CF6;
              font-family: 'Monaco', 'Menlo', monospace;
              font-size: 12px;
            }

            .collapsed-item {
              padding: 12px 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              cursor: pointer;
              transition: background-color 0.15s ease;
              border-bottom: 1px solid rgba(139, 92, 246, 0.1);
            }

            .collapsed-item:hover {
              background: rgba(139, 92, 246, 0.05);
            }

            .collapsed-item:last-child {
              border-bottom: none;
            }

            .collapsed-name {
              color: #E2E8F0;
              font-size: 16px;
              font-weight: 500;
            }

            .collapsed-icon {
              width: 16px;
              height: 16px;
              color: #64748B;
            }
          `
          document.head.appendChild(style)

          // Store cleanup function for styles
          cleanupFunctions.current.push(() => {
            if (style.parentNode) {
              style.parentNode.removeChild(style)
            }
          })
        }

        if (containerRef.current) {
          containerRef.current.appendChild(earthDiv)
        }

        // Verify Earth is available
        if (!(window as any).Earth) {
          throw new Error("Earth library not available")
        }

        const earthWidth = containerRef.current?.offsetWidth || Math.floor(window.innerWidth * 0.5)
        const earthHeight = containerRef.current?.offsetHeight || Math.floor(window.innerHeight * 0.5)

        console.info(`[EARTH] Creating Earth instance with dimensions: ${earthWidth}x${earthHeight}`)

        const earth = new (window as any).Earth("earth-container", {
          mapImage: "real-hologram.svg",
          quality: 2,
          light: "none",
          autoRotate: true,
          autoRotateDelay: 100,
          autoRotateSpeed: 1.2,
          autoRotateStart: 0,
          transparent: true,
          width: earthWidth,
          height: earthHeight,
          enableUpdate: true,
          enableOcclusion: false,
          enableShadow: false
        }) as EarthInstance

        if (!earth) {
          throw new Error("Failed to create Earth instance")
        }

        earthInstanceRef.current = earth
        console.info("[EARTH] Earth instance created successfully")

        // Setup WebGL context handlers
        const canvas = document.querySelector("#earth-container canvas") as HTMLCanvasElement
        if (canvas) {
          console.info("[EARTH] Setting up WebGL context handlers")
          setupWebGLContextHandlers(canvas)
        } else {
          console.warn("[EARTH] Canvas element not found")
        }

        setCursor('grab')

        // Apply initial zoom with delay to ensure earth is ready
        addTimeout(() => {
          if (isRecovering.current || !earthInstanceRef.current) return

          try {
            let initialZoom = 1.3
            if (isMedium) {
              initialZoom = 1
              zoomState.current.current = 1
            } else if (isMobile || isTablet) {
              initialZoom = 1.3
              zoomState.current.current = 1.3
            } else {
              initialZoom = 1.3
              zoomState.current.current = 1.3
            }

            applyZoom(initialZoom)

            if (earthInstanceRef.current?.update) {
              earthInstanceRef.current.update()
            }
          } catch (error) {
            console.warn("[EARTH] Error applying initial zoom:", error)
          }
        }, 100)

        // Setup popup functionality
        setupPopupFunctionality(popup)

        // Load data centers and create sprites
        if (dataCentersData.current.length > 0) {
          console.info("[EARTH] Using cached data centers")
          addTimeout(() => {
            if (!isRecovering.current && earthInstanceRef.current) {
              createSprites(earthInstanceRef.current, dataCentersData.current)
            }
          }, 200)
        } else {
          console.info("[EARTH] Fetching data centers")
          try {
            const response = await fetch("https://ic-api.internetcomputer.org/api/v3/data-centers")
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            const centers = data.data_centers?.filter((dc: any) => dc && dc.total_nodes > 0) || []
            dataCentersData.current = centers
            console.info(`[EARTH] Loaded ${centers.length} data centers`)

            addTimeout(() => {
              if (!isRecovering.current && earthInstanceRef.current) {
                createSprites(earthInstanceRef.current, centers)
              }
            }, 200)
          } catch (error) {
            console.error("[EARTH] Failed to fetch data centers:", error)
            // Try to use any cached data as fallback
            if (dataCentersData.current.length > 0) {
              addTimeout(() => {
                if (!isRecovering.current && earthInstanceRef.current) {
                  createSprites(earthInstanceRef.current, dataCentersData.current)
                }
              }, 200)
            }
          }
        }

        console.info("[EARTH] Earth initialization completed")
      } catch (error) {
        console.error("[EARTH] Error initializing Earth:", error)
        throw error
      } finally {
        isInitializing.current = false
      }
    }, [
      loadEarthScript,
      setupPopupFunctionality,
      setupWebGLContextHandlers,
      createSprites,
      isMedium,
      isMobile,
      isTablet,
      applyZoom,
      setCursor,
      addTimeout
    ])

    // expose initializeEarth to the recover function via ref
    initializeEarthRef.current = initializeEarth

    // Main effect for initialization
    useEffect(() => {
      if (isInitialized.current || !containerRef.current) return

      console.info("[EARTH] Starting component initialization")

      // Global error handlers
      const errorHandler = (e: ErrorEvent) => {
        console.error("[EARTH] Global error:", e.error)
      }

      const rejectionHandler = (e: PromiseRejectionEvent) => {
        console.error("[EARTH] Unhandled promise rejection:", e.reason)
      }

      window.addEventListener("error", errorHandler)
      window.addEventListener("unhandledrejection", rejectionHandler)

      // Store cleanup functions
      cleanupFunctions.current.push(() => {
        window.removeEventListener("error", errorHandler)
        window.removeEventListener("unhandledrejection", rejectionHandler)
      })

      // Initialize Earth
      initializeEarth().catch(error => {
        console.error("[EARTH] Failed to initialize Earth:", error)
        // Retry initialization after delay if not recovering
        if (!isRecovering.current && contextLostCount.current < maxRecoveryAttempts) {
          addTimeout(() => {
            initializeEarth()
          }, 3000)
        }
      })

      isInitialized.current = true

      // Cleanup function
      return () => {
        console.info("[EARTH] Cleaning up Earth component")

        // Clear any ongoing operations
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }

        clearAllTimeouts()

        // Execute all stored cleanup functions
        cleanupFunctions.current.forEach(cleanup => {
          try {
            cleanup()
          } catch (error) {
            console.warn("[EARTH] Error during cleanup:", error)
          }
        })
        cleanupFunctions.current = []

        // Destroy Earth instance
        try {
          if (earthInstanceRef.current?.destroy) {
            earthInstanceRef.current.destroy()
          }
        } catch (err) {
          console.warn("[EARTH] Error during Earth instance cleanup:", err)
        }

        // Reset refs
        earthInstanceRef.current = null
        spritesCache.current = []
        popupFunctionsRef.current = null
        isRecovering.current = false
        isInitializing.current = false
        contextLostCount.current = 0
        isInitialized.current = false

        // Clean up popup
        const popup = document.getElementById("earth-popup")
        if (popup && popup.parentNode) {
          popup.parentNode.removeChild(popup)
        }

        // Clean up styles
        const styles = document.getElementById("earth-popup-styles")
        if (styles && styles.parentNode) {
          styles.parentNode.removeChild(styles)
        }
      }
    }, [initializeEarth, clearAllTimeouts, addTimeout])

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          cursor: "default"
        }}
      />
    )
  }
)

EarthComponent.displayName = "EarthComponent"
