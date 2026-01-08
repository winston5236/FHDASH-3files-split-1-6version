// --- Modal Logic ---
function openModal(type) {
  const modal = document.getElementById('history-modal');
  const title = document.getElementById('modal-title');
  const desc = document.getElementById('modal-description');
  const ctx = document.getElementById('historyChart').getContext('2d');

  if (!historyData[type]) return; 

  // CHANGED: Use the CSS class instead of inline style
  modal.classList.add('active'); 
  
  title.textContent = `${historyData[type].label} 歷史趨勢`;
  desc.textContent = `顯示最近 20 筆記錄的即時變化。`;

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
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { display: false } },
        y: { beginAtZero: false }
      }
    }
  });
}

// --- Close Modal Logic ---
document.getElementById('modal-close').onclick = () => {
  document.getElementById('history-modal').classList.remove('active');
};

// Also close if clicking outside the white box
window.onclick = (event) => {
  const modal = document.getElementById('history-modal');
  if (event.target === modal) {
    modal.classList.remove('active');
  }
};
