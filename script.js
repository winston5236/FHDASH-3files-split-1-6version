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

// --- Initialization ---

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

// --- Core Data Fetching Logic ---

async function fetchData() {
  try {
    const config = sourceConfig[currentSource];
    const url = `https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    // 1. Correct LASS Data Extraction (Drilling through the nested ID key)
    let feed = null;
    if (result.feeds && result.feeds[0]) {
        const deviceWrapper = result.feeds[0];
        const deviceIdKey = Object.keys(deviceWrapper)[0];
        feed = deviceWrapper[deviceIdKey];
    }

    if (!feed) throw new Error("No data found for this device");

    // 2. Fallback Key Helper (from Script 1)
    const getVal = (keys, fallback = null) => {
        for (const key of keys) {
            if (feed[key] !== undefined && !isNaN(feed[key])) return parseFloat(feed[key]);
        }
        return fallback;
    };

    // 3. Sensor Mapping
    const sensors = {
      'pm25-value': getVal(["s_d0", "pm25", "PM2_5", "PM25_AVG"]),
      'temperature-card': getVal(["s_t0", "s_t1", "Temperature", "temperature", "temp"]),
      'humidity-card': getVal(["s_h0", "s_h1", "Humidity", "humidity", "humid"]),
      'sunlight-card': getVal(["s_l0", "s_lux0", "Lux", "s_l"]),
      'co2-card': getVal(["s_co2", "CO2", "co2"]),
      'tvoc-card': getVal(["s_tvoc", "TVOC", "tvoc"]),
      'windspeed-card': getVal(["s_w", "s_w0", "WindSpeed"])
    };

    // 4. UI Update Loop
    for (const [id, value] of Object.entries(sensors)) {
      const el = document.getElementById(id);
      if (el) {
        if (value !== null) {
          // Color logic for PM2.5
          if (id === 'pm25-value') el.style.color = getLassPM25Color(value);
          
          el.textContent = `${Math.round(value * 10) / 10} ${getUnit(id)}`;
        } else {
          el.textContent = `-- ${getUnit(id)}`;
          if (id === 'pm25-value') el.style.color = '';
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

// --- Helper Functions ---

function getLassPM25Color(value) {
    if (value < 30) return 'rgb(58,160,45)';   // Green
    if (value < 70) return 'rgb(218,165,32)';  // Goldenrod (better visibility than pure yellow)
    if (value < 500) return 'rgb(250,0,0)';    // Red
    return 'rgb(250,0,250)';                   // Purple
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
  const selector = document.getElementById('source-selector');
  if (selector) selector.textContent = `${currentPageName} ▼`;

  if (dataFetchInterval) clearInterval(dataFetchInterval);

  const stdLayout = document.getElementById('standard-layout');
  const plantLayout = document.getElementById('plant-layout');

  if (source === 'E') {
    if (stdLayout) stdLayout.style.display = 'none';
    if (plantLayout) plantLayout.style.display = 'flex';
    fetchPlantData();
    dataFetchInterval = setInterval(fetchPlantData, 30000);
  } else {
    if (stdLayout) stdLayout.style.display = 'flex';
    if (plantLayout) plantLayout.style.display = 'none';
    
    if (sourceConfig[source].hasData) {
      fetchData();
      dataFetchInterval = setInterval(fetchData, 30000); // Poll every 30s
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
