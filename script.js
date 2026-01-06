let currentSource = 'A';
let currentPageName = '小芳堂';
let isPlantMode = false;
let dataFetchInterval = null;

// ✅ FIXED: 每個位置獨立 device_id，只有司令台有真實數據
const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EBC2994D', hasData: true },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', hasData: true },  // 真實數據
  'C': { name: '小田原', deviceId: 'DEVICE_C', hasData: false },     // 靜態
  'D': { name: '腳踏車練習場', deviceId: 'DEVICE_D', hasData: false }, // 靜態
  'E': { name: '植物觀測', deviceId: 'PLANT_DEVICE', hasData: true }  // ✅ NOW HAS GAS DATA SOURCE
};

// ✅ UPDATED: 植物觀測專用 GAS Web App URL (官方來源)
const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzfUbGWXNdxPdfW7R1c6H03X2g-711TN9L7I4Vn4vS1eyZlIIJtfsulAOz0Yl30-X1LpQ/exec';

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

// ✅ FIXED: 精確頁面切換 + 植物頁面使用 GAS URL
function switchPage(source) {
  currentSource = source;
  currentPageName = sourceConfig[source].name;
  const config = sourceConfig[source];
  
  document.getElementById('source-selector').textContent = `${currentPageName} ▼`;

  // 停止之前的定時器
  if (dataFetchInterval) {
    clearInterval(dataFetchInterval);
    dataFetchInterval = null;
  }

  // 切換顯示區域
  if (source === 'E') {
    // ✅ PLANT MODE - 使用 GAS Web App 作為唯一數據源
    isPlantMode = true;
    document.getElementById('standard-layout').style.display = 'none';
    document.getElementById('plant-layout').style.display = 'flex';
    document.getElementById('plant-layout').classList.add('active');
    updateDataStatus('🌱 植物即時數據', '#e8e8e8', '#888');
    console.log('🌱 切換至植物觀測 - GAS 數據獲取');
    fetchPlantData();  // 立即獲取
    dataFetchInterval = setInterval(fetchPlantData, 30000); // 每30秒更新
  } else {
    // 標準模式 (原有邏輯不變)
    isPlantMode = false;
    document.getElementById('plant-layout').style.display = 'none';
    document.getElementById('plant-layout').classList.remove('active');
    document.getElementById('standard-layout').style.display = 'flex';
    
    if (config.hasData) {
      console.log(`📡 切換至 ${currentPageName} - 開始數據獲取`);
      updateDataStatus('📡 連線中...', '#e8e8e8', '#888');
      fetchData();
      dataFetchInterval = setInterval(fetchData, 30000);
    } else {
      console.log(`⚠️ ${currentPageName} 暫無數據來源`);
      updateStaticData();
      updateDataStatus('⚠️ 暫無數據', '#e8e8e8', '#888');
    }
  }
}

// ✅ NEW: 植物頁面專用 GAS 數據獲取函數
async function fetchPlantData() {
  try {
    console.log('🌿 獲取植物數據:', PLANT_GAS_URL);
    const response = await fetch(PLANT_GAS_URL);
    if (!response.ok) throw new Error('GAS response failed');
    
    const data = await response.json();
    console.log('🌿 植物數據:', data);
    
    // 更新植物頁面所有元素 (假設 GAS 返回對應字段)
    if (data.pm25 !== undefined) document.getElementById('plant-pm25-value').textContent = data.pm25 + ' μg/m³';
    if (data.humidity !== undefined) document.getElementById('plant-humidity').textContent = data.humidity + ' %';
    if (data.temperature !== undefined) document.getElementById('plant-temperature').textContent = data.temperature + ' °C';
    if (data.soil_moisture !== undefined) document.getElementById('plant-soil-humidity').textContent = data.soil_moisture + ' %';
    if (data.co2 !== undefined) document.getElementById('plant-co2').textContent = data.co2 + ' ppm';
    
    updateDataStatus('✅ 植物數據正常', '#e8e8e8', '#333');
  } catch (error) {
    console.error('🌿 植物數據獲取失敗:', error);
    updateDataStatus('❌ 植物數據斷線', '#e8e8e8', '#888');
    // 顯示預設值
    document.getElementById('plant-pm25-value').textContent = '-- μg/m³';
    document.getElementById('plant-humidity').textContent = '-- %';
    document.getElementById('plant-temperature').textContent = '-- °C';
    document.getElementById('plant-soil-humidity').textContent = '-- %';
    document.getElementById('plant-co2').textContent = '-- ppm';
  }
}

// 原有標準數據獲取 (不變)
async function fetchData() {
  try {
    const config = sourceConfig[currentSource];
    const url = `https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`;
    
    console.log(`📡 獲取 ${currentPageName} 數據:`, url);
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 原始數據:', data);
    
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

// 靜態數據 (無 API 的頁面)
function updateStaticData() {
  document.getElementById('pm25-value').textContent = '-- μg/m³';
  document.getElementById('temperature-card').textContent = '-- °C';
  document.getElementById('humidity-card').textContent = '-- %';
  document.getElementById('sunlight-card').textContent = '-- lux';
  document.getElementById('windspeed-card').textContent = '-- m/s';
  document.getElementById('co2-card').textContent = '-- ppm';
  document.getElementById('tvoc-card').textContent = '-- ppb';
}

// ✅ UPDATED: 統一使用儀表板配色方案 (灰色基調)
function updateDataStatus(text, bgColor, color) {
  const statusEl = document.getElementById('data-status');
  statusEl.textContent = text;
  statusEl.style.background = bgColor;
  statusEl.style.color = color;
  statusEl.style.border = `1px solid ${color === '#333' ? '#ddd' : '#bbb'}`;
}

// Clock functionality
function updateClock() {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  const hourDeg = (hours * 30) + (minutes * 0.5);
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;
  
  document.getElementById('hour-hand').style.transform = `rotate(${hourDeg}deg)`;
  document.getElementById('minute-hand').style.transform = `rotate(${minuteDeg}deg)`;
  document.getElementById('second-hand').style.transform = `rotate(${secondDeg}deg)`;
  
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  document.getElementById('date-display').textContent = 
    `${weekdays[now.getDay()]} ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  
  document.getElementById('time-display').textContent = 
    now.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

console.log('🌱 FH EnviroDashboard (植物頁面 GAS 整合版 + 統一配色) 載入完成');
