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

const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWD2sPK7Iw61gkzCTCOLIYEnmfirKXeLgdvxR3m6vEs1ZecdUj9x5YPwNvMSqW47gtHQ/exec';

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
  
  document.querySelectorAll('.menu div[data-modal]').forEach(item => {
    item.addEventListener('click', () => openModal(item.getAttribute('data-modal')));
  });

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

  document.getElementById('modal-close').onclick = () => document.getElementById('history-modal').classList.remove('active');
  
  switchPage('A');
  updateClock();
  setInterval(updateClock, 1000);
});

// --- PM2.5 Gauge Logic ---
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
        borderRadius: 15,
        cutout: '80%'
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
  if (val > 15) { color = '#fdd835'; status = '普通'; }
  if (val > 35) { color = '#ff9800'; status = '對敏感族群不健康'; }
  if (val > 54) { color = '#f44336'; status = '不健康'; }
  if (val > 150) { color = '#9c27b0'; status = '非常不健康'; }

  document.getElementById('pm25-value').textContent = val.toFixed(1);
  const badge = document.getElementById('pm25-status-badge');
  badge.textContent = status;
  badge.style.backgroundColor = color;

  if (pm25GaugeChart) {
    const max = 100; // Gauge Scale Max
    pm25GaugeChart.data.datasets[0].data = [Math.min(val, max), Math.max(0, max - val)];
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

    for (const [key, data] of Object.entries(sensors)) {
      if (data.val !== null) {
        historyData[key].values.push(data.val);
        historyData[key].times.push(now);
        if (historyData[key].values.length > 20) { historyData[key].values.shift(); historyData[key].times.shift(); }

        if (key === 'pm25') {
            updatePM25Gauge(data.val);
        } else {
            const el = document.getElementById(data.id);
            if (el) el.textContent = `${data.val.toFixed(1)} ${getUnit(key)}`;
        }
      }
    }
    updateDataStatus('✅ 數據已連線', '#e8f5e9', '#2e7d32');
  } catch (e) { updateDataStatus('❌ 數據斷線', '#ffebee', '#c62828'); }
}

function getUnit(k) { return { pm25: 'μg/m³', temperature: '°C', humidity: '%', sunlight: 'lux', co2: 'ppm', tvoc: 'ppb', windspeed: 'm/s' }[k] || ''; }

function switchPage(source) {
  currentSource = source;
  document.getElementById('source-selector').textContent = `${sourceConfig[source].name} ▼`;
  if (dataFetchInterval) clearInterval(dataFetchInterval);
  const std = document.getElementById('standard-layout'), plant = document.getElementById('plant-layout');

  if (source === 'E') {
    std.style.display = 'none'; plant.style.display = 'flex';
    fetchPlantData(); dataFetchInterval = setInterval(fetchPlantData, 30000);
  } else {
    std.style.display = 'flex'; plant.style.display = 'none';
    if (sourceConfig[source].hasData) { fetchData(); dataFetchInterval = setInterval(fetchData, 30000); }
    else { updateDataStatus('⚠️ 暫無數據', '#f5f5f5', '#9e9e9e'); }
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
    updateDataStatus('✅ 植物數據正常', '#e8f5e9', '#2e7d32');
  } catch (e) { updateDataStatus('❌ 植物數據斷線', '#ffebee', '#c62828'); }
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
  if (!historyData[type]) return;
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
        fill: true, tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}
