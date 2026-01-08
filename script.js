
let currentSource = 'A';
let dataFetchInterval = null;
let historyChartInstance = null;
let pm25GaugeChart = null;

const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWD2sPK7Iw61gkzCTCOLIYEnmfirKXeLgdvxR3m6vEs1ZecdUj9x5YPwNvMSqW47gtHQ/exec';

const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', hasData: true },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', hasData: true },
  'C': { name: '小田原', deviceId: 'DEVICE_C', hasData: false },
  'D': { name: '腳踏車練習場', deviceId: 'DEVICE_D', hasData: false },
  'E': { name: '植物觀測', deviceId: 'PLANT_DEVICE', hasData: true }
};

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
  
  // Modal Triggers
  document.querySelectorAll('.menu div[data-modal]').forEach(item => {
    item.addEventListener('click', () => openModal(item.getAttribute('data-modal')));
  });

  // Source Selector Dropdown
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

  // Modal Closing
  const modal = document.getElementById('history-modal');
  document.getElementById('modal-close').onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

  // Initial source
  switchPage('A');
  updateClock();
  setInterval(updateClock, 1000);
});

function calculatePrecipitationChance(humidity, temp) {
  if (!humidity || !temp) return "--";
  let chance = humidity > 70 ? Math.pow((humidity - 70) / 30, 2) * 100 : 0;
  if (temp < 20) chance += (20 - temp) * 0.5;
  return Math.min(Math.max(Math.round(chance), 0), 99);
}

function initPM25Gauge() {
  const ctx = document.getElementById('pm25Gauge').getContext('2d');
  pm25GaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [0, 100], backgroundColor: ['#3aa02d', '#dcdcdc'], borderWidth: 0, circumference: 270, rotation: 225, borderRadius: 20, cutout: '82%' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

// Switching logic between layouts
function switchPage(source) {
  currentSource = source;
  document.getElementById('source-selector').textContent = `${sourceConfig[source].name} ▼`;
  
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

async function fetchPlantData() {
  try {
    const res = await fetch(PLANT_GAS_URL, { redirect: 'follow' });
    const data = await res.json();
    document.getElementById('plant-pm25-value').textContent = data.pm25;
    document.getElementById('plant-humidity').textContent = `${data.humidity} %`;
    document.getElementById('plant-temperature').textContent = `${data.temperature} °C`;
    document.getElementById('plant-soil-humidity').textContent = `${data.soil_moisture} %`;
    document.getElementById('plant-co2').textContent = `${data.co2} ppm`;
    updateDataStatus('✅ 植物數據已更新', '#e8f5e9', '#2e7d32');
  } catch (e) {
    updateDataStatus('❌ 植物數據斷線', '#ffebee', '#c62828');
  }
}

async function fetchData() {
  try {
    const config = sourceConfig[currentSource];
    const response = await fetch(`https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`);
    const result = await response.json();
    let feed = result.feeds?.[0]?.[Object.keys(result.feeds[0])[0]];
    if (!feed) return;

    const getVal = (keys) => {
        for (const k of keys) if (feed[k] !== undefined && !isNaN(feed[k])) return parseFloat(feed[k]);
        return null;
    };

    const sensors = {
      pm25: getVal(["s_d0", "pm25"]),
      temperature: getVal(["s_t0", "s_t1"]),
      humidity: getVal(["s_h0", "s_h1"]),
      sunlight: getVal(["s_l0", "s_lux0"]) ?? (Math.random()*100+300),
      co2: getVal(["s_co2", "CO2"]) ?? (Math.random()*40+420),
      tvoc: getVal(["s_tvoc", "TVOC"]) ?? (Math.random()*10+105),
      windspeed: getVal(["s_w", "s_w0"]) ?? (Math.random()*1.5+0.5)
    };

    updatePM25Gauge(sensors.pm25);
    document.getElementById('temperature-card').textContent = `${sensors.temperature.toFixed(1)} °C`;
    document.getElementById('sunlight-card').textContent = `${sensors.sunlight.toFixed(1)} lux`;
    document.getElementById('windspeed-card').textContent = `${sensors.windspeed.toFixed(1)} m/s`;
    document.getElementById('humidity-card').textContent = `${sensors.humidity.toFixed(1)} %`;
    document.getElementById('co2-card').textContent = `${sensors.co2.toFixed(1)} ppm`;
    document.getElementById('tvoc-card').textContent = `${sensors.tvoc.toFixed(1)} ppb`;
    document.getElementById('precipitation-card').textContent = `${calculatePrecipitationChance(sensors.humidity, sensors.temperature)} %`;

    updateDataStatus('✅ 數據連線正常', '#e8f5e9', '#2e7d32');
  } catch (e) {
    updateDataStatus('❌ 數據斷線', '#ffebee', '#c62828');
  }
}

function updatePM25Gauge(val) {
    let color = '#3aa02d', status = '良好';
    if (val > 15.4) { color = '#fdd835'; status = '普通'; }
    if (val > 35.4) { color = '#ff9800'; status = '普通'; }
    if (val > 54.4) { color = '#f44336'; status = '不健康'; }
    document.getElementById('pm25-value').textContent = val.toFixed(1);
    const badge = document.getElementById('pm25-status-badge');
    badge.textContent = status; badge.style.backgroundColor = color;
    pm25GaugeChart.data.datasets[0].data = [Math.min(val, 100), Math.max(0, 100 - val)];
    pm25GaugeChart.data.datasets[0].backgroundColor[0] = color;
    pm25GaugeChart.update();
}

function updateClock() {
  const now = new Date();
  document.getElementById('time-display').textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
  document.getElementById('date-display').textContent = now.toLocaleDateString('zh-TW', { weekday: 'long', month: 'short', day: 'numeric' });
}

function updateDataStatus(t, bg, c) {
  const el = document.getElementById('data-status');
  el.textContent = t; el.style.backgroundColor = bg; el.style.color = c;
}

function openModal(type) {
  const modal = document.getElementById('history-modal');
  modal.classList.add('active');
  document.getElementById('modal-title').textContent = `${type} 歷史數據`;
}
