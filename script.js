// Global variables
let map;
let marker;
let pathLayer;
let pathPoints = [];
let currentLuggageId = null;
let updateInterval = null;
let speedGaugeChart;

// Mock database - All luggage data
const mockDatabase = {
    "LUG-001": {
        luggage_id: "LUG-001",
        owner_name: "John Smith",
        owner_phone: "+1234567890",
        destination: "JFK Airport, New York",
        weight: "23.5 kg",
        status: "in_transit",
        current_location: { lat: 40.6413, lng: -73.7781 },
        last_update: new Date().toISOString(),
        speed: 45,
        satellites: 8,
        signal: "Good",
        battery: "85%",
        history: [
            { event_time: new Date(Date.now() - 3600000).toISOString(), latitude: 40.6400, longitude: -73.7770, status: "checked_in" },
            { event_time: new Date(Date.now() - 1800000).toISOString(), latitude: 40.6405, longitude: -73.7775, status: "security_check" },
            { event_time: new Date(Date.now() - 600000).toISOString(), latitude: 40.6410, longitude: -73.7780, status: "sorting_area" }
        ],
        alerts: [
            { message: "Luggage checked in successfully", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "success", icon: "fa-check-circle" },
            { message: "Luggage passed security screening", timestamp: new Date(Date.now() - 1800000).toISOString(), type: "success", icon: "fa-check-circle" },
            { message: "Luggage entered sorting area", timestamp: new Date(Date.now() - 600000).toISOString(), type: "warning", icon: "fa-exclamation-triangle" }
        ]
    },
    "LUG-002": {
        luggage_id: "LUG-002",
        owner_name: "Sarah Johnson",
        owner_phone: "+1987654321",
        destination: "LAX Airport, Los Angeles",
        weight: "18.2 kg",
        status: "arrived",
        current_location: { lat: 33.9425, lng: -118.4080 },
        last_update: new Date().toISOString(),
        speed: 0,
        satellites: 6,
        signal: "Excellent",
        battery: "92%",
        history: [
            { event_time: new Date(Date.now() - 7200000).toISOString(), latitude: 33.9400, longitude: -118.4050, status: "checked_in" },
            { event_time: new Date(Date.now() - 5400000).toISOString(), latitude: 33.9410, longitude: -118.4060, status: "in_transit" },
            { event_time: new Date(Date.now() - 1800000).toISOString(), latitude: 33.9425, longitude: -118.4080, status: "arrived" }
        ],
        alerts: [
            { message: "Luggage arrived at destination", timestamp: new Date(Date.now() - 1800000).toISOString(), type: "success", icon: "fa-check-circle" }
        ]
    },
    "LUG-003": {
        luggage_id: "LUG-003",
        owner_name: "Michael Chen",
        owner_phone: "+1122334455",
        destination: "ORD Airport, Chicago",
        weight: "30.0 kg",
        status: "delayed",
        current_location: { lat: 41.9742, lng: -87.9073 },
        last_update: new Date().toISOString(),
        speed: 0,
        satellites: 4,
        signal: "Poor",
        battery: "45%",
        history: [
            { event_time: new Date(Date.now() - 10800000).toISOString(), latitude: 41.9700, longitude: -87.9000, status: "checked_in" },
            { event_time: new Date(Date.now() - 7200000).toISOString(), latitude: 41.9720, longitude: -87.9050, status: "in_transit" }
        ],
        alerts: [
            { message: "⚠️ Flight delayed - luggage waiting", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "danger", icon: "fa-exclamation-circle" },
            { message: "Contact airline for updates", timestamp: new Date(Date.now() - 1800000).toISOString(), type: "warning", icon: "fa-bell" }
        ]
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('map')) {
        initMap();
    }
    setupEventListeners();
    
    // Check for URL parameter on tracking page
    const urlParams = new URLSearchParams(window.location.search);
    const luggageId = urlParams.get('luggage');
    if (luggageId && document.getElementById('luggageId')) {
        document.getElementById('luggageId').value = luggageId;
        trackLuggage();
    }
});

// Initialize Leaflet Map
function initMap() {
    map = L.map('map').setView([40.7128, -74.0060], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);
}

// Track luggage function
async function trackLuggage() {
    const luggageId = document.getElementById('luggageId').value.trim().toUpperCase();
    if (!luggageId) {
        showNotification('Please enter a luggage ID', 'error');
        return;
    }
    
    currentLuggageId = luggageId;
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    
    // Simulate API delay
    setTimeout(() => {
        const data = mockDatabase[luggageId];
        
        if (data) {
            displayDashboard(data);
            document.getElementById('dashboard').style.display = 'grid';
            document.getElementById('smsPanel').style.display = 'block';
            showNotification('Luggage found! Loading tracking data...', 'success');
        } else {
            showNotification('Luggage ID not found. Try: LUG-001, LUG-002, or LUG-003', 'error');
        }
        
        document.getElementById('loading').style.display = 'none';
    }, 1000);
}

// Display dashboard with data
function displayDashboard(data) {
    document.getElementById('displayId').textContent = data.luggage_id;
    document.getElementById('ownerName').textContent = data.owner_name;
    document.getElementById('destination').textContent = data.destination;
    document.getElementById('weight').textContent = data.weight;
    
    const statusElem = document.getElementById('status');
    statusElem.textContent = data.status.replace('_', ' ').toUpperCase();
    statusElem.className = `status-badge ${data.status}`;
    
    document.getElementById('latitude').textContent = data.current_location.lat.toFixed(6);
    document.getElementById('longitude').textContent = data.current_location.lng.toFixed(6);
    document.getElementById('lastUpdate').textContent = new Date(data.last_update).toLocaleString();
    
    document.getElementById('speedValue').textContent = data.speed;
    document.getElementById('satellites').textContent = data.satellites;
    document.getElementById('signal').textContent = data.signal;
    document.getElementById('battery').textContent = data.battery;
    
    updateLocationOnMap(data.current_location);
    reverseGeocode(data.current_location.lat, data.current_location.lng);
    updateSpeedGauge(data.speed);
    displayHistory(data.history);
    displayAlerts(data.alerts);
}

// Update location on map
function updateLocationOnMap(location) {
    const lat = location.lat;
    const lng = location.lng;
    
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<b>Luggage: ${currentLuggageId}</b><br>Status: ${document.getElementById('status').textContent}`);
    }
    
    pathPoints.push([lat, lng]);
    if (pathLayer) {
        map.removeLayer(pathLayer);
    }
    pathLayer = L.polyline(pathPoints, { color: '#6366f1', weight: 3 }).addTo(map);
    map.setView([lat, lng], 15);
    marker.openPopup();
}

// Reverse geocoding
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        const address = data.display_name;
        document.getElementById('address').innerHTML = `<i class="fas fa-location-dot"></i><span>${address.substring(0, 80)}...</span>`;
    } catch (error) {
        document.getElementById('address').innerHTML = '<i class="fas fa-location-dot"></i><span>Address unavailable</span>';
    }
}

// Display history
function displayHistory(history) {
    const timeline = document.getElementById('historyTimeline');
    if (!history || history.length === 0) {
        timeline.innerHTML = '<div class="timeline-empty">No history data available</div>';
        return;
    }
    
    timeline.innerHTML = history.map(item => `
        <div class="timeline-item">
            <div class="timeline-time">${new Date(item.event_time).toLocaleString()}</div>
            <div class="timeline-location">📍 ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}</div>
            <div class="timeline-status">Status: ${item.status.replace('_', ' ')}</div>
        </div>
    `).join('');
}

// Display alerts
function displayAlerts(alerts) {
    const alertsList = document.getElementById('alertsList');
    if (!alerts || alerts.length === 0) {
        alertsList.innerHTML = '<div class="alert-empty">No new alerts</div>';
        return;
    }
    
    alertsList.innerHTML = alerts.map(alert => `
        <div class="alert-item alert-${alert.type}">
            <i class="fas ${alert.icon || 'fa-bell'}"></i>
            <div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time" style="font-size: 0.75rem; color: #6b7280;">${new Date(alert.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('alertCount').textContent = alerts.length;
}

// Speed gauge
function updateSpeedGauge(speed) {
    const ctx = document.getElementById('speedGauge').getContext('2d');
    if (speedGaugeChart) {
        speedGaugeChart.destroy();
    }
    speedGaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [speed, Math.max(0, 100 - speed)],
                backgroundColor: ['#6366f1', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
    });
}

// Subscribe to SMS
function subscribeSMS() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    if (!phoneNumber) {
        showNotification('Please enter a phone number', 'error');
        return;
    }
    
    showNotification(`SMS alerts activated for ${currentLuggageId} to ${phoneNumber}! (Demo mode)`, 'success');
    closeSMSPanel();
}

// Admin functions
function showAddLuggage() {
    document.getElementById('addModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('addModal').style.display = 'none';
}

function addLuggage(event) {
    event.preventDefault();
    const newId = document.getElementById('newLuggageId').value.trim().toUpperCase();
    mockDatabase[newId] = {
        luggage_id: newId,
        owner_name: document.getElementById('newOwnerName').value,
        owner_phone: document.getElementById('newPhone').value,
        destination: document.getElementById('newDestination').value,
        weight: document.getElementById('newWeight').value + " kg",
        status: "checked_in",
        current_location: { lat: 40.6413, lng: -73.7781 },
        last_update: new Date().toISOString(),
        speed: 0,
        satellites: 5,
        signal: "Good",
        battery: "100%",
        history: [],
        alerts: [{ message: "New luggage added to system", timestamp: new Date().toISOString(), type: "success", icon: "fa-plus" }]
    };
    showNotification(`Luggage ${newId} added successfully!`, 'success');
    closeModal();
    refreshData();
}

function exportData() {
    const dataStr = JSON.stringify(mockDatabase, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'luggage_data.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported!', 'success');
}

function refreshData() {
    loadAdminData();
    showNotification('Data refreshed!', 'success');
}

function loadAdminData() {
    const luggageList = Object.values(mockDatabase);
    const activeCount = luggageList.filter(l => l.status === 'in_transit' || l.status === 'checked_in').length;
    const deliveredCount = luggageList.filter(l => l.status === 'arrived').length;
    const alertCount = luggageList.reduce((sum, l) => sum + (l.alerts?.length || 0), 0);
    
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('deliveredCount').textContent = deliveredCount;
    document.getElementById('alertCount').textContent = alertCount;
    document.getElementById('userCount').textContent = Math.floor(Math.random() * 50) + 10;
    
    const tableBody = document.getElementById('luggageTableBody');
    if (tableBody) {
        tableBody.innerHTML = luggageList.map(item => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 1rem;"><strong>${item.luggage_id}</strong></td>
                <td style="padding: 1rem;">${item.owner_name}</td>
                <td style="padding: 1rem;"><span class="status-badge ${item.status}">${item.status}</span></td>
                <td style="padding: 1rem;">${item.current_location.lat.toFixed(4)}, ${item.current_location.lng.toFixed(4)}</td>
                <td style="padding: 1rem;">${new Date(item.last_update).toLocaleString()}</td>
                <td style="padding: 1rem;">
                    <button onclick="viewDetails('${item.luggage_id}')" style="padding: 0.25rem 0.5rem; margin-right: 0.5rem; cursor: pointer;">👁️</button>
                    <button onclick="sendAlertFromAdmin('${item.luggage_id}')" style="padding: 0.25rem 0.5rem; cursor: pointer;">🔔</button>
                </td>
            </tr>
        `).join('');
    }
}

function viewDetails(id) {
    window.location.href = `tracking.html?luggage=${id}`;
}

function sendAlertFromAdmin(id) {
    const message = prompt('Enter alert message:', 'Luggage update');
    if (message && mockDatabase[id]) {
        mockDatabase[id].alerts.unshift({
            message: message,
            timestamp: new Date().toISOString(),
            type: "warning",
            icon: "fa-bell"
        });
        showNotification(`Alert sent to ${id}`, 'success');
    }
}

// Map controls
function centerMap() {
    if (marker) {
        map.setView(marker.getLatLng(), 15);
    }
}

function quickTrack(id) {
    document.getElementById('luggageId').value = id;
    trackLuggage();
}

function closeSMSPanel() {
    document.getElementById('smsPanel').style.display = 'none';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 0.5rem;
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        font-weight: 500;
    `;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function setupEventListeners() {
    const searchInput = document.getElementById('luggageId');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') trackLuggage();
        });
    }
    
    if (document.getElementById('luggageTableBody')) {
        loadAdminData();
    }
}
