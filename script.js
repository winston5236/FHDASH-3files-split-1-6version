let currentSource = 'A';
let currentPageName = '小芳堂';
let isPlantMode = false;
let dataFetchInterval = null;

const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', hasData: true },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', hasData: true },
  'C': { name: '小田原', deviceId: 'DEVICE_C', hasData: false },
  'D': { name: '腳踏車練習場', deviceId: 'DEVICE_D', hasData: false },
  'E': { name: '植物觀測', deviceId: 'PLANT_DEVICE', hasData: true }
};

const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWD2sPK7Iw61gkzCTCOLIYEnmfirKXeLgdvxR3m6vEs1ZecdUj9x5YPwNvMSqW47gtHQ/exec';

document.addEventListener('DOMContentLoaded', () => {
  const dropdownBtn = document.getElementById('source-selector');
  const dropdownList = document.getElementById('source-list');
  
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', () => dropdownList.classList.toggle('hidden'));
  }

  document.querySelectorAll('#source-list li').forEach(item => {
    item.addEventListener('click', () => {
      switchPage(item.dataset.source);
      dropdownList.classList.add('hidden');
    });
  });

  switchPage('A');
  updateClock();
  setInterval(updateClock, 1000);
});

async function fetchData() {
  try {
    const config = sourceConfig[currentSource];
    const url = `https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    // Some LASS devices return an array inside "feeds", others return a direct object
    const data = result.feeds ? result.feeds[0] : result;
    
    // ✅ SMART MAPPING: Checks multiple possible keys for each sensor
    const sensors = {
      'pm25-value': data.s_d0 ?? data.s_0 ?? data.PM2_5,
      'temperature-card': data.s_t0 ?? data.s_t1 ?? data.Temperature,
      'humidity-card': data.s_h0 ?? data.s_h1 ?? data.Humidity,
      'sunlight-card': data.s_lux0 ?? data.s_l0 ?? data.Lux,
      'co2-card': data.s_co2 ?? data.s_c1 ?? data.CO2,
      'tvoc-card': data.s_tvoc ?? data.s_v1 ?? data.TVOC,
      'windspeed-card': data.s_w0 ?? data.WindSpeed
    };

    // Update the UI
    for (const [id, value] of Object.entries(sensors)) {
      const el = document.getElementById(id);
      if (el) {
        if (value !== undefined && value !== null) {
          el.textContent = `${value} ${getUnit(id)}`;
        } else {
          el.textContent = `-- ${getUnit(id)}`;
        }
      }
    }
    
    updateDataStatus('✅ 環境數據正常', '#e8f5e9', '#2e7d32');
  } catch (error) {
    console.error("Fetch error:", error);
    updateDataStatus('❌ 環境數據斷線', '#ffebee', '#c62828');
  }
}

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
      if (el) el.textContent = val !== undefined ? `${val} ${getUnit(id)}` : `-- ${getUnit(id)}`;
    }
    updateDataStatus('✅ 植物數據正常', '#e8f5e9', '#2e7d32');
  } catch (error) {
    updateDataStatus('❌ 植物數據斷線', '#ffebee', '#c62828');
  }
}

function getUnit(id) {
  if (id.includes('pm25')) return 'μg/m³';
  if (id.includes('temperature')) return '°C';
  if (id.includes('humidity')) return '%';
  if (id.includes('sunlight')) return 'lux';
  if (id.includes('co2')) return 'ppm';
  if (id.includes('tvoc')) return 'ppb';
  if (id.includes('wind')) return 'm/s';
  return '';
}

function switchPage(source) {
  currentSource = source;
  currentPageName = sourceConfig[source].name;
  document.getElementById('source-selector').textContent = `${currentPageName} ▼`;

  if (dataFetchInterval) clearInterval(dataFetchInterval);

  const stdLayout = document.getElementById('standard-layout');
  const plantLayout = document.getElementById('plant-layout');

  if (source === 'E') {
    stdLayout.style.display = 'none';
    plantLayout.style.display = 'flex';
    fetchPlantData();
    dataFetchInterval = setInterval(fetchPlantData, 30000);
  } else {
    stdLayout.style.display = 'flex';
    plantLayout.style.display = 'none';
    if (sourceConfig[source].hasData) {
      fetchData();
      dataFetchInterval = setInterval(fetchData, 30000);
    } else {
      updateDataStatus('⚠️ 暫無數據', '#f5f5f5', '#9e9e9e');
    }
  }
}

function updateDataStatus(text, bgColor, color) {
  const statusEl = document.getElementById('data-status');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.backgroundColor = bgColor;
    statusEl.style.color = color;
  }
}

function updateClock() {
  const now = new Date();
  const timeDisp = document.getElementById('time-display');
  const dateDisp = document.getElementById('date-display');
  if (timeDisp) timeDisp.textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
  if (dateDisp) dateDisp.textContent = now.toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
}
