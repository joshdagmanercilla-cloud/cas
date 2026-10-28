let reports = [];
let activeReportId = null;
let submittedReportId = null;
let html5QrCodeScanner = null;
let officialAuthenticated = false;

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function setOfficialNavigation() {
  ['nav-login', 'nav-official-login'].forEach(id => {
    const loginButton = document.getElementById(id);
    if (loginButton) loginButton.classList.toggle('hidden', officialAuthenticated);
  });
}

// Load initial icons & setup on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setDefaultDate();
  generateWebsiteQRCode();
  initializeWebsite();
});

async function initializeWebsite() {
  try {
    const session = await apiRequest('/api/session');
    officialAuthenticated = session.authenticated;
    setOfficialNavigation();
    if (officialAuthenticated) await refreshReports();
  } catch (error) {
    console.error('Unable to initialize the website:', error);
    alert(`Unable to connect to the website server. ${error.message}`);
  }
}

async function refreshReports() {
  reports = await apiRequest('/api/reports');
  renderReportsTable();
  updateDashboardStats();
  renderReportAnalytics();
}

// Generate Dynamic QR Code for current website URL
function generateWebsiteQRCode() {
  const qrContainer = document.getElementById('website-qr-code');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    const currentUrl = window.location.href;
    new QRCode(qrContainer, {
      text: currentUrl,
      width: 140,
      height: 140,
      colorDark: "#064e3b",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}

// Download QR Code Image
function downloadQRCode() {
  const img = document.querySelector('#website-qr-code img');
  if (img) {
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'Quiet-Barangay-Website-QR.png';
    link.click();
  } else {
    alert('QR code image is generating, please try again.');
  }
}

// Camera QR Code Scanner Start Function
function startQRScanner() {
  const qrReaderElem = document.getElementById("qr-reader");
  qrReaderElem.innerHTML = '';

  html5QrCodeScanner = new Html5Qrcode("qr-reader");
  html5QrCodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    (decodedText) => {
      // Success Callback
      alert(`QR Code Scanned Successfully!\nOpening: ${decodedText}`);
      closeQRModal();
      window.location.href = decodedText;
    },
    (errorMessage) => {
      // Ignore scanning frames error
    }
  ).catch(err => {
    qrReaderElem.innerHTML = `<span class="text-red-400 p-4">Camera access denied or unequipped. (${err})</span>`;
  });
}

function closeQRModal() {
  if (html5QrCodeScanner) {
    html5QrCodeScanner.stop().then(() => {
      html5QrCodeScanner.clear();
    }).catch(() => {});
  }
  closeModal('qr-modal');
}

function setDefaultDate() {
  const dateInput = document.getElementById('form-date');
  if (dateInput) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dateInput.value = today;
  }
  const dateBadge = document.getElementById('current-date-badge');
  if (dateBadge) dateBadge.innerText = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// View Navigation Logic
function showView(viewId) {
  if (viewId === 'dashboard-view' && !officialAuthenticated) {
    alert('Please log in with an official account to view reports.');
    viewId = 'login-view';
  }

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');

  const navHome = document.getElementById('nav-home');
  const navReport = document.getElementById('nav-report');
  const navDashboard = document.getElementById('nav-dashboard');

  if (navHome && navReport && navDashboard) {
    navHome.className = `hover:text-emerald-200 transition-colors py-1 border-b-2 ${viewId === 'home-view' ? 'border-white font-bold' : 'border-transparent'}`;
    navReport.className = `hover:text-emerald-200 transition-colors py-1 border-b-2 ${viewId === 'report-view' ? 'border-white font-bold' : 'border-transparent'}`;
    navDashboard.className = `hover:text-emerald-200 transition-colors py-1 border-b-2 ${viewId === 'dashboard-view' ? 'border-white font-bold' : 'border-transparent'}`;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('hidden');
}

// Submit New Incident Report Form
async function handleFormSubmit(e) {
  e.preventDefault();

  const location = document.getElementById('form-location').value.trim();
  const rawDate = document.getElementById('form-date').value;
  const rawTime = document.getElementById('form-time').value;
  const vehicle = document.querySelector('input[name="vehicle_type"]:checked').value;
  const plate = document.getElementById('form-plate').value.trim().toUpperCase() || 'N/A';
  const description = document.getElementById('form-description').value.trim();

  try {
    const report = await apiRequest('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ location, date: rawDate, time: rawTime, vehicle, plate, description })
    });
    submittedReportId = report.id;

    document.getElementById('ref-number-display').innerText = report.id;
    document.getElementById('ref-location-display').innerText = report.location;
    document.getElementById('ref-date-display').innerText = formatReportDate(report);
    document.getElementById('ref-time-display').innerText = report.time;
    document.getElementById('ref-vehicle-display').innerText = report.vehicle;

    document.getElementById('incident-form').reset();
    setDefaultDate();
    if (officialAuthenticated) {
      try {
        await refreshReports();
      } catch (error) {
        console.error('Report was submitted, but the dashboard could not refresh:', error);
        alert(`Your report was submitted, but the dashboard could not refresh. ${error.message}`);
      }
    }
    showView('success-view');
  } catch (error) {
    console.error('Unable to submit report:', error);
    alert(`Your report could not be submitted. ${error.message}`);
  }
}

// Render Table Row Elements
function renderReportsTable() {
  const tbody = document.getElementById('reports-table-body');
  const filterValue = document.getElementById('status-filter').value;
  
  tbody.innerHTML = '';

  const filteredReports = reports.filter(r => filterValue === 'ALL' || r.status === filterValue);

  if (filteredReports.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-6 text-gray-400 font-medium text-xs">No reports found for this status.</td>
      </tr>
    `;
    return;
  }

  filteredReports.forEach(report => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50/80 transition-colors';
    tr.dataset.reportId = report.id;

    let badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
    if (report.status === 'Under Verification') badgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
    if (report.status === 'Action Taken') badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';

    const plateKey = normalizePlateNumber(report.plate);
    const plateCount = plateKey ? getPlateReportHistory(plateKey).length : 0;
    const plateCell = plateKey
      ? `
        <td class="py-3.5 px-5">
          <button type="button" data-plate-history="${escapeHtml(plateKey)}" class="text-left font-mono font-bold text-brand hover:underline">${escapeHtml(report.plate)}</button>
          <span class="block mt-1 text-[10px] ${plateCount > 1 ? 'font-bold text-amber-700' : 'text-gray-400'}">
            ${plateCount} ${plateCount === 1 ? 'report' : 'reports'}${plateCount > 1 ? ' · Repeat' : ''}
          </span>
        </td>
      `
      : '<td class="py-3.5 px-5 text-gray-400">N/A</td>';

    tr.innerHTML = `
      <td class="py-3.5 px-5 font-mono font-bold text-brand">${escapeHtml(report.id)}</td>
      <td class="py-3.5 px-5 font-medium text-gray-700">${escapeHtml(formatReportDate(report))} <span class="text-gray-400 text-[10px]">${escapeHtml(report.time)}</span></td>
      <td class="py-3.5 px-5 text-gray-800 font-medium">${escapeHtml(report.location)}</td>
      <td class="py-3.5 px-5 text-gray-600">${escapeHtml(report.vehicle)}</td>
      ${plateCell}
      <td class="py-3.5 px-5">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
          ${escapeHtml(report.status)}
        </span>
      </td>
      <td class="py-3.5 px-5 text-right">
        <button onclick="openDetailsModal('${report.id}')" class="text-brand hover:text-brand-hover font-bold hover:underline">
          View
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-plate-history]').forEach(button => {
    button.addEventListener('click', () => openPlateHistory(button.dataset.plateHistory));
  });

  lucide.createIcons();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

async function viewSubmittedReport() {
  if (!submittedReportId) return;
  try {
    const report = await apiRequest(`/api/reports/${encodeURIComponent(submittedReportId)}/status`);
    alert(`Report ${report.id}\nStatus: ${report.status}`);
  } catch (error) {
    console.error('Unable to check report status:', error);
    alert(`Unable to check report status. ${error.message}`);
  }
}

// Update Dashboard Metrics Counters
function updateDashboardStats() {
  document.getElementById('stat-total').innerText = reports.length;
  document.getElementById('stat-pending').innerText = reports.filter(r => r.status === 'Pending Review').length;
  document.getElementById('stat-verification').innerText = reports.filter(r => r.status === 'Under Verification').length;
  document.getElementById('stat-action').innerText = reports.filter(r => r.status === 'Action Taken').length;
}

function getReportDate(report) {
  const rawDate = report.incidentDate || report.date;
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) return date;
    return null;
  }

  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatReportDate(report) {
  const date = getReportDate(report);
  return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date';
}

function normalizePlateNumber(plate) {
  const plateKey = String(plate || '').trim().toUpperCase().replace(/[\s-]/g, '');
  return plateKey && plateKey !== 'NA' && plateKey !== 'N/A' ? plateKey : '';
}

function getPlateReportHistory(plate) {
  const plateKey = normalizePlateNumber(plate);
  return plateKey ? reports.filter(report => normalizePlateNumber(report.plate) === plateKey) : [];
}

function renderReportAnalytics() {
  const yearSelect = document.getElementById('analytics-year');
  if (!yearSelect) return;

  const reportYears = reports
    .map(getReportDate)
    .filter(Boolean)
    .map(date => date.getFullYear());
  const years = [...new Set([...reportYears, new Date().getFullYear()])].sort((a, b) => b - a);
  const previouslySelectedYear = Number(yearSelect.value);
  const selectedYear = years.includes(previouslySelectedYear) ? previouslySelectedYear : new Date().getFullYear();

  yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
  yearSelect.value = String(selectedYear);

  const monthlyCounts = Array(12).fill(0);
  const countsByMonth = new Map();
  const plateCounts = new Map();

  reports.forEach(report => {
    const date = getReportDate(report);
    if (date) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${month}`;
      countsByMonth.set(monthKey, (countsByMonth.get(monthKey) || 0) + 1);
      if (year === selectedYear) monthlyCounts[month] += 1;
    }

    const plate = String(report.plate || '').trim();
    const plateKey = normalizePlateNumber(plate);
    if (plateKey) {
      const existing = plateCounts.get(plateKey);
      if (existing) existing.count += 1;
      else plateCounts.set(plateKey, { key: plateKey, label: plate.toUpperCase(), count: 1 });
    }
  });

  const yearTotal = monthlyCounts.reduce((total, count) => total + count, 0);
  const busiestMonthCount = Math.max(...monthlyCounts);
  const busiestMonthIndex = monthlyCounts.indexOf(busiestMonthCount);
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
  document.getElementById('analytics-year-total').innerText = yearTotal;
  document.getElementById('analytics-busiest-month').innerText = busiestMonthCount
    ? `${monthFormatter.format(new Date(selectedYear, busiestMonthIndex, 1))} (${busiestMonthCount})`
    : 'No reports';
  document.getElementById('analytics-monthly-average').innerText = (yearTotal / 12).toFixed(1);

  const maxMonthlyCount = Math.max(1, ...monthlyCounts);
  document.getElementById('monthly-report-body').innerHTML = monthlyCounts.map((count, month) => {
    const previousDate = new Date(selectedYear, month - 1, 1);
    const previousCount = countsByMonth.get(`${previousDate.getFullYear()}-${previousDate.getMonth()}`) || 0;
    let change = '—';
    let changeClass = 'text-gray-400';
    if (previousCount === 0 && count > 0) {
      change = 'New';
      changeClass = 'text-sky-700';
    } else if (previousCount > 0) {
      const percentage = ((count - previousCount) / previousCount) * 100;
      change = `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
      changeClass = percentage > 0 ? 'text-red-600' : percentage < 0 ? 'text-emerald-700' : 'text-gray-500';
    }

    const monthName = monthFormatter.format(new Date(selectedYear, month, 1));
    const barWidth = (count / maxMonthlyCount) * 100;
    return `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-5 text-xs font-medium text-gray-700">${monthName}</td>
        <td class="py-3 px-5">
          <div class="flex items-center gap-2">
            <span class="w-6 text-xs font-bold text-gray-800">${count}</span>
            <div class="h-1.5 flex-1 max-w-24 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-emerald-600 rounded-full" style="width: ${barWidth}%"></div>
            </div>
          </div>
        </td>
        <td class="py-3 px-5 text-right text-xs font-bold ${changeClass}">${change}</td>
      </tr>
    `;
  }).join('');

  const rankedPlates = [...plateCounts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const plateBody = document.getElementById('plate-report-body');
  plateBody.innerHTML = rankedPlates.length
    ? rankedPlates.map(({ key, label, count }) => `
        <tr class="border-b border-gray-50 last:border-0">
          <td class="py-3 px-5 text-xs font-mono font-bold text-gray-800">
            <button type="button" data-plate-history="${escapeHtml(key)}" class="text-left hover:text-brand hover:underline">${escapeHtml(label)}</button>
          </td>
          <td class="py-3 px-5 text-right text-xs font-bold text-gray-800">${count}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" class="py-6 px-5 text-center text-xs text-gray-400">No identifiable plate numbers in reports.</td></tr>';

  plateBody.querySelectorAll('[data-plate-history]').forEach(button => {
    button.addEventListener('click', () => openPlateHistory(button.dataset.plateHistory));
  });
}

function renderPlateHistory(plateKey) {
  const history = getPlateReportHistory(plateKey);
  document.getElementById('plate-history-number').innerText = history[0]?.plate || plateKey;
  document.getElementById('plate-history-count').innerText = history.length;
  document.getElementById('plate-history-body').innerHTML = history.length
    ? history.map(report => `
        <tr class="border-b border-gray-100 last:border-0">
          <td class="py-3 px-4 font-mono font-bold text-brand">${escapeHtml(report.id)}</td>
          <td class="py-3 px-4">${escapeHtml(formatReportDate(report))} <span class="text-gray-400">${escapeHtml(report.time)}</span></td>
          <td class="py-3 px-4">${escapeHtml(report.location)}</td>
          <td class="py-3 px-4">${escapeHtml(report.status)}</td>
          <td class="py-3 px-4 text-right">
            <button type="button" data-history-report="${escapeHtml(report.id)}" class="font-bold text-brand hover:underline">View</button>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" class="py-6 px-4 text-center text-xs text-gray-400">No reporting history found for this plate.</td></tr>';

  document.querySelectorAll('[data-history-report]').forEach(button => {
    button.addEventListener('click', () => {
      closeModal('plate-history-modal');
      openDetailsModal(button.dataset.historyReport);
    });
  });
}

function openPlateHistory(plateKey) {
  if (!officialAuthenticated || !normalizePlateNumber(plateKey)) return;
  renderPlateHistory(plateKey);
  openModal('plate-history-modal');
}

function openPlateHistoryForActiveReport() {
  const report = reports.find(item => item.id === activeReportId);
  if (report) openPlateHistory(report.plate);
}

function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// Open Details Modal
function openDetailsModal(reportId) {
  const report = reports.find(r => r.id === reportId);
  if (!report) return;

  activeReportId = reportId;

  document.getElementById('modal-ref-no').innerText = report.id;
  document.getElementById('modal-datetime').innerText = `${formatReportDate(report)} ${report.time}`;
  document.getElementById('modal-vehicle').innerText = report.vehicle;
  document.getElementById('modal-location').innerText = report.location;
  document.getElementById('modal-plate').innerText = report.plate;
  document.getElementById('modal-desc').innerText = report.description;
  document.getElementById('modal-status-select').value = report.status;
  const plateHistory = getPlateReportHistory(report.plate);
  document.getElementById('modal-plate-report-count').innerText = plateHistory.length
    ? `${plateHistory.length} ${plateHistory.length === 1 ? 'report' : 'reports'}`
    : 'No plate history';
  document.getElementById('modal-plate-history-button').classList.toggle('hidden', plateHistory.length === 0);

  openModal('details-modal');
}

async function saveStatusUpdate() {
  if (!activeReportId) return;

  const newStatus = document.getElementById('modal-status-select').value;
  try {
    await apiRequest(`/api/reports/${encodeURIComponent(activeReportId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    await refreshReports();
    closeModal('details-modal');
  } catch (error) {
    console.error('Unable to update report status:', error);
    alert(`The report status could not be updated. ${error.message}`);
  }
}

async function handleAuthLogin(e) {
  e.preventDefault();
  const errorMessage = document.getElementById('login-error');
  errorMessage.classList.add('hidden');
  errorMessage.innerText = '';

  const formData = new FormData(e.currentTarget);
  try {
    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password')
      })
    });
    officialAuthenticated = true;
    setOfficialNavigation();
    await refreshReports();
    e.currentTarget.reset();
    showView('dashboard-view');
  } catch (error) {
    console.error('Officials login failed:', error);
    errorMessage.innerText = error.message;
    errorMessage.classList.remove('hidden');
  }
}

async function logoutOfficial() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    officialAuthenticated = false;
    reports = [];
    setOfficialNavigation();
    showView('home-view');
  } catch (error) {
    console.error('Unable to log out:', error);
    alert(`Unable to log out. ${error.message}`);
  }
}
