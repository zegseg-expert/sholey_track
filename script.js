// Global variables
let map;
let marker;
let pathLayer;
let pathPoints = [];
let currentLuggageId = null;
let updateInterval = null;
let socket;
let speedGaugeChart;
let trafficLayer = false;
let satelliteMode = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initSocket();
    setupEventListeners();
});

// Initialize Leaflet Map
function initMap() {
    map = L.map('map').setView([40.7128, -74.0060], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);
}

// Initialize WebSocket for real-time updates
function initSocket() {
    socket = io('https://your-cloud-function-url.com', {
        transports: ['websocket']
    });
    
    socket.on('connect', () => {
        console.log('WebSocket connected');
    });
    
    socket.on('location_update', (data) => {
        if (data.luggage_id === currentLuggageId) {
            updateLocationOnMap(data);
            updateDashboard(data);
        }
    });
    
    socket.on('sms_alert', (alert) => {
        showAlert(alert);
    });
}

// Track luggage function
async function trackLuggage() {
    const luggageId = document.getElementById('luggageId').value.trim();
    if (!luggageId) {
        showNotification('Please enter a luggage ID', 'error');
        return;
    }
    
    currentLuggageId = luggageId;
    
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    
    try {
        // Fetch from Google Cloud Function
        const response = await fetch(`https://your-region-your-project.cloudfunctions.net/get-luggage?luggage_id=${luggageId}`);
        const data = await response.json();
        
        if (data.success) {
            displayDashboard(data);
            
            // Start real-time updates
            if (updateInterval) clearInterval(updateInterval);
            updateInterval = setInterval(() => fetchLatestLocation(luggageId), 5000);
            
            // Show SMS panel
            document.getElementById('smsPanel').style.display = 'block';
        } else {
            showNotification('Luggage ID not found', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error fetching data', 'error');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Display dashboard with data
function displayDashboard(data) {
    document.getElementById('dashboard').style.display = 'grid';
    
    // Update info card
    document.getElementById('displayId').textContent = data.luggage_id;
    document.getElementById('ownerName').textContent = data.owner_name || 'Not specified';
    document.getElementById('destination').textContent = data.destination || 'Not specified';
    document.getElementById('weight').textContent = data.weight ? `${data.weight} kg` : 'Not specified';
    
    const statusElem = document.getElementById('status');
    statusElem.textContent = data.status.replace('_', ' ').toUpperCase();
    statusElem.className = `status-badge ${data.status}`;
    
    // Update location
    if (data.latest_location) {
        document.getElementById('latitude').textContent = data.latest_location.lat.toFixed(6);
        document.getElementById('longitude').textContent = data.latest_location.lng.toFixed(6);
        document.getElementById('lastUpdate').textContent = new Date(data.last_update).toLocaleString();
        
        // Update map
        updateLocationOnMap(data.latest_location);
        
        // Reverse geocode address
        reverseGeocode(data.latest_location.lat, data.latest_location.lng);
    }
    
    // Update stats
    if (data.speed) {
        document.getElementById('speedValue').textContent = data.speed;
        updateSpeedGauge(data.speed);
    }
    document.getElementById('satellites').textContent = data.satellites || '4';
    document.getElementById('signal').textContent = data.signal || 'Good';
    document.getElementById('battery').textContent = data.battery || '85%';
    
    // Display history
    displayHistory(data.history || []);
    
    // Display alerts
    displayAlerts(data.alerts || []);
}

// Update location on map
function updateLocationOnMap(location) {
    const lat = location.lat;
    const lng = location.lng;
    
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<b>Luggage: ${currentLuggageId}</b><br>Last updated: ${new Date().toLocaleString()}`);
    }
    
    // Add to path
    pathPoints.push([lat, lng]);
    if (pathLayer) {
        map.removeLayer(pathLayer);
    }
    pathLayer = L.polyline(pathPoints, { color: 'var(--primary)', weight: 3 }).addTo(map);
    
    // Center map on location
    map.setView([lat, lng], 15);
}

// Reverse geocoding for address
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        const address = data.display_name;
        document.getElementById('address').innerHTML = `<i class="fas fa-location-dot"></i><span>${address.substring(0, 100)}...</span>`;
    } catch (error) {
        document.getElementById('address').innerHTML = '<i class="fas fa-location-dot"></i><span>Address unavailable</span>';
    }
}

// Display route history
function displayHistory(history) {
    const timeline = document.getElementById('historyTimeline');
    if (!history || history.length === 0) {
        timeline.innerHTML = '<div class="timeline-empty">No history data available</div>';
        return;
    }
    
    timeline.innerHTML = history.map(item => `
        <div class="timeline-item">
            <div class="timeline-time">${new Date(item.event_time).toLocaleString()}</div>
            <div class="timeline-location">${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}</div>
            <div class="timeline-status">Status: ${item.status}</div>
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
        <div class="alert-item ${alert.type}">
            <i class="fas ${alert.icon || 'fa-bell'}"></i>
            <div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('alertCount').textContent = alerts.length;
}

// Speed gauge chart
function updateSpeedGauge(speed) {
    if (speedGaugeChart) {
        speedGaugeChart.data.datasets[0].data = [speed, 100 - speed];
        speedGaugeChart.update();
    } else {
        const ctx = document.getElementById('speedGauge').getContext('2d');
        speedGaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [speed, 100 - speed],
                    backgroundColor: ['var(--primary)', 'var(--border)'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '70%',
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }
}

// Subscribe to SMS alerts
async function subscribeSMS() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    if (!phoneNumber) {
        showNotification('Please enter a phone number', 'error');
        return;
    }
    
    try {
        const response = await fetch('https://your-region-your-project.cloudfunctions.net/subscribe-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                luggage_id: currentLuggageId,
                phone_number: phoneNumber
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('SMS alerts activated!', 'success');
            closeSMSPanel();
        } else {
            showNotification('Failed to subscribe', 'error');
        }
    } catch (error) {
        showNotification('Error subscribing', 'error');
    }
}

// Map controls
function centerMap() {
    if (marker) {
        map.setView(marker.getLatLng(), 15);
    }
}

function toggleTraffic() {
    trafficLayer = !trafficLayer;
    if (trafficLayer) {
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    } else {
        map.eachLayer(layer => {
            if (layer.options && layer.options.url && layer.options.url.includes('cartocdn')) {
                map.removeLayer(layer);
            }
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    }
}

function toggleSatellite() {
    satelliteMode = !satelliteMode;
    if (satelliteMode) {
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        }).addTo(map);
    }
}

// Helper functions
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem;
        background: ${type === 'success' ? 'var(--secondary)' : 'var(--danger)'};
        color: white;
        border-radius: 0.5rem;
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function quickTrack(id) {
    document.getElementById('luggageId').value = id;
    trackLuggage();
}

function closeSMSPanel() {
    document.getElementById('smsPanel').style.display = 'none';
}

function toggleHistory() {
    const historyCard = document.querySelector('.history-card');
    historyCard.classList.toggle('expanded');
}

function showAlert(alert) {
    showNotification(`Alert: ${alert.message}`, 'warning');
}

function setupEventListeners() {
    // Enter key in search
    document.getElementById('luggageId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') trackLuggage();
    });
    
    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Message sent successfully!', 'success');
            contactForm.reset();
        });
    }
    
    // Hamburger menu
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('active');
        });
    }
}
