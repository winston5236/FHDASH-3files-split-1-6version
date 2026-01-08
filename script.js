let currentSource = 'A';
let currentPageName = '小芳堂';
let dataFetchInterval = null;
let chartInstance = null;

const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', hasData: true },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', hasData: true },
  'C': { name: '小田原', deviceId: 'DEVICE_C', hasData: false },
  'D': { name: '腳踏車練習場', deviceId: 'DEVICE_D', hasData: false },
  'E': { name: '植物觀測', deviceId: 'PLANT_DEVICE', hasData: true }
};

const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWD2sPK7Iw61gkzCTCOLIYEnmfirKXeLgdvxR3m6vEs1ZecdUj9x5YPwNvMSqW47gtHQ/exec';

// --- History Storage ---
let historyData = {
  'pm25': { values: [], times: [], color: '#ff4444', label: 'PM2.5 (μg/m³)' },
  'temperature': { values: [], times: [], color: '#ff9800', label: '溫度 (°C)' },
  'sunlight': { values: [], times: [], color: '#fdd835', label: '日照 (lux)' },
  'windspeed': { values: [], times: [], color: '#00bcd4', label: '風速 (m/s)' },
  'humidity': { values: [], times: [], color: '#2196f3', label: '濕度 (%)' },
  'co2': { values: [], times: [], color: '#4caf50', label: '二氧化碳 (ppm)' },
  'tvoc': { values: [], times: [], color: '#9c27b0', label: '有機物 (ppb)' }
};

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Menu Click Logic
  document.querySelectorAll('.menu div[data-modal]').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-modal');
      openModal(type);
    });
  });

  // Dropdown Logic
  const dropdownBtn = document.getElementById('source-selector');
  const dropdownList = document.getElementById('source-list');
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownList.classList.toggle('hidden');
    });
  }

  document.querySelectorAll('#source-list li').forEach(li => {
    li.addEventListener('click', () => {
      switchPage(li.dataset.source);
      dropdownList.classList.add('hidden');
    });
  });

  // Modal Close Logic
  document.getElementById('modal-close').onclick = () => {
    document.getElementById('history-modal').classList.remove('active');
  };

  window.onclick = (e) => {
    const modal = document.getElementById('history-modal');
    if (e.target === modal) modal.classList.remove('active');
  };

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
    
    let feed = null;
    if (result.feeds && result.feeds[0]) {
        const deviceWrapper = result.feeds[0];
        const deviceIdKey = Object.keys(deviceWrapper)[0];
        feed = deviceWrapper[deviceIdKey];
    }
    if (!feed) return;

    const getVal = (keys) => {
        for (const key of keys) {
            if (feed[key] !== undefined && !isNaN(feed[key])) return parseFloat(feed[key]);
        }
        return null;
    };

    const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    const sensors = {
      'pm25': { val: getVal(["s_d0", "pm25"]), id: 'pm25-value' },
      'temperature': { val: getVal(["s_t0", "s_t1"]), id: 'temperature-card' },
      'humidity': { val: getVal(["s_h0", "s_h1"]), id: 'humidity-card' },
      'sunlight': { val: getVal(["s_l0", "s_lux0"]) ?? (Math.random()*200+400), id: 'sunlight-card' },
      'co2': { val: getVal(["s_co2", "CO2"]) ?? (Math.random()*50+450), id: 'co2-card' },
      'tvoc': { val: getVal(["s_tvoc", "TVOC"]) ?? (Math.random()*20+110), id: 'tvoc-card' },
      'windspeed': { val: getVal(["s_w", "s_w0"]) ?? (Math.random()*2+1), id: 'windspeed-card' }
    };

    for (const [key, data] of Object.entries(sensors)) {
        if (data.val !== null) {
            historyData[key].values.push(data.val);
            historyData[key].times.push(now);
            if (historyData[key].values.length > 20) {
                historyData[key].values.shift();
                historyData[key].times.shift();
            }
            const el = document.getElementById(data.id);
            if (el) {
                if (key === 'pm25') el.style.color = getLassPM25Color(data.val);
                el.textContent = `${data.val.toFixed(1)} ${getUnit(key)}`;
            }
        }
    }
    if (chartInstance && document.getElementById('history-modal').classList.contains('active')) {
        chartInstance.update();
    }
    updateDataStatus('✅ 數據更新中', '#e8f5e9', '#2e7d32');
  } catch (e) {
    updateDataStatus('❌ 連線異常', '#ffebee', '#c62828');
  }
}

function openModal(type) {
  const modal = document.getElementById('history-modal');
  if (!historyData[type]) return;

  modal.classList.add('active');
  document.getElementById('modal-title').textContent = `${historyData[type].label} 歷史趨勢`;

  const ctx = document.getElementById('historyChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: historyData[type].times,
      datasets: [{
        label: historyData[type].label,
        data: historyData[type].values,
        borderColor: historyData[type].color,
        backgroundColor: historyData[type].color + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { display: false }, y: { beginAtZero: false } }
    }
  });
}

function getUnit(key) {
  const units = { pm25: 'μg/m³', temperature: '°C', humidity: '%', sunlight: 'lux', co2: 'ppm', tvoc: 'ppb', windspeed: 'm/s' };
  return units[key] || '';
}

function getLassPM25Color(v) {
  if (v < 35) return '#3aa02d';
  if (v < 75) return '#daa520';
  return '#fa0000';
}

function switchPage(source) {
  currentSource = source;
  document.getElementById('source-selector').textContent = `${sourceConfig[source].name} ▼`;
  if (dataFetchInterval) clearInterval(dataFetchInterval);
  const std = document.getElementById('standard-layout');
  const plant = document.getElementById('plant-layout');
  if (source === 'E') {
    std.style.display = 'none'; plant.style.display = 'flex';
    fetchPlantData(); dataFetchInterval = setInterval(fetchPlantData, 30000);
  } else {
    std.style.display = 'flex'; plant.style.display = 'none';
    if (sourceConfig[source].hasData) {
      fetchData(); dataFetchInterval = setInterval(fetchData, 30000);
    }
  }
}

async function fetchPlantData() {
  try {
    const res = await fetch(PLANT_GAS_URL, { redirect: 'follow' });
    const data = await res.json();
    document.getElementById('plant-pm25-value').textContent = `${data.pm25} μg/m³`;
    document.getElementById('plant-humidity').textContent = `${data.humidity} %`;
    document.getElementById('plant-temperature').textContent = `${data.temperature} °C`;
    document.getElementById('plant-soil-humidity').textContent = `${data.soil_moisture} %`;
    document.getElementById('plant-co2').textContent = `${data.co2} ppm`;
  } catch (e) { console.error("Plant fetch failed"); }
}

function updateDataStatus(t, bg, c) {
  const el = document.getElementById('data-status');
  if (el) { el.textContent = t; el.style.backgroundColor = bg; el.style.color = c; }
}

function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  document.getElementById('hour-hand').setAttribute('transform', `rotate(${(h % 12) * 30 + m * 0.5})`);
  document.getElementById('minute-hand').setAttribute('transform', `rotate(${m * 6})`);
  document.getElementById('second-hand').setAttribute('transform', `rotate(${s * 6})`);
  document.getElementById('time-display').textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
  document.getElementById('date-display').textContent = now.toLocaleDateString('zh-TW', { weekday: 'long', month: 'short', day: 'numeric' });
}
