/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react"

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

export const EarthComponent = forwardRef<EarthComponentRef, EarthComponentProps>(
  ({ isMobile, isTablet, isMedium, onMobileDataCenterClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const earthInstanceRef = useRef<any>(null)
    const isInitialized = useRef(false)
    const spritesCache = useRef<any[]>([])

    // base zoomState; will be kept in sync with props via effect
    const zoomState = useRef({
      current: 1.3,
      min: 1.3,
      max: 1.9,
      step: 0.2
    })

    // keep zoom state in sync with breakpoint props (isMobile/isTablet/isMedium)
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

      // apply immediately if earth already exists
      if (earthInstanceRef.current) {
        applyZoom(zoomState.current.current)
        if (earthInstanceRef.current.update) earthInstanceRef.current.update()
        if (earthInstanceRef.current.render) earthInstanceRef.current.render()
      }
    }, [isMobile, isTablet, isMedium])

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        if (earthInstanceRef.current) {
          const newZoom = Math.min(zoomState.current.current + zoomState.current.step, zoomState.current.max)
          zoomState.current.current = newZoom
          applyZoom(newZoom)
        }
      },
      zoomOut: () => {
        if (earthInstanceRef.current) {
          const newZoom = Math.max(zoomState.current.current - zoomState.current.step, zoomState.current.min)
          zoomState.current.current = newZoom
          applyZoom(newZoom)
        }
      },
      resetZoom: () => {
        if (earthInstanceRef.current) {
          zoomState.current.current = 1.1
          applyZoom(1.1)
        }
      },
      getCurrentZoom: () => zoomState.current.current,
    }))

    const applyZoom = (zoomLevel: number) => {
      if (earthInstanceRef.current && earthInstanceRef.current.camera) {
        const baseDistance = 24
        const newDistance = baseDistance / zoomLevel

        if (earthInstanceRef.current.orbit) {
          earthInstanceRef.current.orbit.minDistance = 8.1
          earthInstanceRef.current.orbit.maxDistance = 50
        }

        if (earthInstanceRef.current.camera.position && earthInstanceRef.current.camera.position.setLength) {
          earthInstanceRef.current.camera.position.setLength(newDistance)
        }

        if (earthInstanceRef.current.camera.updateProjectionMatrix) {
          earthInstanceRef.current.camera.updateProjectionMatrix()
        }

        if (earthInstanceRef.current.orbit) {
          earthInstanceRef.current.orbit.update()
        }

        if (earthInstanceRef.current.update) {
          earthInstanceRef.current.update()
        }
        if (earthInstanceRef.current.render) {
          earthInstanceRef.current.render()
        }
      }
    }

    const disableEarthInteraction = () => {
      if (earthInstanceRef.current) {
        earthInstanceRef.current.autoRotate = false

        if (earthInstanceRef.current.orbit) {
          earthInstanceRef.current.orbit.enabled = false
        }
      }
    }

    const enableEarthInteraction = () => {
      if (earthInstanceRef.current) {
        earthInstanceRef.current.autoRotate = true

        if (earthInstanceRef.current.orbit) {
          earthInstanceRef.current.orbit.enabled = true
        }
      }
    }

    const calculateSmartPopupPosition = (mouseX: number, mouseY: number, earthBounds: DOMRect) => {
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
    }

    const setCursor = (type: 'default' | 'pointer' | 'grab') => {
      if (containerRef.current) {
        containerRef.current.style.cursor = type
      }
    }

    useEffect(() => {
      if (isInitialized.current) return
      if (!containerRef.current) return

      const loadEarthScript = () => {
        return new Promise<void>((resolve, reject) => {
          if ((window as any).Earth) {
            resolve()
            return
          }

          const script = document.createElement("script")
          script.src = "/real-earth.js"
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load Earth script"))
          document.head.appendChild(script)
        })
      }

      const initializeEarth = async () => {
        try {
          await loadEarthScript()

          const earthDiv = document.createElement("div")

          earthDiv.id = "earth-container"
          earthDiv.style.width = "100%"
          earthDiv.style.height = "100%"
          earthDiv.style.position = "relative"

          const popup = document.createElement("div")
          popup.id = "earth-popup"
          popup.className = "earth-popup"
          popup.innerHTML = '<div class="popup-content"></div>'

          const style = document.createElement("style")
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

          if (containerRef.current) {
            containerRef.current.innerHTML = ""
            containerRef.current.appendChild(style)
            containerRef.current.appendChild(earthDiv)
            document.body.appendChild(popup)
          }

          if ((window as any).Earth) {
            const earthWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.5
            const earthHeight = containerRef.current?.offsetHeight || window.innerHeight * 0.5

            const earth = new (window as any).Earth("earth-container", {
              mapImage: "real-hologram.svg",
              quality: 3,
              light: "none",
              autoRotate: true,
              autoRotateDelay: 100,
              autoRotateSpeed: 1.2,
              autoRotateStart: 0,
              //autoRotateStart: 2000,
              transparent: true,
              width: earthWidth,
              height: earthHeight,
              enableUpdate: true,
              enableOcclusion: false,
              enableShadow: false
            })

            earthInstanceRef.current = earth

            setCursor('grab')

            // Apply initial zoom according to device type / medium
            setTimeout(() => {
              if (isMedium) {
                zoomState.current.current = 1
                applyZoom(1)
              } else if (isMobile || isTablet) {
                zoomState.current.current = 1.3
                applyZoom(1.3)
              } else {
                // desktop
                zoomState.current.current = 1.3
                applyZoom(1.3)
              }

              if (earthInstanceRef.current && earthInstanceRef.current.update) {
                earthInstanceRef.current.update()
              }
            }, 50)

            const popupContent = popup.querySelector(".popup-content")

            let currentGroupData: any[] = []
            let currentExpandedIndex = 0
            let isVisible = false
            let hideTimer: NodeJS.Timeout | null = null
            let mouseX = 0
            let mouseY = 0
            let popupPositioned = false
            let isHoveringPopup = false
            let isHoveringDataCenter = false
            let currentHoveredSprite: any = null

            function positionPopup() {
              if (!containerRef.current) return
              const earthBounds = containerRef.current.getBoundingClientRect()
              const { left, top } = calculateSmartPopupPosition(mouseX, mouseY, earthBounds)
              popup.style.left = `${left}px`
              popup.style.top = `${top}px`
              popupPositioned = true
            }

            function showPopup(region: string, group: any[]) {
              if (hideTimer) {
                clearTimeout(hideTimer)
                hideTimer = null
              }

              currentGroupData = group
              currentExpandedIndex = 0
              isVisible = true
              popupPositioned = false
              popup.style.display = "block"
              popup.classList.add("visible")
              renderPopupContent()
              positionPopup()
              disableEarthInteraction()
            }

            function hidePopup() {
              if (hideTimer) return
              hideTimer = setTimeout(() => {
                isVisible = false
                popup.style.display = "none"
                popup.classList.remove("visible")

                currentGroupData = []
                currentExpandedIndex = -1
                hideTimer = null
                enableEarthInteraction()
                setCursor('grab')
              }, 150)
            }

            function renderPopupContent() {
              if (!currentGroupData.length || !popupContent) return
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

              if (popupContent) {
                popupContent.innerHTML = fullHtml
                if (isMultiple) {
                  popupContent.querySelectorAll("[data-index]").forEach((el) => {
                    el.addEventListener("click", (e) => {
                      if (e && typeof e.stopPropagation === 'function') {
                        e.stopPropagation()
                      }
                      const index = Number.parseInt(el.getAttribute("data-index") || "0")
                      toggleDataCenter(index)
                    })
                  })
                }
              }
            }

            function toggleDataCenter(index: number) {
              if (index === currentExpandedIndex) return
              currentExpandedIndex = index
              renderPopupContent()
            }

            // popup positioning / mouse update behavior:
            if (!isMobile && !isTablet && !isMedium) {
              document.addEventListener("mousemove", (e) => {
                mouseX = e.clientX
                mouseY = e.clientY

                if (isVisible && popup.style.display === "block" && !popupPositioned) {
                  requestAnimationFrame(() => {
                    positionPopup()
                  })
                }
              })
            } else {
              document.addEventListener("mousemove", (e) => {
                mouseX = e.clientX
                mouseY = e.clientY
              })
            }

            popup.addEventListener("mouseenter", () => {
              isHoveringPopup = true
              if (hideTimer) {
                clearTimeout(hideTimer)
                hideTimer = null
              }
              setCursor('default')
            })

            popup.addEventListener("mouseleave", () => {
              isHoveringPopup = false
              hidePopup()
            })

            if (containerRef.current && !isMobile && !isTablet && !isMedium) {
              containerRef.current.addEventListener("mouseleave", () => {
                if (isVisible && !isHoveringPopup) {
                  isHoveringDataCenter = false
                  hidePopup()
                }
              })
            }

            if (!isMobile && !isTablet && !isMedium) {
              document.addEventListener("mousemove", (e) => {
                if (isVisible && !isHoveringPopup) {
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
                }
              })
            }

            window.addEventListener("resize", () => {
              if (isVisible && popup.style.display === "block") {
                popupPositioned = false
                requestAnimationFrame(() => {
                  positionPopup()
                })
              }
            })

            fetch("https://ic-api.internetcomputer.org/api/v3/data-centers")
              .then((res) => res.json())
              .then((data) => {
                const centers = data.data_centers.filter((dc: any) => dc.total_nodes > 0)
                const regionMap: { [key: string]: any[] } = {}

                centers.forEach((dc: any) => {
                  (regionMap[dc.region] ||= []).push(dc)
                })

                const regions = Object.keys(regionMap)
                let currentIndex = 0

                const createSpriteBatch = () => {
                  const batchSize = 3
                  const endIndex = Math.min(currentIndex + batchSize, regions.length)

                  for (let i = currentIndex; i < endIndex; i++) {
                    const region = regions[i]
                    const group = regionMap[region]
                    const first = group && group[0]
                    const isMultiple = group && group.length > 1
                    const imageFile = isMultiple ? "real-multiple.svg" : "real-single.svg"

                    // Safety checks: skip if required attributes missing or invalid
                    const hasValidGroup = Array.isArray(group) && group.length > 0
                    const lat = first?.latitude
                    const lng = first?.longitude
                    const hasValidLatLng = typeof lat === "number" && isFinite(lat) && !Number.isNaN(lat) &&
                                           typeof lng === "number" && isFinite(lng) && !Number.isNaN(lng)
                    const hasValidImage = typeof imageFile === "string" && imageFile.length > 0
                    const earthAvailable = earth && typeof earth.addSprite === "function"

                    if (!hasValidGroup || !hasValidLatLng || !hasValidImage || !earthAvailable) {
                      // skip this entry quietly (or log for debugging)
                      // console.warn(`Skipping region "${region}" - invalid data or earth not ready`, { first })
                      continue
                    }

                    try {
                      const sprite = earth.addSprite({
                        image: imageFile,
                        location: { lat: first.latitude, lng: first.longitude },
                        scale: 0.3,
                        opacity: 1,
                        hotspot: true,
                        imageResolution: 512,
                      })

                      if (!sprite) {
                        // if addSprite returned falsy, skip binding events
                        continue
                      }

                      sprite.addEventListener("mouseover", () => {
                        if (isMobile || isTablet) {
                          return
                        }

                        if (currentHoveredSprite === sprite) return
                        currentHoveredSprite = sprite
                        isHoveringDataCenter = true
                        setCursor('default')
                        showPopup(region, group)
                      })

                      sprite.addEventListener("mouseout", () => {
                        if (isMobile || isTablet) {
                          return
                        }

                        if (currentHoveredSprite === sprite) {
                          currentHoveredSprite = null
                          isHoveringDataCenter = false
                          if (!isHoveringPopup) {
                            setTimeout(() => {
                              if (!isHoveringDataCenter && !isHoveringPopup) {
                                hidePopup()
                              }
                            }, 100)
                          }
                        }
                      })

                      sprite.addEventListener("click", (e: Event) => {
                        if (e && typeof e.preventDefault === 'function') {
                          e.preventDefault()
                        }

                        // open mobile modal only for actual mobile/tablet (not medium)
                        if ((isMobile || isTablet) && !isMedium && onMobileDataCenterClick) {
                          onMobileDataCenterClick(first)
                        }
                      })

                      spritesCache.current.push(sprite)
                    } catch (err) {
                      // If sprite creation or event binding fails for this entry, skip it
                      // console.error("Failed to create or bind sprite for region", region, err)
                      continue
                    }
                  }

                  currentIndex = endIndex

                  if (currentIndex < regions.length) {
                    setTimeout(createSpriteBatch, 50)
                  }
                }

                createSpriteBatch()
              })
              .catch(console.error)
          }
        } catch (error) {
          console.error("Error loading Earth script:", error)
        }
      }

      initializeEarth()
      isInitialized.current = true

      return () => {
        if (earthInstanceRef.current?.destroy) {
          earthInstanceRef.current.destroy()
        }

        spritesCache.current = []

        const popup = document.getElementById("earth-popup")
        if (popup && popup.parentNode) {
          popup.parentNode.removeChild(popup)
        }
      }
    }, [isMobile, isTablet, isMedium, onMobileDataCenterClick])

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
