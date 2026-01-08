/**
 * Calculates a precipitation probability proxy based on Humidity and Temperature.
 * Formula: Uses an exponential curve that increases rapidly as Humidity exceeds 70%.
 */
function calculatePrecipitationChance(humidity, temp) {
  if (humidity === null || temp === null) return "--";
  
  // Base probability starts to rise significantly after 70% humidity
  let chance = 0;
  if (humidity > 70) {
    chance = Math.pow((humidity - 70) / 30, 2) * 100;
  }
  
  // Temperature adjustment: Cold air holds less moisture, slightly increasing 
  // saturation risk at lower temps for the same humidity level.
  if (temp < 20) chance += (20 - temp) * 0.5;

  // Cap the results between 0 and 99% (unless it's actually raining)
  return Math.min(Math.max(Math.round(chance), 0), 99);
}

// UPDATE THIS INSIDE YOUR fetchData() function:
// Inside the 'for' loop where you update sensors:
const precipChance = calculatePrecipitationChance(sensors.humidity.val, sensors.temperature.val);
const precipEl = document.getElementById('precipitation-card');
if (precipEl) precipEl.textContent = `${precipChance} %`;
