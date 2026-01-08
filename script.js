const PLANT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWD2sPK7Iw61gkzCTCOLIYEnmfirKXeLgdvxR3m6vEs1ZecdUj9x5YPwNvMSqW47gtHQ/exec';

const sourceConfig = {
    'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', type: 'lass' },
    'B': { name: '司令台', deviceId: 'B827EBC2994D', type: 'lass' },
    'C': { name: '小田原', deviceId: '', type: 'none' },
    'D': { name: '腳踏車練習場', deviceId: '', type: 'none' },
    'E': { name: '植物觀測', deviceId: '', type: 'gas' }
};

let currentSource = 'A';
let dataFetchInterval = null;
let pm25GaugeChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initPM25Gauge();
    updateClock();
    setInterval(updateClock, 1000);

    const dropdownBtn = document.getElementById('source-selector');
    const dropdownList = document.getElementById('source-list');

    // Dropdown toggle
    dropdownBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownList.classList.toggle('hidden');
    };

    // Close dropdown on outside click
    window.onclick = () => dropdownList.classList.add('hidden');

    // Switch logic
    document.querySelectorAll('#source-list li').forEach(li => {
        li.onclick = () => {
            currentSource = li.dataset.source;
            dropdownBtn.textContent = sourceConfig[currentSource].name + " ▼";
            switchPage();
        };
    });

    // Modal Close
    const modal = document.getElementById('history-modal');
    document.getElementById('modal-close').onclick = () => modal.classList.remove('active');

    // Initial load
    switchPage();
});

function switchPage() {
    if (dataFetchInterval) clearInterval(dataFetchInterval);

    const std = document.getElementById('standard-layout');
    const plant = document.getElementById('plant-layout');
    const none = document.getElementById('no-data-layout');

    // Hide everything first
    [std, plant, none].forEach(el => el.classList.add('hidden'));

    const config = sourceConfig[currentSource];

    if (config.type === 'lass') {
        std.classList.remove('hidden');
        fetchLassData();
        dataFetchInterval = setInterval(fetchLassData, 30000);
    } else if (config.type === 'gas') {
        plant.classList.remove('hidden');
        fetchPlantData();
        dataFetchInterval = setInterval(fetchPlantData, 30000);
    } else {
        none.classList.remove('hidden');
        updateDataStatus("⚠️ 無數據源", "#999");
    }
}

async function fetchLassData() {
    try {
        const id = sourceConfig[currentSource].deviceId;
        const res = await fetch(`https://pm25.lass-net.org/data/last.php?device_id=${id}`);
        const data = await res.json();
        const feed = data.feeds[0][Object.keys(data.feeds[0])[0]];

        const pm25 = parseFloat(feed.s_d0 || feed.pm25);
        const temp = parseFloat(feed.s_t0 || feed.s_t1);
        const humi = parseFloat(feed.s_h0 || feed.s_h1);

        updatePM25Gauge(pm25);
        document.getElementById('temperature-card').textContent = `${temp.toFixed(1)} °C`;
        document.getElementById('humidity-card').textContent = `${humi.toFixed(1)} %`;
        document.getElementById('precipitation-card').textContent = `${calculatePrecip(humi, temp)} %`;
        document.getElementById('windspeed-card').textContent = `${(feed.s_w0 || 0).toFixed(1)} m/s`;
        document.getElementById('sunlight-card').textContent = `${(feed.s_l0 || 350).toFixed(0)} lux`;
        
        updateDataStatus("✅ 連線正常", "#2e7d32");
    } catch (e) {
        updateDataStatus("❌ 數據讀取失敗", "#c62828");
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
        updateDataStatus("✅ 植物數據更新", "#2e7d32");
    } catch (e) {
        updateDataStatus("❌ 植物數據錯誤", "#c62828");
    }
}

function calculatePrecip(h, t) {
    let chance = h > 70 ? Math.pow((h - 70) / 30, 2) * 100 : 0;
    return Math.min(Math.round(chance), 99);
}

function initPM25Gauge() {
    const ctx = document.getElementById('pm25Gauge').getContext('2d');
    pm25GaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: ['#3aa02d', '#ddd'], borderWidth: 0, circumference: 270, rotation: 225, cutout: '85%' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function updatePM25Gauge(val) {
    let color = '#3aa02d', status = "良好";
    if(val > 35) { color = '#ff9800'; status = "普通"; }
    if(val > 54) { color = '#f44336'; status = "有害"; }

    document.getElementById('pm25-value').textContent = val;
    const badge = document.getElementById('pm25-status-badge');
    badge.textContent = status;
    badge.style.backgroundColor = color;

    pm25GaugeChart.data.datasets[0].data = [Math.min(val, 100), 100 - Math.min(val, 100)];
    pm25GaugeChart.data.datasets[0].backgroundColor[0] = color;
    pm25GaugeChart.update();
}

function updateClock() {
    const now = new Date();
    document.getElementById('time-display').textContent = now.toLocaleTimeString();
    document.getElementById('date-display').textContent = now.toLocaleDateString();
}

function updateDataStatus(msg, color) {
    const el = document.getElementById('data-status');
    el.textContent = msg;
    el.style.color = color;
}
