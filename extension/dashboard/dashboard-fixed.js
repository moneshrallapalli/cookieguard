// CookieGuard Dashboard - Fixed Version (No Modules)
console.log('🍪 Dashboard loading...');

let allCookiesData = [];

// ============================================================================
// DATA LOADING via Background Worker
// ============================================================================

async function loadDataFromBackground() {
  console.log('🔄 Loading cookie data...');

  // Always use Chrome API directly for now
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({}, (cookies) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting cookies:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }

      console.log('✓ Got', cookies.length, 'cookies from Chrome API');

      const enrichedCookies = cookies.map(cookie => ({
        ...cookie,
        classification: classifyCookie(cookie),
        timestamp: Date.now()
      }));

      resolve(enrichedCookies);
    });
  });
}

// Simple client-side classification (fallback)
function classifyCookie(cookie) {
  const name = cookie.name.toLowerCase();
  const domain = cookie.domain.toLowerCase();

  // Essential cookies (including Google account management)
  if (/^(session|csrf|auth|token|sidcc|__secure-.*sidcc|nid|hsid|ssid|apisid|sapisid)/i.test(name)) {
    return { category: 'essential', confidence: 0.95 };
  }
  if (/google\.com|gstatic\.com|youtube\.com/.test(domain) && cookie.secure) {
    return { category: 'essential', confidence: 0.9 };
  }
  if (/^jsessionid/i.test(name)) {
    return { category: 'essential', confidence: 0.95 };
  }

  // Analytics
  if (/^(_ga|_gid|_gat|__utm)/i.test(name)) {
    return { category: 'analytics', confidence: 0.9 };
  }
  if (/analytics/i.test(name) && !name.startsWith('lms_')) {
    return { category: 'analytics', confidence: 0.85 };
  }

  // Advertising
  if (/^(_fbp|_fbc|fr|ide|test_cookie)/i.test(name)) {
    return { category: 'advertising', confidence: 0.9 };
  }
  if (/doubleclick|adsense|adservice/.test(domain)) {
    return { category: 'advertising', confidence: 0.9 };
  }

  // Social widgets ONLY (not main sites)
  if (/connect\.facebook\.net|platform\.twitter\.com|platform\.linkedin\.com|widgets\.pinterest\.com|embed\.reddit\.com/.test(domain)) {
    return { category: 'social', confidence: 0.85 };
  }

  // Functional cookies
  if (cookie.hostOnly && !cookie.expirationDate) {
    return { category: 'functional', confidence: 0.7 };
  }

  // LinkedIn functional cookies (when ON linkedin.com)
  const linkedInPatterns = /^(bcookie|bscookie|lang|lidc|li_at|li_theme|timezone|sdui_ver|li_sugr|aam_uuid|g_state|liap|lms_ads|lms_analytics|dfpfpt|fptctx2|_guid|_pxvid|UserMatchHistory|AnalyticsSyncHistory)/i;
  if (/linkedin\.com/.test(domain) && linkedInPatterns.test(name)) {
    return { category: 'functional', confidence: 0.85 };
  }

  // Facebook functional cookies (when ON facebook.com)
  if (/facebook\.com/.test(domain) && /^(c_user|xs|datr|locale|wd)/i.test(name)) {
    return { category: 'functional', confidence: 0.85 };
  }

  // Cloudflare security
  if (/^__cf_bm/i.test(name)) {
    return { category: 'functional', confidence: 0.8 };
  }

  // Adobe functional
  if (/^(AMCV_|AMCVS_)/i.test(name)) {
    return { category: 'functional', confidence: 0.75 };
  }

  return { category: 'unknown', confidence: 0.5 };
}

// ============================================================================
// DASHBOARD RENDERING
// ============================================================================

async function init() {
  console.log('🔄 Initializing dashboard...');

  try {
    allCookiesData = await loadDataFromBackground();
    console.log('✓ Loaded', allCookiesData.length, 'cookies');

    if (allCookiesData.length === 0) {
      document.querySelector('.dashboard').innerHTML = `
        <div style="padding: 60px; text-align: center; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 48px; margin-bottom: 20px;">🍪</h1>
          <h2 style="color: #667eea; margin-bottom: 16px;">No Cookies Yet</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 24px;">
            Visit some websites to start tracking cookies!
          </p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-weight: 600; margin-bottom: 12px;">Try visiting:</p>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 8px 0;"><a href="https://www.cnn.com" target="_blank" style="color: #667eea;">CNN.com</a></li>
              <li style="margin: 8px 0;"><a href="https://www.amazon.com" target="_blank" style="color: #667eea;">Amazon.com</a></li>
              <li style="margin: 8px 0;"><a href="https://www.youtube.com" target="_blank" style="color: #667eea;">YouTube.com</a></li>
            </ul>
          </div>
          <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;">
            Refresh Dashboard
          </button>
        </div>
      `;
      return;
    }

    renderDashboard();
    setupEventListeners();
    console.log('✓ Dashboard ready');
  } catch (error) {
    console.error('Dashboard init error:', error);
    document.querySelector('.dashboard').innerHTML = `
      <div style="padding: 60px; text-align: center;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">⚠️</h1>
        <h2 style="color: #dc3545; margin-bottom: 16px;">Dashboard Error</h2>
        <p style="color: #666; margin-bottom: 24px;">${error.message || 'Unknown error occurred'}</p>
        <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;">
          Retry
        </button>
      </div>
    `;
  }
}

function renderDashboard() {
  updateOverviewStats();
  renderPieChart();
  renderBarChart();
  renderTimeline();
  renderTable();
}

function updateOverviewStats() {
  const total = allCookiesData.length;
  document.getElementById('overview-total').textContent = total;

  const uniqueDomains = new Set(allCookiesData.map(c => c.domain)).size;
  document.getElementById('overview-domains').textContent = uniqueDomains;

  const trackers = allCookiesData.filter(c =>
    c.classification && (c.classification.category === 'advertising' || c.classification.category === 'analytics')
  ).length;
  document.getElementById('overview-trackers').textContent = trackers;

  const score = calculatePrivacyScore();
  document.getElementById('overview-score').textContent = score;
}

function calculatePrivacyScore() {
  if (allCookiesData.length === 0) return '--';

  const categoryCounts = allCookiesData.reduce((acc, c) => {
    const category = c.classification?.category || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const total = allCookiesData.length;
  const score = 100 -
    ((categoryCounts.advertising || 0) / total * 40) -
    ((categoryCounts.social || 0) / total * 30) -
    ((categoryCounts.analytics || 0) / total * 20) -
    ((categoryCounts.functional || 0) / total * 5);

  return Math.max(0, Math.round(score));
}

// ============================================================================
// PIE CHART
// ============================================================================

function renderPieChart() {
  const categoryCounts = allCookiesData.reduce((acc, c) => {
    const category = c.classification?.category || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count
  }));

  if (data.length === 0) {
    document.getElementById('pie-chart').innerHTML = '<p style="text-align:center;color:#999;">No data yet</p>';
    return;
  }

  const width = 400;
  const height = 300;
  const radius = Math.min(width, height) / 2 - 40;

  const color = d3.scaleOrdinal()
    .domain(['essential', 'functional', 'analytics', 'advertising', 'social', 'unknown'])
    .range(['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6f42c1', '#6c757d']);

  d3.select('#pie-chart').selectAll('*').remove();

  const svg = d3.select('#pie-chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const pie = d3.pie()
    .value(d => d.count)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius);

  const arcs = svg.selectAll('arc')
    .data(pie(data))
    .enter()
    .append('g')
    .attr('class', 'arc');

  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.category))
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  arcs.append('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', 'white')
    .attr('font-weight', 'bold')
    .text(d => d.data.count);

  const legend = svg.append('g')
    .attr('transform', `translate(${radius + 20}, ${-radius})`);

  data.forEach((d, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 25})`);

    legendRow.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', color(d.category));

    legendRow.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .attr('font-size', '12px')
      .text(`${d.category} (${d.count})`);
  });
}

// ============================================================================
// BAR CHART
// ============================================================================

function renderBarChart() {
  const domainCounts = allCookiesData.reduce((acc, cookie) => {
    acc[cookie.domain] = (acc[cookie.domain] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (data.length === 0) {
    document.getElementById('bar-chart').innerHTML = '<p style="text-align:center;color:#999;">No data yet</p>';
    return;
  }

  const margin = { top: 20, right: 20, bottom: 100, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  d3.select('#bar-chart').selectAll('*').remove();

  const svg = d3.select('#bar-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .range([0, width])
    .domain(data.map(d => d.domain))
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([height, 0]);

  svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.domain))
    .attr('y', d => y(d.count))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.count))
    .attr('fill', '#667eea');

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')
    .style('font-size', '10px');

  svg.append('g')
    .call(d3.axisLeft(y));
}

// ============================================================================
// TIMELINE
// ============================================================================

function renderTimeline() {
  const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));

  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  allCookiesData.forEach(cookie => {
    const cookieTime = cookie.timestamp || now;
    if (cookieTime > oneDayAgo) {
      const hour = new Date(cookieTime).getHours();
      hourlyData[hour].count++;
    }
  });

  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = 1000 - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  d3.select('#timeline-chart').selectAll('*').remove();

  const svg = d3.select('#timeline-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, 23])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(hourlyData, d => d.count) || 10])
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(d.hour))
    .y(d => y(d.count))
    .curve(d3.curveMonotoneX);

  svg.append('path')
    .datum(hourlyData)
    .attr('fill', 'none')
    .attr('stroke', '#667eea')
    .attr('stroke-width', 2)
    .attr('d', line);

  svg.selectAll('circle')
    .data(hourlyData)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.hour))
    .attr('cy', d => y(d.count))
    .attr('r', 4)
    .attr('fill', '#764ba2');

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(24));

  svg.append('g')
    .call(d3.axisLeft(y));
}

// ============================================================================
// TABLE
// ============================================================================

function renderTable(searchTerm = '', categoryFilter = '') {
  const filteredData = allCookiesData
    .filter(item => {
      const matchesSearch = !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.domain.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !categoryFilter ||
        item.classification?.category === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .slice(0, 100);

  d3.select('#cookie-table').selectAll('*').remove();

  const table = d3.select('#cookie-table');
  const tableEl = table.append('table');
  const thead = tableEl.append('thead');
  const tbody = tableEl.append('tbody');

  thead.append('tr')
    .selectAll('th')
    .data(['Name', 'Domain', 'Category', 'Confidence', 'Secure', 'Expires'])
    .enter()
    .append('th')
    .text(d => d);

  const rows = tbody.selectAll('tr')
    .data(filteredData)
    .enter()
    .append('tr');

  rows.append('td').text(d => d.name);
  rows.append('td').attr('class', 'domain-cell').text(d => d.domain);
  rows.append('td').html(d =>
    `<span class="category-badge ${d.classification?.category || 'unknown'}">
      ${d.classification?.category || 'unknown'}
    </span>`
  );
  rows.append('td').html(d =>
    `<span class="confidence">${Math.round((d.classification?.confidence || 0) * 100)}%</span>`
  );
  rows.append('td').text(d => d.secure ? 'Yes' : 'No');
  rows.append('td').text(d => {
    if (!d.expirationDate) return 'Session';
    const date = new Date(d.expirationDate * 1000);
    return date.toLocaleDateString();
  });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    const searchTerm = e.target.value;
    const categoryFilter = document.getElementById('category-filter').value;
    renderTable(searchTerm, categoryFilter);
  });

  document.getElementById('category-filter').addEventListener('change', (e) => {
    const categoryFilter = e.target.value;
    const searchTerm = document.getElementById('search-input').value;
    renderTable(searchTerm, categoryFilter);
  });
}

// ============================================================================
// INITIALIZE
// ============================================================================

// Wait for D3 to load, then initialize
if (typeof d3 !== 'undefined') {
  init();
} else {
  window.addEventListener('load', init);
}

console.log('✓ Dashboard script loaded');
