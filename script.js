// ===============================
// Nepal Emergency Dashboard: Map Setup & Boundary Loading
// ===============================

// --- Global Variables ---
let map = null
let earthquakeData = []
let riverData = null
let bufferLayer = null
let earthquakeLayer = null
let riverLayer = null
let boundaryLayer = null
let drawLayer = null
let isLoadingEarthquakes = false

// --- Libraries ---
const L = window.L
const turf = window.turf

// --- Base Layers ---
var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
})

var satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: "Tiles © Esri",
    }
)

var cartoDark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors © CARTO",
})

var baseMaps = {
    "🗺️ OpenStreetMap": osm,
    "🛰️ Satellite": satellite,
    "🌑 CartoDB Dark": cartoDark,
}

var overlayMaps = {}

// --- Utility: Wait for Libraries ---
function waitForLibraries() {
    return new Promise((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 50

        const checkLibraries = () => {
            attempts++
            console.log(`🔍 Checking libraries... Attempt ${attempts}/${maxAttempts}`)

            if (window.L && window.turf) {
                console.log("✅ All libraries loaded successfully!")
                resolve()
            } else if (attempts >= maxAttempts) {
                console.error("❌ Libraries failed to load after maximum attempts")
                reject(new Error("Libraries not loaded"))
            } else {
                console.log(`⏳ Waiting for libraries... L: ${!!window.L}, turf: ${!!window.turf}`)
                setTimeout(checkLibraries, 100)
            }
        }

        checkLibraries()
    })
}

// --- Utility: Today's Date ---
function getTodayDate() {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
}

// --- Map Initialization ---
async function initializeMap() {
    try {
        if (!map) {
            map = L.map("map", {
                center: [28.2, 84.0], // Center on Nepal
                zoom: 7,
                zoomControl: true,
                attributionControl: false,
            })
        }

        osm.addTo(map)

        if (!earthquakeLayer) earthquakeLayer = L.layerGroup().addTo(map)
        if (!riverLayer) riverLayer = L.layerGroup().addTo(map)
        if (!boundaryLayer) boundaryLayer = L.layerGroup().addTo(map)
        if (!bufferLayer) bufferLayer = L.layerGroup().addTo(map)
        if (!drawLayer) drawLayer = L.layerGroup().addTo(map)

        L.control.layers(baseMaps, {
            "Earthquakes": earthquakeLayer,
            "Rivers": riverLayer,
            "Boundaries": boundaryLayer,
            "Flood Buffers": bufferLayer,
            "Drawings": drawLayer,
        }).addTo(map)

        syncCustomButtonsWithLayerControl()

        loadBoundaryData()
        loadRiverData()
        loadRealtimeEarthquakeData()

        updateMapStatus("SYSTEM ONLINE", true)
    } catch (error) {
        showMapError()
        updateMapStatus("MAP LOAD FAILED", false)
        console.error("Map initialization error:", error)
    }
}

// --- Map Status Indicator ---
function updateMapStatus(message, isOnline) {
    const statusElement = document.querySelector(".map-status span")
    const indicatorElement = document.querySelector(".status-indicator")

    if (statusElement) {
        statusElement.textContent = message
    }
    if (indicatorElement) {
        indicatorElement.className = isOnline ? "status-indicator active" : "status-indicator offline"
        indicatorElement.style.background = isOnline ? "#00ff00" : "#ff0000"
    }
}

// --- Show Map Error ---
function showMapError() {
    const mapContainer = document.getElementById("map")
    if (mapContainer) {
        mapContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #1a1a1a; color: #ffffff; padding: 2rem; text-align: center;">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ff0000; margin-bottom: 1rem;"></i>
        <h3 style="color: #ff0000; margin-bottom: 1rem; font-family: 'Orbitron', monospace;">🚨 MAP SYSTEM FAILURE</h3>
        <p style="color: #cccccc; margin-bottom: 1.5rem;">Unable to load mapping system. Check network connection.</p>
        <button onclick="retryMapInitialization()" style="padding: 1rem 2rem; background: linear-gradient(135deg, #ff0000, #ff4500); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Orbitron', monospace; font-weight: 700;">
          <i class="fas fa-redo"></i> RETRY SYSTEM
        </button>
      </div>
    `
    }
}

// --- Retry Map Initialization ---
function retryMapInitialization() {
    console.log("🔄 Retrying map initialization...")
    const mapContainer = document.getElementById("map")
    if (mapContainer) {
        mapContainer.innerHTML = ""
    }
    updateMapStatus("RESTARTING...", false)
    setTimeout(initializeMap, 1000)
}

// --- Boundary Layer Initialization and Data Loading ---
function loadBoundaryData() {
    fetch('data/nepal_boundary.geojson')
        .then(response => response.json())
        .then(boundaryGeoJSON => {
            L.geoJSON(boundaryGeoJSON, {
                style: {
                    color: "#0080ff",
                    weight: 3,
                    fillOpacity: 0.1,
                    fillColor: "#0080ff",
                    dashArray: "5, 5",
                },
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`
                        <div style="color: white; font-family: 'Rajdhani', sans-serif;">
                          <h4 style="color:rgb(176, 211, 247); margin-bottom: 8px;">
                            <i class="fas fa-flag"></i> ${feature.properties.name}
                          </h4>
                          <p><strong>Status:</strong> MONITORING ACTIVE</p>
                        </div>
                    `)
                },
            }).addTo(boundaryLayer)

            console.log("✅ Boundary data loaded")
        })
        .catch(err => {
            console.error("❌ Failed to load Nepal boundary:", err)
        })
}

// Load river data
function loadRiverData() {
    fetch('data/nepal_rivers.geojson')
        .then(response => response.json())
        .then(data => {
                riverData = data;
                riverLayer.clearLayers();
                L.geoJSON(riverData, {
                            style: (feature) => ({
                                color: "#00ffff",
                                weight: feature.properties && feature.properties.risk_level === "HIGH" ? 4 : 2,
                                opacity: 0.9,
                                dashArray: feature.properties && feature.properties.risk_level === "HIGH" ? "10, 5" : "none"
                            }),
                            onEachFeature: (feature, layer) => {
                                    const risk = feature.properties && feature.properties.risk_level;
                                    const riskColor = risk === "HIGH" ? "#ff0000" : "#ffa500";
                                    layer.bindPopup(`
                        <div style="color: white; font-family: 'Rajdhani', sans-serif;">
                            <h4 style="color: #00ffff; margin-bottom: 8px;">
                                <i class="fas fa-water"></i> ${feature.properties && feature.properties.name ? feature.properties.name : "River"}
                            </h4>
                            ${risk ? `<p><strong>Risk Level:</strong> <span style="color: ${riskColor};">${risk}</span></p>` : ""}
                            <p><strong>Status:</strong> MONITORING</p>
                        </div>
                    `);
                }
            }).addTo(riverLayer);
            console.log("✅ River data loaded");
        })
        .catch(err => {
            console.error("❌ Failed to load river data:", err);
        });
}

function showLoading(message = "SCANNING FOR SEISMIC ACTIVITY...") {
    const loadingIndicator = document.getElementById("loadingIndicator")
    const loadingText = document.getElementById("loadingText")

    if (loadingIndicator && loadingText) {
        loadingText.textContent = message
        loadingIndicator.classList.add("show")
    }
}

function hideLoading() {
    const loadingIndicator = document.getElementById("loadingIndicator")
    if (loadingIndicator) {
        loadingIndicator.classList.remove("show")
    }
}

// Show data status in control panel
function showDataStatus(message, type = "loading") {
    const controlSection = document.querySelector(".control-section:nth-child(3)")

    // Remove existing status
    const existingStatus = controlSection.querySelector(".data-status")
    if (existingStatus) {
        existingStatus.remove()
    }

    // Add new status
    const statusDiv = document.createElement("div")
    statusDiv.className = `data-status ${type}`
    statusDiv.innerHTML = `
    <i class="fas fa-${type === "loading" ? "spinner fa-spin" : type === "success" ? "check-circle" : "exclamation-triangle"}"></i>
    <span>${message}</span>
  `
    controlSection.appendChild(statusDiv)

    // Auto-remove success/error messages after 5 seconds
    if (type !== "loading") {
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove()
            }
        }, 5000)
    }
}

// Load real-time earthquake data (from 2015 to today)
async function loadRealtimeEarthquakeData() {
    if (isLoadingEarthquakes) return

    isLoadingEarthquakes = true
    showLoading("ACCESSING USGS REAL-TIME DATABASE...")
    showDataStatus("Fetching real-time earthquake data...", "loading")

    try {
        // Get today's date in YYYY-MM-DD format
        const today = getTodayDate()

        // USGS Earthquake API URL for M4+ from 2015-01-01 to today
        const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2015-01-01&endtime=${today}&minmagnitude=4&minlatitude=25&maxlatitude=31&minlongitude=78&maxlongitude=90&limit=10000`

        console.log("🌍 Fetching earthquake data from USGS...")
        console.log("📡 API URL:", usgsUrl)

        const response = await fetch(usgsUrl)

        if (!response.ok) {
            throw new Error(`USGS API Error: ${response.status} - ${response.statusText}`)
        }

        const data = await response.json()

        // Filter for M4+ earthquakes (API already filters, but double-check)
        earthquakeData = data.features.filter((eq) => eq.properties.mag >= 4)

        console.log(`🚨 EMERGENCY ALERT: ${earthquakeData.length} seismic events detected since 2015`)

        // Update statistics
        updateEarthquakeStats()

        // Display earthquakes on map
        displayEarthquakesWithUSGSData()

        // Show success status
        showDataStatus(`Successfully loaded ${earthquakeData.length} earthquake events`, "success")

        // Check for major earthquakes
        const majorEvents = earthquakeData.filter((eq) => eq.properties.mag >= 7).length
        const recentEvents = earthquakeData.filter((eq) => {
            const eventDate = new Date(eq.properties.time)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return eventDate > thirtyDaysAgo
        }).length

        if (majorEvents > 0) {
            console.log(`⚠️ CRITICAL ALERT: ${majorEvents} MAJOR EARTHQUAKE(S) (7.0+) DETECTED!`)
        }

        if (recentEvents > 0) {
            console.log(`📊 Recent Activity: ${recentEvents} earthquakes in the last 30 days`)
        }
    } catch (error) {
        console.error("❌ Emergency system error:", error)
        showDataStatus(`Error: ${error.message}`, "error")

        // Show error in stats
        document.getElementById("totalEarthquakes").textContent = "ERR"
        document.getElementById("majorEarthquakes").textContent = "ERR"
        document.getElementById("avgMagnitude").textContent = "ERR"

        updateMapStatus("DATA LINK FAILED", false)
    } finally {
        hideLoading()
        isLoadingEarthquakes = false
    }
}

// Fetch earthquake data for custom date range
async function fetchEarthquakeData(startDate, endDate) {
    if (isLoadingEarthquakes) return

    isLoadingEarthquakes = true
    showLoading("ACCESSING USGS SEISMIC DATABASE...")
    showDataStatus(`Fetching data from ${startDate} to ${endDate}...`, "loading")

    try {
        const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate}&endtime=${endDate}&minmagnitude=4&minlatitude=25&maxlatitude=31&minlongitude=78&maxlongitude=90&limit=10000`

        console.log("🌍 Fetching custom date range earthquake data...")
        console.log("📡 API URL:", usgsUrl)

        const response = await fetch(usgsUrl)
        if (!response.ok) {
            throw new Error(`USGS API Error: ${response.status} - ${response.statusText}`)
        }

        const data = await response.json()
        earthquakeData = data.features.filter((eq) => eq.properties.mag >= 4)

        console.log(`🚨 ${earthquakeData.length} seismic events detected for date range`)

        updateEarthquakeStats()
        displayEarthquakesWithUSGSData()
        showDataStatus(`Loaded ${earthquakeData.length} events for selected period`, "success")
    } catch (error) {
        console.error("❌ Earthquake data error:", error)
        showDataStatus(`Error: ${error.message}`, "error")

        document.getElementById("totalEarthquakes").textContent = "ERR"
        document.getElementById("majorEarthquakes").textContent = "ERR"
        document.getElementById("avgMagnitude").textContent = "ERR"
    } finally {
        hideLoading()
        isLoadingEarthquakes = false
    }
}

// Display earthquakes with USGS data and proper markers
function displayEarthquakesWithUSGSData() {
    if (!earthquakeLayer || !map || !earthquakeData.length) return

    earthquakeLayer.clearLayers()
    const checkedMagnitudes = getCheckedMagnitudes()
    let displayedCount = 0

    // Add earthquakes as GeoJSON with custom styling
    L.geoJSON(earthquakeData, {
        filter: (feature) => {
            const magnitude = feature.properties.mag
            const magnitudeClass = getMagnitudeClass(magnitude)
            return checkedMagnitudes.includes(magnitudeClass)
        },
        pointToLayer: (feature, latlng) => {
            const magnitude = feature.properties.mag
            const color = getMagnitudeColor(magnitude)
            const radius = Math.max(4, magnitude * 1.5)
            const isPulse = magnitude >= 7

            return L.circleMarker(latlng, {
                radius: radius,
                fillColor: color,
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8,
                className: isPulse ? "pulse-marker" : "",
            })
        },
        onEachFeature: (feature, layer) => {
            displayedCount++

            const props = feature.properties
            const coords = feature.geometry.coordinates
            const magnitude = props.mag
            const place = props.place || "Unknown Location"
            const time = new Date(props.time).toLocaleString()
            const depth = coords[2] || 0
            const color = getMagnitudeColor(magnitude)
            const threatLevel = getThreatLevel(magnitude)

            // Create enhanced popup content
            const popupContent = `
        <div class="earthquake-popup">
          <h4><i class="fas fa-exclamation-triangle"></i> SEISMIC EVENT</h4>
          <div class="detail-row">
            <span class="detail-label">Location:</span>
            <span class="detail-value">${place}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Magnitude:</span>
            <span class="detail-value">
              <span class="magnitude-badge" style="background: ${color};">${magnitude.toFixed(1)}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Threat Level:</span>
            <span class="detail-value" style="color: ${color}; font-weight: bold;">${threatLevel}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Depth:</span>
            <span class="detail-value">${depth.toFixed(1)} km</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${time}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Coordinates:</span>
            <span class="detail-value">${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E</span>
          </div>
          <a href="${props.url}" target="_blank" class="usgs-link">
            <i class="fas fa-external-link-alt"></i> VIEW USGS DETAILS
          </a>
        </div>
      `

            layer.bindPopup(popupContent, {
                maxWidth: 300,
                className: "emergency-popup-wrapper",
            })

            // Add click event for modal
            layer.on("click", () => {
                showEmergencyEarthquakeDetails(feature)
            })
        },
    }).addTo(earthquakeLayer)

    console.log(`🎯 Emergency Display: ${displayedCount} seismic events visualized`)
    updateMapStatus(`${displayedCount} EVENTS TRACKED`, true)
}

// Get magnitude class for filtering
function getMagnitudeClass(magnitude) {
    if (magnitude >= 7) return "7-8"
    if (magnitude >= 6) return "6-7"
    if (magnitude >= 5) return "5-6"
    return "4-5"
}

// Get threat level text
function getThreatLevel(magnitude) {
    if (magnitude >= 7) return "CRITICAL"
    if (magnitude >= 6) return "HIGH"
    if (magnitude >= 5) return "MEDIUM"
    return "LOW"
}

// Emergency color coding
function getMagnitudeColor(magnitude) {
    if (magnitude >= 7) return "#ff0000" // Critical Red
    if (magnitude >= 6) return "#ff4500" // High Orange
    if (magnitude >= 5) return "#ffa500" // Medium Yellow
    return "#0080ff" // Low Blue
}

// Get checked magnitude classes
function getCheckedMagnitudes() {
    const checkboxes = document.querySelectorAll('.threat-level input[type="checkbox"]:checked')
    return Array.from(checkboxes).map((cb) => cb.value)
}

// Show emergency earthquake details in modal
function showEmergencyEarthquakeDetails(feature) {
    const modal = document.getElementById("infoPanel")
    const content = document.getElementById("infoContent")

    if (modal && content) {
        const props = feature.properties
        const coords = feature.geometry.coordinates
        const magnitude = props.mag
        const place = props.place || "Unknown Location"
        const time = new Date(props.time).toLocaleString()
        const depth = coords[2] || 0
        const color = getMagnitudeColor(magnitude)
        const threatLevel = getThreatLevel(magnitude)

        content.innerHTML = `
      <div class="earthquake-popup">
        <h4><i class="fas fa-exclamation-triangle"></i> DETAILED SEISMIC ANALYSIS</h4>
        <div class="detail-row">
          <span class="detail-label">Event ID:</span>
          <span class="detail-value">${props.id || "N/A"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${place}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Magnitude:</span>
          <span class="detail-value">
            <span class="magnitude-badge" style="background: ${color};">${magnitude.toFixed(2)}</span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Threat Level:</span>
          <span class="detail-value" style="color: ${color}; font-weight: bold;">${threatLevel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Depth:</span>
          <span class="detail-value">${depth.toFixed(2)} km</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date & Time:</span>
          <span class="detail-value">${time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Coordinates:</span>
          <span class="detail-value">${coords[1].toFixed(6)}°N, ${coords[0].toFixed(6)}°E</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Magnitude Type:</span>
          <span class="detail-value">${props.magType || "N/A"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value">${props.status || "N/A"}</span>
        </div>
        <a href="${props.url}" target="_blank" class="usgs-link">
          <i class="fas fa-external-link-alt"></i> VIEW FULL USGS REPORT
        </a>
      </div>
    `
        modal.classList.add("show")
    }
}

// Update earthquake statistics
function updateEarthquakeStats() {
    const total = earthquakeData.length
    const major = earthquakeData.filter((eq) => eq.properties.mag >= 7).length
    const avgMag = total > 0 ? (earthquakeData.reduce((sum, eq) => sum + eq.properties.mag, 0) / total).toFixed(1) : 0

    document.getElementById("totalEarthquakes").textContent = total
    document.getElementById("majorEarthquakes").textContent = major
    document.getElementById("avgMagnitude").textContent = avgMag

    // Update map status with current data
    if (total > 0) {
        updateMapStatus(`${total} EVENTS LOADED`, true)
    }
}

// Create buffer around rivers
function createRiverBuffer() {
    if (!riverData || !bufferLayer || !window.turf) return

    const distance = Number.parseInt(document.getElementById("bufferDistance").value)
    bufferLayer.clearLayers()

    riverData.features.forEach((feature) => {
        const buffered = turf.buffer(feature, distance, { units: "meters" })

        L.geoJSON(buffered, {
            style: {
                color: "#00ffff",
                fillColor: "#00ffff",
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "5, 5",
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
          <div style="color: white; font-family: 'Rajdhani', sans-serif;">
            <h4 style="color: #00ffff; margin-bottom: 8px;">
              <i class="fas fa-shield-alt"></i> FLOOD BUFFER ZONE
            </h4>
            <p><strong>Buffer Distance:</strong> ${distance} meters</p>
            <p><strong>Risk Level:</strong> <span style="color: #ffa500;">MODERATE</span></p>
          </div>
        `)
            },
        }).addTo(bufferLayer)
    })

    console.log(`🛡️ Buffer zones created: ${distance}m`)
}

// Clear buffer zones
function clearRiverBuffer() {
    if (bufferLayer) {
        bufferLayer.clearLayers()
        console.log("🧹 Buffer zones cleared")
    }
}

// Sync custom buttons with Leaflet layer control
function syncCustomButtonsWithLayerControl() {
    // Base map button synchronization
    document.querySelectorAll(".basemap-btn").forEach((btn) => {
        btn.addEventListener("click", function() {
            if (!map) return

            const layer = this.dataset.layer

            // Remove active class from all buttons
            document.querySelectorAll(".basemap-btn").forEach((b) => b.classList.remove("active"))
            this.classList.add("active")

            // Remove current base layer
            map.eachLayer((mapLayer) => {
                if (mapLayer === osm || mapLayer === satellite || mapLayer === cartoDark) {
                    map.removeLayer(mapLayer)
                }
            })

            // Add the selected layer
            let targetLayer
            switch (layer) {
                case "satellite":
                    targetLayer = satellite
                    break
                case "cartodb":
                    targetLayer = cartoDark
                    break
                default:
                    targetLayer = osm
            }

            targetLayer.addTo(map)
            console.log(`🗺️ Switched to ${layer} via custom button`)
        })
    })

    // Set default active button
    const defaultBtn = document.querySelector('.basemap-btn[data-layer="osm"]')
    if (defaultBtn) {
        defaultBtn.classList.add("active")
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Emergency Response System Starting...")

    // Set default end date to today
    const today = getTodayDate()
    document.getElementById("endDate").value = today

    // Initialize map
    setTimeout(initializeMap, 1000)

    // Update earthquakes button (custom date range)
    document.getElementById("updateEarthquakes").addEventListener("click", () => {
        const startDate = document.getElementById("startDate").value
        const endDate = document.getElementById("endDate").value

        if (!startDate || !endDate) {
            alert("🚨 Please select both start and end dates")
            return
        }

        fetchEarthquakeData(startDate, endDate)
    })

    // Real-time data button
    document.getElementById("loadRealtimeData").addEventListener("click", () => {
        loadRealtimeEarthquakeData()
    })

    // Magnitude filter checkboxes
    document.querySelectorAll('.threat-level input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            if (earthquakeData.length > 0) {
                displayEarthquakesWithUSGSData()
            }
        })
    })

    // Buffer controls
    document.getElementById("createBuffer").addEventListener("click", createRiverBuffer)
    document.getElementById("clearBuffer").addEventListener("click", clearRiverBuffer)

    // Clear drawings
    document.getElementById("clearDrawings").addEventListener("click", () => {
        if (drawLayer) {
            drawLayer.clearLayers()
        }
    })

    // Close modal
    document.getElementById("closeInfo").addEventListener("click", () => {
        document.getElementById("infoPanel").classList.remove("show")
    })
})

// Handle window resize
window.addEventListener("resize", () => {
    if (map) {
        setTimeout(() => map.invalidateSize(), 100)
    }
})

// Make retry function global
window.retryMapInitialization = retryMapInitialization

console.log("🚨 Emergency Response System Script Loaded")