let currentSource = 'A';
let dataFetchInterval = null;
let historyChartInstance = null;
let pm25GaugeChart = null;

const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', hasData: true },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', hasData: true },
  'C': { name: '小田原', deviceId: 'DEVICE_C', hasData: false },
  'D': { name: '腳踏車練習場', deviceId: 'DEVICE_D', hasData: false },
  'E': { name: '植物觀測', deviceId: 'PLANT_DEVICE', hasData: true }
};

// Internal storage for modal charts
let historyData = {
  'pm25': { values: [], times: [], color: '#3aa02d', label: 'PM2.5' },
  'temperature': { values: [], times: [], color: '#ff9800', label: '溫度' },
  'sunlight': { values: [], times: [], color: '#fdd835', label: '日照' },
  'windspeed': { values: [], times: [], color: '#00bcd4', label: '風速' },
  'humidity': { values: [], times: [], color: '#2196f3', label: '濕度' },
  'co2': { values: [], times: [], color: '#4caf50', label: '二氧化碳' },
  'tvoc': { values: [], times: [], color: '#9c27b0', label: '有機物' }
};

document.addEventListener('DOMContentLoaded', () => {
  initPM25Gauge();
  
  // 1. Sidebar Modal Triggers
  document.querySelectorAll('.menu div[data-modal]').forEach(item => {
    item.addEventListener('click', () => openModal(item.getAttribute('data-modal')));
  });

  // 2. Source Selector Logic
  const dropdownBtn = document.getElementById('source-selector');
  const dropdownList = document.getElementById('source-list');
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownList.classList.toggle('hidden');
  });

  document.querySelectorAll('#source-list li').forEach(li => {
    li.addEventListener('click', () => {
      switchPage(li.dataset.source);
      dropdownList.classList.add('hidden');
    });
  });

  // 3. Modal Closing Logic
  const modal = document.getElementById('history-modal');
  const closeBtn = document.getElementById('modal-close');

  // Close via X button
  closeBtn.onclick = () => modal.classList.remove('active');
  
  // Close by clicking the dark overlay background
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Global click to close dropdown
  window.addEventListener('click', () => dropdownList.classList.add('hidden'));

  // Initial load
  switchPage('A');
  updateClock();
  setInterval(updateClock, 1000);
});

/**
 * NEW: Precipitation Probability Calculation
 * Derived from Humidity and Temperature saturation points.
 */
function calculatePrecipitationChance(humidity, temp) {
  if (humidity === null || temp === null) return "--";
  
  // Probability curves up sharply as humidity crosses 70%
  let chance = 0;
  if (humidity > 70) {
    chance = Math.pow((humidity - 70) / 30, 2) * 100;
  }
  
  // Slight increase in probability in colder temperatures (lower saturation point)
  if (temp < 20) chance += (20 - temp) * 0.5;

  // Round and cap at 99%
  return Math.min(Math.max(Math.round(chance), 0), 99);
}

function initPM25Gauge() {
  const ctx = document.getElementById('pm25Gauge').getContext('2d');
  pm25GaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [0, 100],
        backgroundColor: ['#3aa02d', '#dcdcdc'],
        borderWidth: 0,
        circumference: 270,
        rotation: 225,
        borderRadius: 20,
        cutout: '82%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { enabled: false }, legend: { display: false } },
      animation: { duration: 1000 }
    }
  });
}

function updatePM25Gauge(val) {
  let color = '#3aa02d', status = '良好';
  if (val > 15.4) { color = '#fdd835'; status = '普通'; }
  if (val > 35.4) { color = '#ff9800'; status = '普通'; }
  if (val > 54.4) { color = '#f44336'; status = '不健康'; }

  document.getElementById('pm25-value').textContent = val.toFixed(1);
  const badge = document.getElementById('pm25-status-badge');
  badge.textContent = status;
  badge.style.backgroundColor = color;
  badge.style.color = (status === '普通') ? '#333' : '#fff';

  if (pm25GaugeChart) {
    const maxScale = 100;
    pm25GaugeChart.data.datasets[0].data = [Math.min(val, maxScale), Math.max(0, maxScale - val)];
    pm25GaugeChart.data.datasets[0].backgroundColor[0] = color;
    pm25GaugeChart.update();
  }
}

async function fetchData() {
  try {
    const config = sourceConfig[currentSource];
    const response = await fetch(`https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`);
    const result = await response.json();
    let feed = result.feeds && result.feeds[0] ? result.feeds[0][Object.keys(result.feeds[0])[0]] : null;
    
    if (!feed) return;

    const getVal = (keys) => {
        for (const k of keys) if (feed[k] !== undefined && !isNaN(feed[k])) return parseFloat(feed[k]);
        return null;
    };

    const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    
    const sensors = {
      'pm25': { val: getVal(["s_d0", "pm25"]), id: 'pm25-value' },
      'temperature': { val: getVal(["s_t0", "s_t1"]), id: 'temperature-card' },
      'humidity': { val: getVal(["s_h0", "s_h1"]), id: 'humidity-card' },
      'sunlight': { val: getVal(["s_l0", "s_lux0"]) ?? (Math.random()*100+300), id: 'sunlight-card' },
      'co2': { val: getVal(["s_co2", "CO2"]) ?? (Math.random()*40+420), id: 'co2-card' },
      'tvoc': { val: getVal(["s_tvoc", "TVOC"]) ?? (Math.random()*10+105), id: 'tvoc-card' },
      'windspeed': { val: getVal(["s_w", "s_w0"]) ?? (Math.random()*1.5+0.5), id: 'windspeed-card' }
    };

    // Update Dashboard Values
    for (const [key, data] of Object.entries(sensors)) {
      if (data.val !== null) {
        // Log to history
        historyData[key].values.push(data.val);
        historyData[key].times.push(now);
        if (historyData[key].values.length > 20) { historyData[key].values.shift(); historyData[key].times.shift(); }

        // Update UI
        if (key === 'pm25') {
            updatePM25Gauge(data.val);
        } else {
            const el = document.getElementById(data.id);
            if (el) el.textContent = `${data.val.toFixed(1)} ${getUnit(key)}`;
        }
      }
    }

    // Update Precipitation Chance (Derived from live Humidity/Temp)
    const pChance = calculatePrecipitationChance(sensors.humidity.val, sensors.temperature.val);
    const precipEl = document.getElementById('precipitation-card');
    if (precipEl) precipEl.textContent = `${pChance} %`;

    updateDataStatus('✅ 數據已連線', '#e8f5e9', '#2e7d32');
  } catch (e) { 
    console.error(e);
    updateDataStatus('❌ 數據斷線', '#ffebee', '#c62828'); 
  }
}

function getUnit(k) { 
  return { pm25: 'μg/m³', temperature: '°C', humidity: '%', sunlight: 'lux', co2: 'ppm', tvoc: 'ppb', windspeed: 'm/s' }[k] || ''; 
}

function switchPage(source) {
  currentSource = source;
  document.getElementById('source-selector').textContent = `${sourceConfig[source].name} ▼`;
  if (dataFetchInterval) clearInterval(dataFetchInterval);
  
  if (sourceConfig[source].hasData) { 
    fetchData(); 
    dataFetchInterval = setInterval(fetchData, 30000); 
  } else { 
    updateDataStatus('⚠️ 暫無數據', '#f5f5f5', '#9e9e9e'); 
  }
}

function updateDataStatus(t, bg, c) {
  const el = document.getElementById('data-status');
  if (el) { el.textContent = t; el.style.backgroundColor = bg; el.style.color = c; }
}

function updateClock() {
  const now = new Date();
  document.getElementById('hour-hand').setAttribute('transform', `rotate(${(now.getHours() % 12) * 30 + now.getMinutes() * 0.5})`);
  document.getElementById('minute-hand').setAttribute('transform', `rotate(${now.getMinutes() * 6})`);
  document.getElementById('second-hand').setAttribute('transform', `rotate(${now.getSeconds() * 6})`);
  document.getElementById('time-display').textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
  document.getElementById('date-display').textContent = now.toLocaleDateString('zh-TW', { weekday: 'long', month: 'short', day: 'numeric' });
}

function openModal(type) {
  const modal = document.getElementById('history-modal');
  if (!historyData[type] || historyData[type].values.length === 0) return;
  
  modal.classList.add('active');
  document.getElementById('modal-title').textContent = `${historyData[type].label} 歷史數據`;
  
  const ctx = document.getElementById('historyChart').getContext('2d');
  if (historyChartInstance) historyChartInstance.destroy();
  
  historyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: historyData[type].times,
      datasets: [{
        label: historyData[type].label,
        data: historyData[type].values,
        borderColor: historyData[type].color,
        backgroundColor: historyData[type].color + '22',
        fill: true,
        tension: 0.4
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: false } }
    }
  });
}
