// dashboard - thingspeak polling + token billing game + analytics
let pollInterval = null;
let tokenBalance = 1000;
let channelId = '';
let readApiKey = '';
let lastUpdate = null;
let totalCostAccumulated = 0;
let pollCount = 0;
let userThresholds = null;
let analyticsChart = null;

function initDashboard(config) {
  channelId = config.channelId;
  readApiKey = config.readApiKey;
  tokenBalance = config.tokenBalance || 1000;
  userThresholds = config.thresholds || {
    tempWarning: 26, tempAlert: 30,
    distWarning: 30, distAlert: 10,
    airWarning: 150, airAlert: 300,
    humidWarning: 70, humidAlert: 85
  };

  updateTokenDisplay();
  updateSensorCards(null); // set default state

  // Init chart
  initChart();

  // Setup notif button
  const notifBtn = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  if (notifBtn && notifDropdown) {
    notifBtn.onclick = () => {
      notifDropdown.classList.toggle('hidden');
      document.getElementById('notif-badge').classList.add('hidden');
      document.getElementById('notif-badge').textContent = '0';
    };
  }

  // langsung fetch sekali, terus poll tiap 20s
  fetchSensorData();
  pollInterval = setInterval(fetchSensorData, 20000);

  // recharge button
  const rechargeBtn = document.getElementById('recharge-btn');
  if (rechargeBtn) {
    rechargeBtn.addEventListener('click', handleRecharge);
  }
}

function stopDashboard() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (analyticsChart) {
    analyticsChart.destroy();
    analyticsChart = null;
  }
}

function initChart() {
  const ctx = document.getElementById('analyticsChart');
  if (!ctx) return;
  
  Chart.defaults.color = '#00ffcc';
  Chart.defaults.font.family = "'VT323', monospace";
  Chart.defaults.font.size = 14;

  analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Suhu (°C)',
          data: [],
          borderColor: '#ff5c5c',
          backgroundColor: 'rgba(255, 92, 92, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Kelembapan (%)',
          data: [],
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Kualitas Udara (AQI)',
          data: [],
          borderColor: '#58a6ff',
          backgroundColor: 'rgba(88, 166, 255, 0.1)',
          yAxisID: 'y1',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Jarak (cm)',
          data: [],
          borderColor: '#ffb347',
          backgroundColor: 'rgba(255, 179, 71, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true,
          hidden: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false }
        }
      }
    }
  });

  // Bind checkbox toggles
  document.querySelectorAll('.chart-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const isVisible = e.target.checked;
      analyticsChart.setDatasetVisibility(index, isVisible);
      analyticsChart.update();
    });
  });
}

async function fetchSensorData() {
  const statusEl = document.getElementById('connection-status');

  try {
    // Fetch last 20 results for the chart
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=20`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`ThingSpeak returned ${res.status}`);
    }

    const data = await res.json();

    if (!data || !data.channel || !data.feeds || data.feeds.length === 0) {
      throw new Error('Empty response from ThingSpeak');
    }

    const feeds = data.feeds;
    const lastFeed = feeds[feeds.length - 1];

    lastUpdate = lastFeed.created_at;
    pollCount++;

    updateSensorCards(lastFeed);
    calculateBilling(lastFeed);
    updateAnalyticsChart(feeds);
    updateTimestamp();

    if (statusEl) {
      statusEl.textContent = 'ONLINE';
      statusEl.className = 'status-badge online';
    }
  } catch (err) {
    console.log('thingspeak fetch error:', err.message);

    if (statusEl) {
      statusEl.textContent = 'OFFLINE';
      statusEl.className = 'status-badge offline';
    }
  }
}

function updateAnalyticsChart(feeds) {
  if (!analyticsChart) return;
  
  const labels = [];
  const tempData = [];
  const humidData = [];
  const airData = [];
  const distData = [];

  feeds.forEach(feed => {
    const time = new Date(feed.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit' });
    labels.push(time);
    tempData.push(feed.field1 ? parseFloat(feed.field1) : null);
    humidData.push(feed.field6 ? parseFloat(feed.field6) : null);
    airData.push(feed.field5 ? parseFloat(feed.field5) : null);
    distData.push(feed.field3 ? parseFloat(feed.field3) : null);
  });

  analyticsChart.data.labels = labels;
  analyticsChart.data.datasets[0].data = tempData;
  analyticsChart.data.datasets[1].data = humidData;
  analyticsChart.data.datasets[2].data = airData;
  analyticsChart.data.datasets[3].data = distData;
  analyticsChart.update();
}

function addNotification(message, type = 'warning') {
  const notifList = document.getElementById('notif-list');
  const notifBadge = document.getElementById('notif-badge');
  if (!notifList || !notifBadge) return;

  const emptyMsg = notifList.querySelector('.notif-empty');
  if (emptyMsg) emptyMsg.remove();

  const li = document.createElement('li');
  li.className = `notif-item ${type}`;
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
  
  let icon = '⚠️';
  if (type === 'alert') icon = '🚨';
  
  li.innerHTML = `<span class="notif-time">${time}</span><span class="notif-msg">${icon} ${message}</span>`;
  
  notifList.insertBefore(li, notifList.firstChild);
  
  if (notifList.children.length > 20) {
    notifList.removeChild(notifList.lastChild);
  }

  // Update badge if dropdown is hidden
  const notifDropdown = document.getElementById('notif-dropdown');
  if (notifDropdown.classList.contains('hidden')) {
    let current = parseInt(notifBadge.textContent) || 0;
    notifBadge.textContent = current + 1;
    notifBadge.classList.remove('hidden');
  }
}

let lastAlerts = { temp: false, air: false, dist: false, motion: false };

function updateSensorCards(data) {
  if (!userThresholds) return;

  // field1 = temperature (Suhu)
  const tempVal = document.getElementById('temp-value');
  const tempStatus = document.getElementById('temp-status');
  const tempCard = document.getElementById('card-temp');

  if (data && data.field1 !== null) {
    const temp = parseFloat(data.field1);
    tempVal.textContent = parseFloat(temp).toFixed(1) + '°C';

    if (temp > userThresholds.tempAlert) {
      tempStatus.textContent = 'PANAS - AC ON';
      tempCard.className = 'sensor-card alert';
      if (!lastAlerts.temp) {
        addNotification(`Suhu mencapai tingkat bahaya: ${temp}°C`, 'alert');
        lastAlerts.temp = true;
      }
    } else if (temp > userThresholds.tempWarning) {
      tempStatus.textContent = 'HANGAT - KIPAS ON';
      tempCard.className = 'sensor-card warning';
      lastAlerts.temp = false;
    } else {
      tempStatus.textContent = 'OPTIMAL';
      tempCard.className = 'sensor-card good';
      lastAlerts.temp = false;
    }

    const gauge = document.getElementById('temp-gauge-fill');
    if (gauge) {
      const pct = Math.min(100, Math.max(0, (temp / 50) * 100));
      gauge.style.width = pct + '%';
    }
  } else {
    tempVal.textContent = '--°C';
    tempStatus.textContent = 'NO DATA';
    if (tempCard) tempCard.className = 'sensor-card';
  }

  // field6 = humidity (Kelembapan)
  const humidVal = document.getElementById('humid-value');
  const humidStatus = document.getElementById('humid-status');
  const humidCard = document.getElementById('card-humid');

  if (data && data.field6 !== null) {
    const humid = parseFloat(data.field6);
    if (humidVal) humidVal.textContent = humid.toFixed(1) + '%';

    if (humid > userThresholds.humidAlert) {
      if (humidStatus) humidStatus.textContent = 'SANGAT LEMBAP';
      if (humidCard) humidCard.className = 'sensor-card alert';
    } else if (humid > userThresholds.humidWarning) {
      if (humidStatus) humidStatus.textContent = 'LEMBAP';
      if (humidCard) humidCard.className = 'sensor-card warning';
    } else {
      if (humidStatus) humidStatus.textContent = 'NORMAL';
      if (humidCard) humidCard.className = 'sensor-card good';
    }
  } else {
    if (humidVal) humidVal.textContent = '--%';
    if (humidStatus) humidStatus.textContent = 'NO DATA';
    if (humidCard) humidCard.className = 'sensor-card';
  }

  // field2 = light (Cahaya, 0=terang/bright, 1=gelap/dark)
  const lightVal = document.getElementById('light-value');
  const lightStatus = document.getElementById('light-status');
  const lightIcon = document.getElementById('light-icon');
  const lightCard = document.getElementById('card-light');

  if (data && data.field2 !== null) {
    const lightOn = parseInt(data.field2) === 0;
    lightVal.textContent = lightOn ? 'TERANG' : 'GELAP';
    lightStatus.textContent = lightOn ? 'CAHAYA CUKUP' : 'BUTUH LAMPU';

    if (lightIcon) {
      lightIcon.classList.toggle('on', lightOn);
    }
    if (lightCard) {
      lightCard.className = lightOn ? 'sensor-card good' : 'sensor-card warning';
    }
  } else {
    lightVal.textContent = '--';
    lightStatus.textContent = 'NO DATA';
  }

  // field3 = distance (Jarak)
  const distVal = document.getElementById('dist-value');
  const distStatus = document.getElementById('dist-status');
  const distCard = document.getElementById('card-dist');

  if (data && data.field3 !== null) {
    const distance = parseInt(data.field3);
    distVal.textContent = distance + ' cm';
    
    if (distance < userThresholds.distAlert) {
      distStatus.textContent = 'TERLALU DEKAT';
      if (distCard) distCard.className = 'sensor-card alert';
      if (!lastAlerts.dist) {
        addNotification(`Objek terlalu dekat: ${distance} cm`, 'alert');
        lastAlerts.dist = true;
      }
    } else if (distance < userThresholds.distWarning) {
      distStatus.textContent = 'JARAK AMAN';
      if (distCard) distCard.className = 'sensor-card warning';
      lastAlerts.dist = false;
    } else {
      distStatus.textContent = 'JAUH';
      if (distCard) distCard.className = 'sensor-card good';
      lastAlerts.dist = false;
    }
  } else {
    if (distVal) distVal.textContent = '-- cm';
    if (distStatus) distStatus.textContent = 'NO DATA';
  }

  // field4 = motion (Gerak)
  const motionVal = document.getElementById('motion-value');
  const motionStatus = document.getElementById('motion-status');
  const motionCard = document.getElementById('card-motion');
  const radarPulse = document.getElementById('radar-pulse');

  if (data && data.field4 !== null) {
    const detected = parseInt(data.field4) === 1;
    motionVal.textContent = detected ? 'ADA GERAKAN' : 'KOSONG';
    motionStatus.textContent = detected ? 'TERDETEKSI AKTIVITAS' : 'TIDAK ADA AKTIVITAS';

    if (motionCard) {
      motionCard.className = detected ? 'sensor-card alert' : 'sensor-card good';
    }
    if (radarPulse) {
      radarPulse.classList.toggle('active', detected);
    }
    if (detected && !lastAlerts.motion) {
      addNotification('Pergerakan terdeteksi di area sensor', 'warning');
      lastAlerts.motion = true;
    } else if (!detected) {
      lastAlerts.motion = false;
    }
  } else {
    motionVal.textContent = '--';
    motionStatus.textContent = 'NO DATA';
  }

  // field5 = air quality (Kualitas Udara)
  const airVal = document.getElementById('air-value');
  const airStatus = document.getElementById('air-status');
  const airCard = document.getElementById('card-air');

  if (data && data.field5 !== null) {
    const airQuality = parseInt(data.field5);
    airVal.textContent = airQuality;
    
    if (airQuality > userThresholds.airAlert) {
      airStatus.textContent = 'BERBAHAYA';
      if (airCard) airCard.className = 'sensor-card alert';
      if (!lastAlerts.air) {
        addNotification(`Kualitas udara berbahaya (AQI: ${airQuality})`, 'alert');
        lastAlerts.air = true;
      }
    } else if (airQuality > userThresholds.airWarning) {
      airStatus.textContent = 'KURANG SEHAT';
      if (airCard) airCard.className = 'sensor-card warning';
      lastAlerts.air = false;
    } else {
      airStatus.textContent = 'SEHAT';
      if (airCard) airCard.className = 'sensor-card good';
      lastAlerts.air = false;
    }
  } else {
    if (airVal) airVal.textContent = '--';
    if (airStatus) airStatus.textContent = 'NO DATA';
  }
}

function calculateBilling(data) {
  if (!data || !userThresholds) return;

  let cost = 0;
  let breakdown = [];

  // temperature cost
  const temp = parseFloat(data.field1);
  if (!isNaN(temp)) {
    if (temp > userThresholds.tempAlert) {
      cost += 2;
      breakdown.push('AC: -2');
    } else if (temp > userThresholds.tempWarning) {
      cost += 1;
      breakdown.push('Kipas: -1');
    }
  }

  // light cost
  const lightOn = parseInt(data.field2) === 0;
  if (!lightOn) {
    cost += 1;
    breakdown.push('Lampu: -1');
  }

  // air quality cost 
  const airQuality = parseInt(data.field5);
  if (!isNaN(airQuality) && airQuality > userThresholds.airWarning) {
    cost += 2;
    breakdown.push('Purifier: -2');
  }

  // motion occupancy bonus
  const motion = parseInt(data.field4);
  if (motion === 1) {
    cost -= 1; // bonus efficiency
    breakdown.push('Aktivitas: +1');
  }

  tokenBalance -= cost;
  if (tokenBalance < 0) tokenBalance = 0;
  totalCostAccumulated += cost;

  updateTokenDisplay();
  updateBillingLog(cost, breakdown);

  // save token balance ke backend tiap 5 polls
  if (pollCount % 5 === 0) {
    saveTokenBalance();
  }
}

function updateTokenDisplay() {
  const tokenEl = document.getElementById('token-balance');
  const tokenBar = document.getElementById('token-bar-fill');
  const tokenContainer = document.getElementById('token-container');

  if (tokenEl) {
    tokenEl.textContent = Math.round(tokenBalance);
  }

  if (tokenBar) {
    const pct = Math.min(100, Math.max(0, (tokenBalance / 1000) * 100));
    tokenBar.style.width = pct + '%';

    if (pct < 5) {
      tokenBar.className = 'token-bar-fill critical';
    } else if (pct < 20) {
      tokenBar.className = 'token-bar-fill low';
    } else {
      tokenBar.className = 'token-bar-fill';
    }
  }

  if (tokenContainer) {
    tokenContainer.classList.toggle('critical-pulse', tokenBalance < 50);
    tokenContainer.classList.toggle('low-warning', tokenBalance < 200 && tokenBalance >= 50);
  }
}

function updateBillingLog(cost, breakdown) {
  const logEl = document.getElementById('billing-log');
  if (!logEl) return;

  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  const sign = cost > 0 ? '-' : '+';
  const color = cost > 0 ? 'var(--color-alert)' : 'var(--color-good)';

  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-cost" style="color: ${color}">${sign}${Math.abs(cost)} ⚡</span>
    <span class="log-detail">${breakdown.join(' | ')}</span>
  `;

  logEl.insertBefore(entry, logEl.firstChild);

  while (logEl.children.length > 20) {
    logEl.removeChild(logEl.lastChild);
  }
}

function updateTimestamp() {
  const el = document.getElementById('last-update');
  if (el && lastUpdate) {
    el.textContent = 'Last: ' + timeAgo(lastUpdate);
  }
}

setInterval(() => {
  updateTimestamp();
}, 1000);

async function handleRecharge() {
  tokenBalance = 1000;
  totalCostAccumulated = 0;
  updateTokenDisplay();
  await saveTokenBalance();

  const container = document.getElementById('token-container');
  if (container) {
    container.classList.add('recharge-flash');
    setTimeout(() => container.classList.remove('recharge-flash'), 600);
  }
}

async function saveTokenBalance() {
  try {
    await apiFetch('/api/config/tokens', {
      method: 'PUT',
      body: { tokenBalance: Math.round(tokenBalance) }
    });
  } catch (err) {
    console.log('token save failed:', err.message);
  }
}
