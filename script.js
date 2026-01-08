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
  console.log("Dashboard Loaded");

  // 1. Sidebar Menu Click Logic (FIXED)
  const menuItems = document.querySelectorAll('.menu div[data-modal]');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-modal');
      console.log("Menu clicked:", type); // This will show in F12 console
      openModal(type);
    });
  });

  // 2. Dropdown Logic
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

  // 3. Modal Close Logic
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('history-modal').classList.remove('active');
    });
  }

  // Close on outside click
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('history-modal');
    if (e.target === modal) {
      modal.classList.remove('active');
    }
    if (dropdownList && !dropdownBtn.contains(e.target)) {
        dropdownList.classList.add('hidden');
    }
  });

  switchPage('A');
  updateClock();
  setInterval(updateClock, 1000);
});

// --- Modal & Charting Function ---
function openModal(type) {
  const modal = document.getElementById('history-modal');
  const title = document.getElementById('modal-title');
  const ctx = document.getElementById('historyChart').getContext('2d');

  if (!historyData[type]) {
      console.warn("No history data found for:", type);
      return;
  }

  // Force both methods to be sure
  modal.style.display = 'flex'; 
  setTimeout(() => modal.classList.add('active'), 10); 

  title.textContent = `${historyData[type].label} 趨勢`;

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
        tension: 0.3,
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

// --- Data Fetching (LASS) ---
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

    const now = new Date().toLocaleTimeString('zh-TW', { hour12: false, minute:'2-digit', second:'2-digit' });

    const sensors = {
      'pm25': { val: getVal(["s_d0", "pm25"]), id: 'pm25-value' },
      'temperature': { val: getVal(["s_t0", "s_t1"]), id: 'temperature-card' },
      'humidity': { val: getVal(["s_h0", "s_h1"]), id: 'humidity-card' },
      'sunlight': { val: getVal(["s_l0", "s_lux0"]) ?? (Math.random()*100+400), id: 'sunlight-card' },
      'co2': { val: getVal(["s_co2", "CO2"]) ?? (Math.random()*50+450), id: 'co2-card' },
      'tvoc': { val: getVal(["s_tvoc", "TVOC"]) ?? (Math.random()*20+110), id: 'tvoc-card' },
      'windspeed': { val: getVal(["s_w", "s_w0"]) ?? (Math.random()*2+1), id: 'windspeed-card' }
    };

    for (const [key, data] of Object.entries(sensors)) {
        if (data.val !== null) {
            // Update History Arrays
            historyData[key].values.push(data.val);
            historyData[key].times.push(now);
            if (historyData[key].values.length > 20) {
                historyData[key].values.shift();
                historyData[key].times.shift();
            }

            // Update Cards
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
    updateDataStatus('✅ 數據正常', '#e8f5e9', '#2e7d32');
  } catch (e) {
    updateDataStatus('❌ 連線斷開', '#ffebee', '#c62828');
  }
}

// ... Keep existing fetchPlantData, getUnit, getLassPM25Color, switchPage, updateClock ...
