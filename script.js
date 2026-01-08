let currentSource = 'A';
let chartInstance = null;

const sourceConfig = {
  'A': { name: '小芳堂', deviceId: 'B827EB63D1C8', type: 'standard' },
  'B': { name: '司令台', deviceId: 'B827EBC2994D', type: 'standard' },
  'C': { name: '小田原', deviceId: 'B827EB64E68F', type: 'standard' },
  'D': { name: '腳踏車練習場', deviceId: 'B827EB3C653C', type: 'standard' },
  'E': { name: '植物觀測', deviceId: 'PLANT_01', type: 'plant' }
};

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Clicks
  document.querySelectorAll('.menu div[data-modal]').forEach(item => {
    item.onclick = () => openModal(item.getAttribute('data-modal'));
  });

  // Dropdown Logic
  const dropBtn = document.getElementById('source-selector');
  const dropList = document.getElementById('source-list');
  
  dropBtn.onclick = (e) => {
    e.stopPropagation();
    dropList.classList.toggle('hidden');
  };

  document.querySelectorAll('#source-list li').forEach(li => {
    li.onclick = () => {
      switchPage(li.dataset.source);
      dropList.classList.add('hidden');
    };
  });

  // Close modal
  document.getElementById('modal-close').onclick = () => {
    document.getElementById('history-modal').classList.remove('active');
  };

  // Start initial page
  switchPage('A');
  setInterval(updateClock, 1000);
});

function switchPage(sourceKey) {
  currentSource = sourceKey;
  const config = sourceConfig[sourceKey];
  
  // Update UI Text
  document.getElementById('source-selector').textContent = config.name + " ▼";

  // Page Switching Logic
  const standardPage = document.getElementById('standard-page');
  const plantPage = document.getElementById('plant-page');

  // Remove active class from all
  standardPage.classList.remove('active', 'fade-in');
  plantPage.classList.remove('active', 'fade-in');

  // Show the correct page
  if (config.type === 'plant') {
    plantPage.classList.add('active', 'fade-in');
  } else {
    standardPage.classList.add('active', 'fade-in');
    fetchData(); // Load data for standard layout
  }
}

async function fetchData() {
  const config = sourceConfig[currentSource];
  try {
    const res = await fetch(`https://pm25.lass-net.org/data/last.php?device_id=${config.deviceId}`);
    const data = await res.json();
    const feed = data.feeds[0][Object.keys(data.feeds[0])[0]];

    // Update PM2.5
    document.getElementById('pm25-value').textContent = (feed.s_d0 || feed.pm25).toFixed(1) + " μg/m³";
    // Update others...
    document.getElementById('temperature-card').textContent = (feed.s_t0 || 0).toFixed(1) + " °C";
    document.getElementById('humidity-card').textContent = (feed.s_h0 || 0).toFixed(1) + " %";
  } catch (e) {
    console.log("Fetch error", e);
  }
}

function openModal(type) {
  document.getElementById('history-modal').classList.add('active');
  // Chart logic here...
}

function updateClock() {
  const now = new Date();
  document.getElementById('time-display').textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
}
