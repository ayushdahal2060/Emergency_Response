// --- API Key for OpenWeatherMap ---
const apiKey = "4a9c74bbdd11cad13b84eb1bde289453";

// --- Map and Basemaps ---
const map = L.map("map").setView([28.0, 84.0], 7);

const baseMaps = {
    "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "Â© OpenStreetMap contributors" }),
    "Esri WorldImagery": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles Â© Esri" }),
    "OpenTopoMap": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { attribution: "Map data: Â© OpenStreetMap contributors, SRTM | Map style: Â© OpenTopoMap" })
};
baseMaps["OpenStreetMap"].addTo(map);

// --- Layer Groups ---
const weatherLayer = L.layerGroup().addTo(map);
const districtBoundaryLayer = L.layerGroup().addTo(map);
const riversLayer = L.layerGroup().addTo(map);
const earthquakeLayer = L.layerGroup();
let riversVisible = true;

// --- Load Nepal boundary GeoJSON ---
fetch("data/boundary_nepal.geojson")
    .then(res => res.json())
    .then(geojson => {
        L.geoJSON(geojson, {
            style: { color: "#555", weight: 2, fillOpacity: 0.1 },
            onEachFeature: (feature, layer) => {
                let popup = '';
                if (feature.properties) {
                    popup = Object.entries(feature.properties).map(([k, v]) => `<b>${k}</b>: ${v}`).join('<br>');
                }
                layer.bindPopup(popup || 'Nepal Boundary');
            }
        }).addTo(districtBoundaryLayer);
    });

// --- Rivers Layer ---
fetch("data/river_nepal.geojson")
    .then(res => res.json())
    .then(geojson => {
        const riverGeoLayer = L.geoJSON(geojson, {
            style: { color: "aqua", weight: 2 },
            onEachFeature: (feature, layer) => {
                let popup = '';
                if (feature.properties) {
                    popup = Object.entries(feature.properties).map(([k, v]) => `<b>${k}</b>: ${v}`).join('<br>');
                }
                layer.bindPopup(popup || 'River');
            }
        });
        riverGeoLayer.addTo(riversLayer);
    });

const showRiversBtn = document.getElementById('showRiversBtn');
showRiversBtn.addEventListener('click', function () {
    if (riversVisible) {
        map.removeLayer(riversLayer);
        riversVisible = false;
        showRiversBtn.textContent = 'Show Rivers';
    } else {
        map.addLayer(riversLayer);
        riversVisible = true;
        showRiversBtn.textContent = 'Hide Rivers';
    }
});

// --- Flood Zone Polygon (Demo) ---
const floodZoneCoords = [
    [27.6, 83.2], [27.7, 83.5], [27.8, 84.0], [27.7, 84.3], [27.5, 84.2], [27.4, 83.7], [27.6, 83.2]
];
const floodZoneLayer = L.polygon(floodZoneCoords, { color: 'red', fillColor: 'red', fillOpacity: 0.3, weight: 2 })
    .bindPopup('<b>Suspected Flood Zone</b>... Terai Region (Demo)');
const controlsDiv = document.getElementById('controls');
const floodBtn = L.DomUtil.create('button', 'flood-zone-btn');
floodBtn.textContent = 'Show Flood Zone';
floodBtn.style.margin = '10px 0 10px 10px';
floodBtn.style.padding = '5px 10px';
floodBtn.style.fontSize = '1em';
controlsDiv.appendChild(floodBtn);
let floodVisible = false;
floodBtn.addEventListener('click', function () {
    if (floodVisible) {
        map.removeLayer(floodZoneLayer);
        floodBtn.textContent = 'Show Flood Zone';
        floodVisible = false;
    } else {
        map.addLayer(floodZoneLayer);
        floodBtn.textContent = 'Hide Flood Zone';
        floodVisible = true;
    }
});

// --- District HQs Dropdown ---
const districtHQs = [ /* ... your full districtHQs array ... */];
const select = document.getElementById("districtSelect");
districtHQs.forEach(({ district, hq, lat, lon }) => {
    const option = document.createElement("option");
    option.value = JSON.stringify({ lat, lon, district, hq });
    option.text = `${district} - ${hq}`;
    select.add(option);
});
document.getElementById("zoomNepalBtn").onclick = () => {
    map.setView([28.0, 84.0], 7);
    weatherLayer.clearLayers();
    document.getElementById("attrTable").innerHTML = "";
};

// --- Weather Button ---
document.getElementById("showWeatherBtn").addEventListener("click", () => {
    const selectedValue = select.value;
    if (!selectedValue) {
        alert("Please select a district HQ.");
        return;
    }
    const { lat, lon, district, hq } = JSON.parse(selectedValue);
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`)
        .then((res) => res.json())
        .then((data) => {
            if (!data || !data.main || !data.weather) {
                alert("Weather data not available for this location.");
                return;
            }
            const popupContent = `<b>${district} HQ - ${hq}</b><br>
        ðŸŒ¡ï¸ Temperature: ${data.main.temp} Â°C<br>
        ðŸ’§ Humidity: ${data.main.humidity}%<br>
        ðŸŒ¥ï¸ Condition: ${data.weather[0].description}<br>`;
            weatherLayer.clearLayers();
            const marker = L.marker([lat, lon]).addTo(weatherLayer);
            marker.bindPopup(popupContent).openPopup();
            map.setView([lat, lon], 10);
            document.getElementById("attrTable").innerHTML = `
        <b>District:</b> ${district}<br>
        <b>Headquarter:</b> ${hq}<br>
        <b>Latitude:</b> ${lat.toFixed(4)}<br>
        <b>Longitude:</b> ${lon.toFixed(4)}<br>
        <b>Temperature (Â°C):</b> ${data.main.temp}<br>
        <b>Humidity (%):</b> ${data.main.humidity}<br>
        <b>Weather:</b> ${data.weather[0].description}<br>
      `;
        })
        .catch((err) => {
            console.error(err);
            alert("Error fetching weather data.");
        });
});

// --- Leaflet.draw ---
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
const drawControl = new L.Control.Draw({
    draw: { polygon: true, polyline: true, rectangle: true, circle: true, marker: true, circlemarker: false },
    edit: { featureGroup: drawnItems, remove: true }
});
map.addControl(drawControl);
map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.addLayer(e.layer);
});

// --- Search Bar ---
const searchInput = L.DomUtil.create('input', 'search-bar');
searchInput.type = 'text';
searchInput.placeholder = 'Search place...';
searchInput.style.margin = '10px';
searchInput.style.padding = '5px';
searchInput.style.width = '200px';
controlsDiv.parentNode.insertBefore(searchInput, controlsDiv.nextSibling);
searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const query = searchInput.value;
        if (!query) return;
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(results => {
                if (results && results.length > 0) {
                    const r = results[0];
                    map.setView([r.lat, r.lon], 12);
                    L.marker([r.lat, r.lon]).addTo(map).bindPopup(r.display_name).openPopup();
                } else {
                    alert('Place not found!');
                }
            });
    }
});

// --- Enhanced Legend ---
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.background = '#fff';
    div.style.padding = '10px';
    div.style.border = '2px solid #333';
    div.style.borderRadius = '6px';
    div.style.fontSize = '12px';
    div.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.3)';
    div.innerHTML =
        '<b>ðŸ—ºï¸ Map Legend</b><br>' +
        '<b>Earthquake Magnitude:</b><br>' +
        '<span style="color:red;">7.0+ (Major)</span><br>' +
        '<span style="color:orange;">6.0 - 6.9</span><br>' +
        '<span style="color:beige;">5.0 - 5.9</span><br>' +
        '<span style="color:blue;">&lt; 5.0</span><br>' +
        '<b>Other Features:</b><br>Rivers<br>Flood Areas... Flood Zones';
    return div;
};
legend.addTo(map);

// --- Earthquake Data Integration ---
let earthquakeData = null;
let earthquakeVisible = false;
const eqMenu = document.getElementById('eqClassMenu');
const eqStartDate = document.getElementById('eqStartDate');
const eqEndDate = document.getElementById('eqEndDate');
const eqMinMag = document.getElementById('eqMinMag');
const eqRegion = document.getElementById('eqRegion');
const updateEarthquakeBtn = document.getElementById('updateEarthquakeBtn');
const eqStats = document.getElementById('eqStats');
eqEndDate.value = new Date().toISOString().split('T')[0];
const eqClasses = [
    { label: 'All', min: 0, max: 10 },
    { label: '>= 7 (Red)', min: 7, max: 10 },
    { label: '6 - 6.9 (Orange)', min: 6, max: 6.9 },
    { label: '5 - 5.9 (Beige)', min: 5, max: 5.9 },
    { label: '< 5 (Blue)', min: 0, max: 4.99 }
];

// --- Fetch Earthquake Data ---
function fetchEarthquakeData() {
    const start = eqStartDate.value;
    const end = eqEndDate.value;
    const minMag = eqMinMag.value || 2.5;
    const region = eqRegion.value;
    let url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson";
    url += `&starttime=${start}&endtime=${end}&minmagnitude=${minMag}`;
    if (region === "Nepal") {
        url += "&minlatitude=25&maxlatitude=31&minlongitude=78&maxlongitude=90";
    }
    url += "&limit=1000";
    fetch(url)
        .then(res => res.json())
        .then(data => {
            earthquakeData = data;
            loadEarthquakes(eqMenu.selectedIndex || 0);
        })
        .catch(err => {
            alert("Failed to fetch earthquake data.");
            console.error(err);
        });
}

// --- Display Earthquakes on Map ---
function loadEarthquakes(classIndex = 0) {
    earthquakeLayer.clearLayers();
    if (!earthquakeData) return;
    const cls = eqClasses[classIndex];
    let filteredCount = 0;
    let magStats = { total: 0, max: 0, min: 10, avg: 0 };
    let magSum = 0;
    earthquakeData.features.forEach(feature => {
        const mag = feature.properties.mag || 0;
        magStats.total++;
        magStats.max = Math.max(magStats.max, mag);
        magStats.min = Math.min(magStats.min, mag);
        magSum += mag;
        if (classIndex === 0 || (mag >= cls.min && mag <= cls.max)) {
            filteredCount++;
            const coords = feature.geometry.coordinates;
            const latlng = [coords[1], coords[0]];
            let color = 'blue';
            if (mag >= 7) color = 'red';
            else if (mag >= 6) color = 'orange';
            else if (mag >= 5) color = 'beige';
            const marker = L.circleMarker(latlng, {
                radius: 4 + mag * 2,
                color: color,
                fillOpacity: 0.7
            });
            const date = new Date(feature.properties.time).toLocaleString();
            const depth = coords[2] ? `${coords[2]} km` : 'Unknown';
            const popupContent = `<b>Magnitude:</b> ${mag}<br>
        <b>Depth:</b> ${depth}<br>
        <b>Location:</b> ${feature.properties.place}<br>
        <b>Time:</b> ${date}<br>
        <a href="${feature.properties.url}" target="_blank">More info</a>`;
            marker.bindPopup(popupContent);
            marker.addTo(earthquakeLayer);
        }
    });
    earthquakeLayer.addTo(map);
    magStats.avg = (magStats.total > 0) ? (magSum / magStats.total).toFixed(2) : 0;
    eqStats.innerHTML = `<b>Total Events:</b> ${magStats.total}<br>
    <b>Filtered:</b> ${filteredCount}<br>
    <b>Max Mag:</b> ${magStats.max}<br>
    <b>Min Mag:</b> ${magStats.min}<br>
    <b>Avg Mag:</b> ${magStats.avg}`;
}

// --- Earthquake Controls ---
updateEarthquakeBtn.addEventListener('click', fetchEarthquakeData);
eqMenu.addEventListener('change', () => loadEarthquakes(eqMenu.selectedIndex));
document.getElementById('showEarthquakeBtn').addEventListener('click', () => {
    earthquakeVisible = !earthquakeVisible;
    if (earthquakeVisible) {
        map.addLayer(earthquakeLayer);
        document.getElementById('showEarthquakeBtn').textContent = 'Hide Earthquakes';
        if (!earthquakeData) fetchEarthquakeData();
    } else {
        map.removeLayer(earthquakeLayer);
        document.getElementById('showEarthquakeBtn').textContent = 'Show Earthquakes';
    }
});

// --- Optional: Initial Earthquake Data Load ---
fetchEarthquakeData();