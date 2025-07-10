// Advanced Diagnostic System for Map Loading Issues
console.log("🔍 STARTING ADVANCED DIAGNOSTICS...")

// 1. Test Network Connectivity
async function testNetworkConnectivity() {
  console.log("📡 Testing Network Connectivity...")

  const testUrls = [
    "https://tile.openstreetmap.org/0/0/0.png",
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0",
    "https://a.basemaps.cartocdn.com/dark_all/0/0/0.png",
    "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1",
  ]

  const results = {}

  for (const url of testUrls) {
    try {
      const startTime = Date.now()
      const response = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      })
      const endTime = Date.now()

      results[url] = {
        status: "SUCCESS",
        time: endTime - startTime,
        accessible: true,
      }
      console.log(`✅ ${url} - OK (${endTime - startTime}ms)`)
    } catch (error) {
      results[url] = {
        status: "FAILED",
        error: error.message,
        accessible: false,
      }
      console.log(`❌ ${url} - FAILED: ${error.message}`)
    }
  }

  return results
}

// 2. Test Browser Capabilities
function testBrowserCapabilities() {
  console.log("🌐 Testing Browser Capabilities...")

  const capabilities = {
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled,
    language: navigator.language,
    platform: navigator.platform,
    webGL: !!window.WebGLRenderingContext,
    canvas: !!document.createElement("canvas").getContext,
    localStorage: !!window.localStorage,
    sessionStorage: !!window.sessionStorage,
    geolocation: !!navigator.geolocation,
    touchSupport: "ontouchstart" in window,
    screenSize: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
  }

  console.table(capabilities)
  return capabilities
}

// 3. Test Library Loading
function testLibraryLoading() {
  console.log("📚 Testing Library Loading...")

  const libraries = {
    leaflet: {
      loaded: !!window.L,
      version: window.L ? window.L.version : "Not loaded",
      mapClass: !!(window.L && window.L.Map),
      tileLayerClass: !!(window.L && window.L.TileLayer),
      geoJSONClass: !!(window.L && window.L.GeoJSON),
    },
    turf: {
      loaded: !!window.turf,
      version: window.turf ? window.turf.version || "Unknown" : "Not loaded",
      bufferFunction: !!(window.turf && window.turf.buffer),
      distanceFunction: !!(window.turf && window.turf.distance),
    },
    jquery: {
      loaded: !!window.$,
      version: window.$ ? window.$.fn.jquery || "Unknown" : "Not loaded",
    },
  }

  console.table(libraries)
  return libraries
}

// 4. Test DOM Elements
function testDOMElements() {
  console.log("🏗️ Testing DOM Elements...")

  const elements = {
    mapContainer: {
      exists: !!document.getElementById("map"),
      visible: document.getElementById("map")
        ? window.getComputedStyle(document.getElementById("map")).display !== "none"
        : false,
      dimensions: document.getElementById("map")
        ? `${document.getElementById("map").offsetWidth}x${document.getElementById("map").offsetHeight}`
        : "N/A",
    },
    controlPanel: {
      exists: !!document.querySelector(".control-panel"),
      visible: document.querySelector(".control-panel")
        ? window.getComputedStyle(document.querySelector(".control-panel")).display !== "none"
        : false,
    },
    basemapButtons: {
      count: document.querySelectorAll(".basemap-btn").length,
      activeButton: document.querySelector(".basemap-btn.active")
        ? document.querySelector(".basemap-btn.active").dataset.layer
        : "None",
    },
  }

  console.table(elements)
  return elements
}

// 5. Test Tile Loading Directly
async function testTileLoading() {
  console.log("🗺️ Testing Direct Tile Loading...")

  return new Promise((resolve) => {
    const testImage = new Image()
    const startTime = Date.now()

    testImage.onload = () => {
      const loadTime = Date.now() - startTime
      console.log(`✅ Test tile loaded successfully in ${loadTime}ms`)
      resolve({
        success: true,
        loadTime: loadTime,
        dimensions: `${testImage.width}x${testImage.height}`,
      })
    }

    testImage.onerror = (error) => {
      console.log(`❌ Test tile failed to load:`, error)
      resolve({
        success: false,
        error: "Image load failed",
      })
    }

    testImage.crossOrigin = "anonymous"
    testImage.src = "https://tile.openstreetmap.org/0/0/0.png?" + Date.now()
  })
}

// 6. Comprehensive System Report
async function generateSystemReport() {
  console.log("📊 GENERATING COMPREHENSIVE SYSTEM REPORT...")

  const report = {
    timestamp: new Date().toISOString(),
    network: await testNetworkConnectivity(),
    browser: testBrowserCapabilities(),
    libraries: testLibraryLoading(),
    dom: testDOMElements(),
    tileTest: await testTileLoading(),
  }

  // Display report in a readable format
  console.log("=" * 50)
  console.log("🚨 EMERGENCY RESPONSE SYSTEM DIAGNOSTIC REPORT")
  console.log("=" * 50)

  // Network Status
  console.log("\n📡 NETWORK STATUS:")
  const networkIssues = Object.values(report.network).filter((r) => !r.accessible).length
  console.log(
    `- Accessible Services: ${Object.keys(report.network).length - networkIssues}/${Object.keys(report.network).length}`,
  )
  console.log(`- Network Issues: ${networkIssues > 0 ? "❌ YES" : "✅ NO"}`)

  // Browser Status
  console.log("\n🌐 BROWSER STATUS:")
  console.log(`- Online: ${report.browser.online ? "✅" : "❌"}`)
  console.log(`- Platform: ${report.browser.platform}`)
  console.log(`- Viewport: ${report.browser.viewportSize}`)

  // Library Status
  console.log("\n📚 LIBRARY STATUS:")
  console.log(`- Leaflet: ${report.libraries.leaflet.loaded ? "✅" : "❌"} ${report.libraries.leaflet.version}`)
  console.log(`- Turf.js: ${report.libraries.turf.loaded ? "✅" : "❌"}`)

  // DOM Status
  console.log("\n🏗️ DOM STATUS:")
  console.log(
    `- Map Container: ${report.dom.mapContainer.exists ? "✅" : "❌"} (${report.dom.mapContainer.dimensions})`,
  )
  console.log(`- Visible: ${report.dom.mapContainer.visible ? "✅" : "❌"}`)

  // Tile Loading Status
  console.log("\n🗺️ TILE LOADING:")
  console.log(`- Direct Tile Test: ${report.tileTest.success ? "✅" : "❌"}`)
  if (report.tileTest.success) {
    console.log(`- Load Time: ${report.tileTest.loadTime}ms`)
  }

  console.log("\n" + "=" * 50)

  return report
}

// 7. Auto-fix Common Issues
function attemptAutoFix() {
  console.log("🔧 ATTEMPTING AUTO-FIX...")

  const fixes = []

  // Fix 1: Clear browser cache programmatically
  try {
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name)
        })
      })
      fixes.push("✅ Browser cache cleared")
    }
  } catch (error) {
    fixes.push("❌ Could not clear cache: " + error.message)
  }

  // Fix 2: Reset map container
  const mapContainer = document.getElementById("map")
  if (mapContainer) {
    mapContainer.innerHTML = ""
    mapContainer.style.height = "100%"
    mapContainer.style.width = "100%"
    mapContainer.style.position = "relative"
    fixes.push("✅ Map container reset")
  }

  // Fix 3: Force reload critical resources
  const leafletCSS = document.querySelector('link[href*="leaflet"]')
  if (leafletCSS) {
    const newCSS = leafletCSS.cloneNode()
    newCSS.href = leafletCSS.href + "?v=" + Date.now()
    leafletCSS.parentNode.replaceChild(newCSS, leafletCSS)
    fixes.push("✅ Leaflet CSS reloaded")
  }

  console.log("🔧 Auto-fix results:")
  fixes.forEach((fix) => console.log(fix))

  return fixes
}

// Make functions globally available for manual testing
window.testNetworkConnectivity = testNetworkConnectivity
window.testBrowserCapabilities = testBrowserCapabilities
window.testLibraryLoading = testLibraryLoading
window.testDOMElements = testDOMElements
window.testTileLoading = testTileLoading
window.generateSystemReport = generateSystemReport
window.attemptAutoFix = attemptAutoFix

// Auto-run diagnostics when script loads
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(async () => {
    console.log("🚀 AUTO-RUNNING DIAGNOSTICS...")
    const report = await generateSystemReport()

    // Store report for later access
    window.lastDiagnosticReport = report

    // Suggest fixes based on findings
    console.log("\n💡 SUGGESTED FIXES:")

    const networkIssues = Object.values(report.network).filter((r) => !r.accessible).length
    if (networkIssues > 0) {
      console.log("❌ Network connectivity issues detected:")
      console.log("   - Try using a VPN")
      console.log("   - Check firewall settings")
      console.log("   - Try a different network")
    }

    if (!report.libraries.leaflet.loaded) {
      console.log("❌ Leaflet library not loaded:")
      console.log("   - Check internet connection")
      console.log("   - Verify CDN accessibility")
    }

    if (!report.dom.mapContainer.exists) {
      console.log("❌ Map container missing:")
      console.log("   - Check HTML structure")
      console.log("   - Verify element IDs")
    }

    if (!report.tileTest.success) {
      console.log("❌ Tile loading failed:")
      console.log("   - Network/firewall blocking tiles")
      console.log("   - Try different tile server")
    }
  }, 2000)
})

console.log("🔍 Advanced Diagnostic System Loaded")
console.log("💡 Run 'generateSystemReport()' in console for full diagnosis")
