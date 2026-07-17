// Frontend JavaScript - Integration with Google Apps Script
// Replace YOUR_DEPLOYMENT_ID with your actual Google Apps Script deployment ID

const SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercopy';

// API Helper function
async function callBackend(action, params = {}) {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action, params })
    });
    return await response.json();
  } catch (error) {
    console.error('Backend error:', error);
    return { error: error.message };
  }
}

// Alternative: Using google.script.run (when deployed as web app)
function callBackendGAS(action, params = {}) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .processRequest(action, params);
  });
}

// ============================================================================
// DASHBOARD FUNCTIONS
// ============================================================================

async function loadDashboardStats() {
  showLoading(true, 'Loading dashboard statistics...');
  try {
    const stats = await callBackendGAS('getDashboardStats');
    
    document.getElementById('statTotal').textContent = stats.total || 0;
    document.getElementById('statForRouting').textContent = stats.forRouting || 0;
    document.getElementById('statOnProcess').textContent = stats.onProcess || 0;
    document.getElementById('statCompleted').textContent = stats.completed || 0;
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showAlert('error', 'Failed to load dashboard statistics');
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// RECORDS TABLE FUNCTIONS
// ============================================================================

async function loadRecordsTable() {
  showLoading(true, 'Loading records...');
  try {
    const records = await callBackendGAS('getRecords');
    displayRecordsTable(records);
  } catch (error) {
    console.error('Error loading records:', error);
    showAlert('error', 'Failed to load records');
  } finally {
    showLoading(false);
  }
}

function displayRecordsTable(records) {
  const tableBody = document.getElementById('recordsTableBody');
  if (!tableBody) return;
  
  if (!records || records.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-muted py-4">
          <div class="empty-state">
            <i class="fa-solid fa-inbox"></i>
            <p>No records found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = records.map(record => `
    <tr>
      <td>${record.ID || ''}</td>
      <td>${formatDate(record['Date Created'])}</td>
      <td class="subject-cell">${record.Subject || ''}</td>
      <td><span class="status-badge ${getStatusClass(record.Status)}">${record.Status || 'Pending'}</span></td>
      <td>${record['For Routing'] || 'N'}</td>
      <td>${record['On Process'] || 'N'}</td>
      <td>${record.Completed || 'N'}</td>
      <td class="remarks-cell">${record.Remarks || ''}</td>
      <td>${record.Drafter || ''}</td>
      <td>${formatDate(record['Last Updated'])}</td>
      <td class="action-stack">
        <button class="btn btn-sm btn-outline-primary" onclick="editRecord(${record.ID})">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteRecordConfirm(${record.ID})">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function getStatusClass(status) {
  const classMap = {
    'Pending': 'status-pending',
    'For Routing': 'status-for-routing',
    'On Process': 'status-on-process',
    'Forwarded': 'status-forwarded',
    'Returned': 'status-returned',
    'Completed': 'status-completed'
  };
  return classMap[status] || 'status-default';
}

// ============================================================================
// DATA ENTRY FUNCTIONS
// ============================================================================

async function submitNewRecord(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  const formData = new FormData(form);
  const recordData = {
    subject: formData.get('subject'),
    status: formData.get('status') || 'Pending',
    remarks: formData.get('remarks'),
    drafter: formData.get('drafter')
  };
  
  // Validate required fields
  if (!recordData.subject.trim()) {
    showAlert('warning', 'Please enter a subject');
    return;
  }
  
  showLoading(true, 'Adding record...');
  try {
    const result = await callBackendGAS('addRecord', recordData);
    
    if (result.success) {
      showAlert('success', 'Record added successfully!');
      form.reset();
      // Reload records table if visible
      if (document.getElementById('view-records')?.classList.contains('active')) {
        loadRecordsTable();
      }
      loadDashboardStats();
    } else {
      showAlert('error', result.error || 'Failed to add record');
    }
  } catch (error) {
    console.error('Error adding record:', error);
    showAlert('error', 'An error occurred while adding the record');
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// RECORD MANAGEMENT FUNCTIONS
// ============================================================================

async function editRecord(recordId) {
  // Load record data and open edit modal
  const records = await callBackendGAS('getRecords');
  const record = records.find(r => r.ID === recordId);
  
  if (!record) {
    showAlert('error', 'Record not found');
    return;
  }
  
  // Populate edit form with record data
  const editForm = document.getElementById('editRecordForm');
  if (editForm) {
    editForm.querySelector('[name="subject"]').value = record.Subject || '';
    editForm.querySelector('[name="status"]').value = record.Status || 'Pending';
    editForm.querySelector('[name="remarks"]').value = record.Remarks || '';
    editForm.querySelector('[name="drafter"]').value = record.Drafter || '';
    editForm.dataset.recordId = recordId;
  }
  
  // Show edit modal (if using Bootstrap modal)
  const modal = new bootstrap.Modal(document.getElementById('editRecordModal'));
  modal.show();
}

async function saveEditedRecord() {
  const editForm = document.getElementById('editRecordForm');
  if (!editForm) return;
  
  const recordId = parseInt(editForm.dataset.recordId);
  const updates = {
    Subject: editForm.querySelector('[name="subject"]').value,
    Status: editForm.querySelector('[name="status"]').value,
    Remarks: editForm.querySelector('[name="remarks"]').value,
    Drafter: editForm.querySelector('[name="drafter"]').value
  };
  
  showLoading(true, 'Updating record...');
  try {
    const result = await callBackendGAS('updateRecord', { id: recordId, updates });
    
    if (result.success) {
      showAlert('success', 'Record updated successfully!');
      bootstrap.Modal.getInstance(document.getElementById('editRecordModal')).hide();
      loadRecordsTable();
      loadDashboardStats();
    } else {
      showAlert('error', result.error || 'Failed to update record');
    }
  } catch (error) {
    console.error('Error updating record:', error);
    showAlert('error', 'An error occurred while updating the record');
  } finally {
    showLoading(false);
  }
}

function deleteRecordConfirm(recordId) {
  if (confirm('Are you sure you want to delete this record?')) {
    deleteRecord(recordId);
  }
}

async function deleteRecord(recordId) {
  showLoading(true, 'Deleting record...');
  try {
    const result = await callBackendGAS('deleteRecord', { id: recordId });
    
    if (result.success) {
      showAlert('success', 'Record deleted successfully!');
      loadRecordsTable();
      loadDashboardStats();
    } else {
      showAlert('error', result.error || 'Failed to delete record');
    }
  } catch (error) {
    console.error('Error deleting record:', error);
    showAlert('error', 'An error occurred while deleting the record');
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// SEARCH & FILTER FUNCTIONS
// ============================================================================

async function searchRecords(query) {
  if (!query.trim()) {
    loadRecordsTable();
    return;
  }
  
  showLoading(true, 'Searching records...');
  try {
    const results = await callBackendGAS('searchRecords', { query });
    displayRecordsTable(results);
  } catch (error) {
    console.error('Error searching records:', error);
    showAlert('error', 'Failed to search records');
  } finally {
    showLoading(false);
  }
}

async function filterByStatus(status) {
  showLoading(true, 'Filtering records...');
  try {
    const results = status ? 
      await callBackendGAS('getRecordsByStatus', { status }) : 
      await callBackendGAS('getRecords');
    displayRecordsTable(results);
  } catch (error) {
    console.error('Error filtering records:', error);
    showAlert('error', 'Failed to filter records');
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

async function exportRecordsCSV() {
  showLoading(true, 'Exporting records...');
  try {
    const csv = await callBackendGAS('exportRecordsCSV');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    showAlert('success', 'Records exported successfully!');
  } catch (error) {
    console.error('Error exporting records:', error);
    showAlert('error', 'Failed to export records');
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// UI UTILITY FUNCTIONS
// ============================================================================

function showLoading(show, message = 'Please wait...') {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  
  if (show) {
    document.getElementById('loadingText').textContent = message;
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
  }
}

function showAlert(type, message) {
  // Create alert element
  const alertId = 'alert-' + Date.now();
  const alertClass = {
    'success': 'alert-success',
    'error': 'alert-danger',
    'warning': 'alert-warning',
    'info': 'alert-info'
  }[type] || 'alert-info';
  
  const alertHtml = `
    <div id="${alertId}" class="alert ${alertClass} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', alertHtml);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) alert.remove();
  }, 5000);
}

function showView(viewName) {
  // Hide all sections
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  const section = document.getElementById(`view-${viewName}`);
  if (section) {
    section.classList.add('active');
    document.getElementById('topbarTitle').textContent = 
      viewName.charAt(0).toUpperCase() + viewName.slice(1);
    
    // Load data based on view
    if (viewName === 'dashboard') loadDashboardStats();
    if (viewName === 'records') loadRecordsTable();
  }
  
  // Update active nav button
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  
  closeMobileSidebar();
}

function toggleSidebar() {
  document.body.classList.toggle('sidebar-mini');
}

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-mobile-open');
  document.querySelector('.mobile-backdrop').style.display = 'none';
}

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  // Load initial dashboard stats
  loadDashboardStats();
  
  // Setup search functionality
  const searchInput = document.getElementById('recordsSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchRecords(e.target.value);
    });
  }
  
  // Setup filter functionality
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      filterByStatus(e.target.value);
    });
  }
});
