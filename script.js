let currentSource = 'A';
let currentPageName = '小芳堂';
let isPlantMode = false;
let dataFetchInterval = null;

// ✅ FIXED: Source A (小芳堂) uses device B827EB63D1C8
const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', hasData: true },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', hasData: true },
  'C': { name: '小田原', deviceId: 'DEVICE_C', hasData: false },
  'D': { name: '腳踏車練習場', deviceId: 'DEVICE_D', hasData: false },
  'E': { name: '植物觀測', deviceId: 'PLANT_DEVICE', hasData: true }
};

// ✅ FIXED: Your Google Script URL
const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWD2sPK7Iw61gkzCTCOLIYEnmfirKXeLgdvxR3m6vEs1ZecdUj9x5YPwNvMSqW47gtHQ/exec';

document.addEventListener('DOMContentLoaded', function() {
  // Setup Dropdown
  const dropdownBtn = document.getElementById('source-selector');
  const dropdownList = document.getElementById('source-list');
  
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', () => dropdownList.classList.toggle('hidden'));
    document.addEventListener('click', (e) => {
      if (!dropdownBtn.contains(e.target) && !dropdownList.contains(e.target)) dropdownList.classList.add('hidden');
    });
  }
  
  document.querySelectorAll('#source-list li').forEach(item => {
    item.addEventListener('click', () => {
      switchPage(item.dataset.source);
      if (dropdownList) dropdownList.classList.add('hidden');
    });
  });

  // Initialize
  switchPage('A');
  updateClock();
  setInterval(updateClock, 1000);
});

async function switchPage(source) {
  currentSource = source;
  currentPageName = sourceConfig[source].name;
  const config = sourceConfig[source];
  
  const selector = document.getElementById('source-selector');
  if (selector) selector.textContent = `${currentPageName} ▼`;

  if (dataFetchInterval) clearInterval(dataFetchInterval);

  if (source === 'E') {
    isPlantMode = true;
    toggleLayouts('plant');
    fetchPlantData();
    dataFetchInterval = setInterval(fetchPlantData, 30000);
  } else {
    isPlantMode = false;
    toggleLayouts('standard');
    if (config.hasData) {
      updateDataStatus('📡 連線中...', '#f0f0f0', '#888');
      fetchData();
      dataFetchInterval = setInterval(fetchData, 30000);
    } else {
      updateStaticData();
      updateDataStatus('⚠️ 暫無數據', '#f0f0f0', '#888');
    }
  }
}

function toggleLayouts(mode) {
  const std = document.getElementById('standard-layout');
  const plt = document.getElementById('plant-layout');
  if (std) std.style.display = (mode === 'standard' ? 'flex' : 'none');
  if (plt) plt.style.display = (mode === 'plant' ? 'flex' : 'none');
}

// ✅ FIXED: Added redirect: 'follow' for GAS
async function fetchPlantData() {
  try {
    const response = await fetch(PLANT_GAS_URL, { redirect: 'follow' });
    const data = await response.json();
    
    const mapping = {
      'plant-pm25-value': data.pm25,
      'plant-humidity': data.humidity,
      'plant-temperature': data.temperature,
      'plant-soil-humidity': data.soil_moisture,
      'plant-co2': data.co2
    };

    for (const [id, val] of Object.entries(mapping)) {
      const el = document.getElementById(id);
      if (el) el.textContent = (val !== undefined ? `${val} ${getUnit(id)}` : '--');
    }
    
    updateDataStatus('✅ 植物數據正常', '#e8f5e9', '#2e7d32');
  } catch (error) {
    updateDataStatus('❌ 植物數據斷線', '#ffebee', '#c62828');
  }
}

// ✅ FIXED: Added broad key checking for LASS Data
async function fetchData() {
  try {
    const config = sourceConfig[currentSource];
    const url = `https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    // LASS often returns an array in "feeds" or a direct object
    const data = result.feeds ? result.feeds[0] : result;
    
    const mapping = {
      'pm25-value': data.s_d0 || data.s_0,
      'temperature-card': data.s_t0 || data.s_h0,
      'humidity-card': data.s_h0 || data.s_1,
      'windspeed-card': data.s_w0,
      'co2-card': data.s_co2 || data.s_c1,
      'tvoc-card': data.s_tvoc,
      'sunlight-card': data.s_lux0 || data.s_l0
    };

    for (const [id, val] of Object.entries(mapping)) {
      const el = document.getElementById(id);
      if (el) el.textContent = (val !== undefined ? `${val} ${getUnit(id)}` : '--');
    }
    
    updateDataStatus('✅ 環境數據正常', '#e8f5e9', '#2e7d32');
  } catch (error) {
    updateDataStatus('❌ 環境數據斷線', '#ffebee', '#c62828');
  }
}

function getUnit(id) {
  if (id.includes('pm25')) return 'μg/m³';
  if (id.includes('temp')) return '°C';
  if (id.includes('humidity')) return '%';
  if (id.includes('co2')) return 'ppm';
  if (id.includes('tvoc')) return 'ppb';
  if (id.includes('sunlight')) return 'lux';
  if (id.includes('wind')) return 'm/s';
  return '';
}

function updateDataStatus(text, bgColor, color) {
  const statusEl = document.getElementById('data-status');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.backgroundColor = bgColor;
    statusEl.style.color = color;
  }
}

function updateStaticData() {
  const ids = ['pm25-value', 'temperature-card', 'humidity-card', 'sunlight-card', 'windspeed-card', 'co2-card', 'tvoc-card'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '--';
  });
}

function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const hourDeg = (hours % 12 * 30) + (now.getMinutes() * 0.5);
  const minDeg = now.getMinutes() * 6;
  const secDeg = now.getSeconds() * 6;
  
  if (document.getElementById('hour-hand')) document.getElementById('hour-hand').style.transform = `rotate(${hourDeg}deg)`;
  if (document.getElementById('minute-hand')) document.getElementById('minute-hand').style.transform = `rotate(${minDeg}deg)`;
  if (document.getElementById('second-hand')) document.getElementById('second-hand').style.transform = `rotate(${secDeg}deg)`;
  
  const dateStr = now.toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false });
  
  if (document.getElementById('date-display')) document.getElementById('date-display').textContent = dateStr;
  if (document.getElementById('time-display')) document.getElementById('time-display').textContent = timeStr;
}
