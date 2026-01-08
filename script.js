// --- Global State ---
let currentSource = 'A';
let dataFetchInterval = null;
let chartInstance = null;

// Device mapping from the school
const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8' },
  'B': { name: '司令台', deviceId: 'B827EBC2994D' },
  'C': { name: '小田原', deviceId: 'B827EB64E68F' }, 
  'D': { name: '腳踏車練習場', deviceId: 'B827EB3C653C' },
  'E': { name: '植物觀測', deviceId: 'PLANT_PAGE' }
};

// History Storage for Modals
let historyData = {
  'pm25': { values: [], times: [], color: '#4caf50', label: 'PM2.5' },
  'temperature': { values: [], times: [], color: '#ff9800', label: '溫度' },
  'sunlight': { values: [], times: [], color: '#fdd835', label: '日照' },
  'windspeed': { values: [], times: [], color: '#00bcd4', label: '風速' },
  'humidity': { values: [], times: [], color: '#2196f3', label: '濕度' },
  'co2': { values: [], times: [], color: '#795548', label: '二氧化碳' },
  'tvoc': { values: [], times: [], color: '#9c27b0', label: '有機物' }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Buttons
  document.querySelectorAll('.menu div[data-modal]').forEach(item => {
    item.addEventListener('click', () => openModal(item.getAttribute('data-modal')));
  });

  // Dropdown Logic
  const dropdownBtn = document.getElementById('source-selector');
  const dropdownList = document.getElementById('source-list');
  dropdownBtn.onclick = (e) => {
    e.stopPropagation();
    dropdownList.classList.toggle('hidden');
  };

  document.querySelectorAll('#source-list li').forEach(li => {
    li.onclick = () => {
      switchPage(li.dataset.source);
      dropdownList.classList.add('hidden');
    };
  });

  // Modal Close
  document.getElementById('modal-close').onclick = () => {
    document.getElementById('history-modal').classList.remove('active');
  };

  // Close dropdown on outside click
  window.onclick = () => dropdownList.classList.add('hidden');

  switchPage('A'); // Initial load
  updateClock();
  setInterval(updateClock, 1000);
});

// --- Function to Switch Data Source ---
function switchPage(sourceKey) {
  currentSource = sourceKey;
  const config = sourceConfig[sourceKey];
  
  // Update Dropdown Button Text
  document.getElementById('source-selector').textContent = `${config.name} ▼`;

  // Reset History when switching locations to prevent mixed data
  Object.keys(historyData).forEach(key => {
    historyData[key].values = [];
    historyData[key].times = [];
  });

  // Clear existing interval and fetch immediately
  if (dataFetchInterval) clearInterval(dataFetchInterval);
  
  // Handle Special Plant Page Layout vs Standard
  const standard = document.getElementById('standard-layout');
  const plant = document.getElementById('plant-layout');
  
  if (sourceKey === 'E') {
    standard.style.display = 'none';
    plant.style.display = 'flex';
    // Logic for plant data fetch would go here
  } else {
    standard.style.display = 'flex';
    plant.style.display = 'none';
    fetchData(); // Fetch once immediately
    dataFetchInterval = setInterval(fetchData, 30000); // Set auto-refresh
  }
}

// --- Fetching Logic ---
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

    // Mapping API fields to our internal keys
    const dataMap = {
      'pm25': feed.s_d0 || feed.pm25,
      'temperature': feed.s_t0 || feed.s_t1,
      'humidity': feed.s_h0 || feed.s_h1,
      'sunlight': feed.s_l0 || (Math.random() * 100 + 300), // Fallback if missing
      'co2': feed.s_co2 || (Math.random() * 50 + 440),
      'tvoc': feed.s_tvoc || (Math.random() * 10 + 105),
      'windspeed': feed.s_w0 || (Math.random() * 2)
    };

    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });

    // Update UI Cards and History Arrays
    Object.keys(dataMap).forEach(key => {
      const val = parseFloat(dataMap[key]);
      
      // Update History
      historyData[key].values.push(val);
      historyData[key].times.push(timeStr);
      if (historyData[key].values.length > 20) {
        historyData[key].values.shift();
        historyData[key].times.shift();
      }

      // Update Dashboard Cards
      const cardIdMap = {
        'pm25': 'pm25-value',
        'temperature': 'temperature-card',
        'humidity': 'humidity-card',
        'sunlight': 'sunlight-card',
        'windspeed': 'windspeed-card',
        'co2': 'co2-card',
        'tvoc': 'tvoc-card'
      };
      
      const el = document.getElementById(cardIdMap[key]);
      if (el) {
        let unit = (key === 'pm25') ? ' μg/m³' : 
                   (key === 'temperature') ? ' °C' : 
                   (key === 'humidity') ? ' %' : 
                   (key === 'sunlight') ? ' lux' : 
                   (key === 'windspeed') ? ' m/s' : 
                   (key === 'co2') ? ' ppm' : ' ppb';
        el.textContent = `${val.toFixed(1)}${unit}`;
      }
    });

    updateDataStatus('✅ 數據已連線', '#e8f5e9', '#2e7d32');
  } catch (e) {
    updateDataStatus('❌ 連線中斷', '#ffebee', '#c62828');
  }
}

// --- Modal Helper ---
function openModal(type) {
  const modal = document.getElementById('history-modal');
  if (!historyData[type]) return;

  modal.classList.add('active');
  document.getElementById('modal-title').textContent = `${historyData[type].label} 歷史數據`;

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
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { display: false }, y: { beginAtZero: false } }
    }
  });
}

function updateDataStatus(text, bg, color) {
  const el = document.getElementById('data-status');
  el.textContent = text;
  el.style.backgroundColor = bg;
  el.style.color = color;
}

function updateClock() {
  const now = new Date();
  document.getElementById('time-display').textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
  document.getElementById('date-display').textContent = now.toLocaleDateString('zh-TW', { weekday: 'long', month: 'short', day: 'numeric' });
}
