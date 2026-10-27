// Initial State Data
const defaultReports = [
  {
    id: 'QB-2026-0012',
    date: 'Oct 18, 2026',
    time: '8:00 PM',
    location: 'Near the barangay hall',
    vehicle: 'Motorcycle',
    plate: 'XYZ 1234',
    status: 'Pending Review',
    description: 'Loud modified pipe motorcycle speeding past the main hall.'
  },
  {
    id: 'QB-2026-0011',
    date: 'Oct 17, 2026',
    time: '9:30 PM',
    location: 'Purok 3',
    vehicle: 'Motorcycle',
    plate: 'ABC 889',
    status: 'Under Verification',
    description: 'Repetitive revving of open muffler near residential houses.'
  },
  {
    id: 'QB-2026-0010',
    date: 'Oct 16, 2026',
    time: '7:15 PM',
    location: 'National Highway',
    vehicle: 'Motorcycle',
    plate: 'N/A',
    status: 'Action Taken',
    description: 'Group of riders with illegal loud pipes racing along highway.'
  },
  {
    id: 'QB-2026-0009',
    date: 'Oct 15, 2026',
    time: '5:45 PM',
    location: 'Purok 1',
    vehicle: 'Motorcycle',
    plate: '123-DEF',
    status: 'Pending Review',
    description: 'Excessive noise during late afternoon.'
  },
  {
    id: 'QB-2026-0008',
    date: 'Oct 14, 2026',
    time: '6:20 PM',
    location: 'Purok 4',
    vehicle: 'Motorcycle',
    plate: 'N/A',
    status: 'Pending Review',
    description: 'Loud exhaust noise near the elementary school zone.'
  }
];
const reportsStorageKey = 'quietBarangayReports';
let reports = loadReports();
let activeReportId = null;
let submittedReportId = null;
let html5QrCodeScanner = null;

function loadReports() {
  try {
    const savedReports = localStorage.getItem(reportsStorageKey);
    if (!savedReports) return defaultReports;
    const parsedReports = JSON.parse(savedReports);
    if (!Array.isArray(parsedReports)) throw new Error('Saved reports are not a list.');
    return parsedReports;
  } catch (error) {
    console.error('Unable to load saved reports:', error);
    return defaultReports;
  }
}

function persistReports() {
  try {
    localStorage.setItem(reportsStorageKey, JSON.stringify(reports));
    return true;
  } catch (error) {
    console.error('Unable to save reports:', error);
    alert('Your changes could not be saved in this browser. Please check your browser storage settings and try again.');
    return false;
  }
}

// Load initial icons & setup on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setDefaultDate();
  renderReportsTable();
  updateDashboardStats();
  generateWebsiteQRCode();
});

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
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// View Navigation Logic
function showView(viewId) {
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
function handleFormSubmit(e) {
  e.preventDefault();

  const location = document.getElementById('form-location').value;
  const rawDate = document.getElementById('form-date').value;
  const rawTime = document.getElementById('form-time').value;
  const vehicle = document.querySelector('input[name="vehicle_type"]:checked').value;
  const plate = document.getElementById('form-plate').value || 'N/A';
  const description = document.getElementById('form-description').value;

  const dateObj = new Date(rawDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  let newId;
  do {
    newId = `QB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (reports.some(report => report.id === newId));

  const newReport = {
    id: newId,
    date: formattedDate,
    time: rawTime,
    location: location,
    vehicle: vehicle,
    plate: plate,
    status: 'Pending Review',
    description: description
  };

  reports.unshift(newReport);
  if (!persistReports()) {
    reports.shift();
    return;
  }
  submittedReportId = newId;

  document.getElementById('ref-number-display').innerText = newId;
  document.getElementById('ref-location-display').innerText = location;
  document.getElementById('ref-date-display').innerText = formattedDate;
  document.getElementById('ref-time-display').innerText = rawTime;
  document.getElementById('ref-vehicle-display').innerText = vehicle;

  document.getElementById('incident-form').reset();
  setDefaultDate();

  renderReportsTable();
  updateDashboardStats();
  showView('success-view');
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
        <td colspan="6" class="text-center py-6 text-gray-400 font-medium text-xs">No reports found for this status.</td>
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

    tr.innerHTML = `
      <td class="py-3.5 px-5 font-mono font-bold text-brand">${escapeHtml(report.id)}</td>
      <td class="py-3.5 px-5 font-medium text-gray-700">${escapeHtml(report.date)} <span class="text-gray-400 text-[10px]">${escapeHtml(report.time)}</span></td>
      <td class="py-3.5 px-5 text-gray-800 font-medium">${escapeHtml(report.location)}</td>
      <td class="py-3.5 px-5 text-gray-600">${escapeHtml(report.vehicle)}</td>
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

function viewSubmittedReport() {
  showView('dashboard-view');
  const statusFilter = document.getElementById('status-filter');
  statusFilter.value = 'ALL';
  renderReportsTable();
  const submittedRow = document.querySelector(`[data-report-id="${submittedReportId}"]`);
  if (submittedRow) {
    submittedRow.classList.add('bg-emerald-50');
    submittedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Update Dashboard Metrics Counters
function updateDashboardStats() {
  document.getElementById('stat-total').innerText = reports.length;
  document.getElementById('stat-pending').innerText = reports.filter(r => r.status === 'Pending Review').length;
  document.getElementById('stat-verification').innerText = reports.filter(r => r.status === 'Under Verification').length;
  document.getElementById('stat-action').innerText = reports.filter(r => r.status === 'Action Taken').length;
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
  document.getElementById('modal-datetime').innerText = `${report.date} ${report.time}`;
  document.getElementById('modal-vehicle').innerText = report.vehicle;
  document.getElementById('modal-location').innerText = report.location;
  document.getElementById('modal-plate').innerText = report.plate;
  document.getElementById('modal-desc').innerText = report.description;
  document.getElementById('modal-status-select').value = report.status;

  openModal('details-modal');
}

function saveStatusUpdate() {
  if (!activeReportId) return;

  const newStatus = document.getElementById('modal-status-select').value;
  const reportIndex = reports.findIndex(r => r.id === activeReportId);

  if (reportIndex !== -1) {
    const previousStatus = reports[reportIndex].status;
    reports[reportIndex].status = newStatus;
    if (!persistReports()) {
      reports[reportIndex].status = previousStatus;
      return;
    }
    renderReportsTable();
    updateDashboardStats();
    closeModal('details-modal');
  }
}

// Auth Simulation Handlers
function handleAuthLogin(e) {
  e.preventDefault();
  alert('Login Successful!');
  showView('dashboard-view');
}

function handleAuthSignup(e) {
  e.preventDefault();
  alert('Account Created Successfully! Redirecting to login...');
  showView('login-view');
}
