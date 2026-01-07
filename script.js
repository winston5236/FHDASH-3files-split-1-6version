let currentSource = 'A';
let currentPageName = '小芳堂';
let isPlantMode = false;
let dataFetchInterval = null;

// ✅ UPDATED: Source A now points to B827EB63D1C8
const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', hasData: true },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', hasData: true },
  'C': { name: '小田原', deviceId: 'DEVICE_C', hasData: false },
  'D': { name: '腳踏車練習場', deviceId: 'DEVICE_D', hasData: false },
  'E': { name: '植物觀測', deviceId: 'PLANT_DEVICE', hasData: true }
};

// ✅ UPDATED: Target GAS Web App URL for Plant Mode
const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWD2sPK7Iw61gkzCTCOLIYEnmfirKXeLgdvxR3m6vEs1ZecdUj9x5YPwNvMSqW47gtHQ/exec';

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
  const standardLayout = document.getElementById('standard-layout');
  const plantLayout = document.getElementById('plant-layout');
  const dataStatus = document.getElementById('data-status');

  // Dropdown functionality
  const dropdownBtn = document.getElementById('source-selector');
  const dropdownList = document.getElementById('source-list');
  
  dropdownBtn.addEventListener('click', () => {
    dropdownList.classList.toggle('hidden');
  });
  
  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target) && !dropdownList.contains(e.target)) {
      dropdownList.classList.add('hidden');
    }
  });
  
  document.querySelectorAll('#source-list li').forEach(item => {
    item.addEventListener('click', () => {
      const source = item.dataset.source;
      switchPage(source);
      dropdownList.classList.add('hidden');
    });
  });

  // Modal functionality
  const modal = document.getElementById('history-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalType = document.getElementById('modal-type');
  
  document.querySelectorAll('.menu div[data-modal]').forEach(button => {
    button.addEventListener('click', () => {
      modalTitle.textContent = `${currentPageName} ${button.textContent}`;
      modalType.textContent = button.textContent;
      modal.classList.add('active');
    });
  });
  
  document.getElementById('modal-close').onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });

  // Initialize
  switchPage('A');
  updateClock();
  setInterval(updateClock, 1000);
});

// 精確頁面切換
function switchPage(source) {
  currentSource = source;
  currentPageName = sourceConfig[source].name;
  const config = sourceConfig[source];
  
  document.getElementById('source-selector').textContent = `${currentPageName} ▼`;

  if (dataFetchInterval) {
    clearInterval(dataFetchInterval);
    dataFetchInterval = null;
  }

  if (source === 'E') {
    isPlantMode = true;
    document.getElementById('standard-layout').style.display = 'none';
    document.getElementById('plant-layout').style.display = 'flex';
    document.getElementById('plant-layout').classList.add('active');
    updateDataStatus('🌱 植物即時數據', '#e8e8e8', '#888');
    fetchPlantData();
    dataFetchInterval = setInterval(fetchPlantData, 30000);
  } else {
    isPlantMode = false;
    document.getElementById('plant-layout').style.display = 'none';
    document.getElementById('plant-layout').classList.remove('active');
    document.getElementById('standard-layout').style.display = 'flex';
    
    if (config.hasData) {
      updateDataStatus('📡 連線中...', '#e8e8e8', '#888');
      fetchData();
      dataFetchInterval = setInterval(fetchData, 30000);
    } else {
      updateStaticData();
      updateDataStatus('⚠️ 暫無數據', '#e8e8e8', '#888');
    }
  }
}

// 植物頁面 GAS 數據獲取
async function fetchPlantData() {
  try {
    const response = await fetch(PLANT_GAS_URL);
    if (!response.ok) throw new Error('GAS response failed');
    
    const data = await response.json();
    
    if (data.pm25 !== undefined) document.getElementById('plant-pm25-value').textContent = data.pm25 + ' μg/m³';
    if (data.humidity !== undefined) document.getElementById('plant-humidity').textContent = data.humidity + ' %';
    if (data.temperature !== undefined) document.getElementById('plant-temperature').textContent = data.temperature + ' °C';
    if (data.soil_moisture !== undefined) document.getElementById('plant-soil-humidity').textContent = data.soil_moisture + ' %';
    if (data.co2 !== undefined) document.getElementById('plant-co2').textContent = data.co2 + ' ppm';
    
    updateDataStatus('✅ 植物數據正常', '#e8e8e8', '#333');
  } catch (error) {
    console.error('🌿 植物數據獲取失敗:', error);
    updateDataStatus('❌ 植物數據斷線', '#e8e8e8', '#888');
    document.getElementById('plant-pm25-value').textContent = '-- μg/m³';
    document.getElementById('plant-humidity').textContent = '-- %';
    document.getElementById('plant-temperature').textContent = '-- °C';
    document.getElementById('plant-soil-humidity').textContent = '-- %';
    document.getElementById('plant-co2').textContent = '-- ppm';
  }
}

// 標準環境數據獲取 (小芳堂 & 司令台)
async function fetchData() {
  try {
    const config = sourceConfig[currentSource];
    const url = `https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Mapping LASS keys to UI elements
    if (data.s_d0 !== undefined) document.getElementById('pm25-value').textContent = data.s_d0 + ' μg/m³';
    if (data.s_t0 !== undefined) document.getElementById('temperature-card').textContent = data.s_t0 + ' °C';
    if (data.s_h0 !== undefined) document.getElementById('humidity-card').textContent = data.s_h0 + ' %';
    if (data.s_w0 !== undefined) document.getElementById('windspeed-card').textContent = data.s_w0 + ' m/s';
    if (data.s_co2 !== undefined) document.getElementById('co2-card').textContent = data.s_co2 + ' ppm';
    if (data.s_tvoc !== undefined) document.getElementById('tvoc-card').textContent = data.s_tvoc + ' ppb';
    if (data.s_lux0 !== undefined) document.getElementById('sunlight-card').textContent = data.s_lux0 + ' lux';
    
    updateDataStatus('✅ 環境數據正常', '#e8e8e8', '#333');
  } catch (error) {
    console.error('📡 資料獲取失敗:', error);
    updateDataStatus('❌ 環境數據斷線', '#e8e8e8', '#888');
  }
}

function updateStaticData() {
  const fields = ['pm25-value', 'temperature-card', 'humidity-card', 'sunlight-card', 'windspeed-card', 'co2-card', 'tvoc-card'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '--';
  });
}

function updateDataStatus(text, bgColor, color) {
  const statusEl = document.getElementById('data-status');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.background = bgColor;
    statusEl.style.color = color;
  }
}

function updateClock() {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  const hourDeg = (hours * 30) + (minutes * 0.5);
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;
  
  const hHand = document.getElementById('hour-hand');
  const mHand = document.getElementById('minute-hand');
  const sHand = document.getElementById('second-hand');
  
  if (hHand) hHand.style.transform = `rotate(${hourDeg}deg)`;
  if (mHand) mHand.style.transform = `rotate(${minuteDeg}deg)`;
  if (sHand) sHand.style.transform = `rotate(${secondDeg}deg)`;
  
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dateDisp = document.getElementById('date-display');
  const timeDisp = document.getElementById('time-display');
  
  if (dateDisp) dateDisp.textContent = `${weekdays[now.getDay()]} ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  if (timeDisp) timeDisp.textContent = now.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
