// Google Apps Script Backend for PPS-Workflow
// Handles all data operations with Google Sheets

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_ID = "1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs"; // Your Google Sheet ID
const SHEET_NAME = "Sheet1"; // Change if your sheet has a different name

// Column Headers (match your Google Sheet exactly)
const COLUMNS = {
  REF_NO: 0,
  SUBJECT: 1,
  DATE: 2,
  DRAFTER: 3,
  STATUS: 4,
  REMARKS: 5,
  DATE_RECEIVED: 6,
  TARGET_DATE: 7,
  APPROVED_PDF: 8
};

// ============================================================================
// INITIALIZATION & SETUP
// ============================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PPS-Workflow')
    .addItem('Open Web App', 'openWebApp')
    .addSeparator()
    .addItem('Clear Cache', 'clearCache')
    .addToUi();
}

function openWebApp() {
  // Opens the deployed web app
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput('<p>Web App URL: <a href="' + url + '" target="_blank">' + url + '</a></p>'),
    'PPS-Workflow Web App'
  );
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

function processRequest(action, params) {
  try {
    switch(action) {
      case 'getDashboardStats':
        return getDashboardStats();
      case 'getRecords':
        return getRecords();
      case 'addRecord':
        return addRecord(params);
      case 'updateRecord':
        return updateRecord(params);
      case 'deleteRecord':
        return deleteRecord(params);
      case 'searchRecords':
        return searchRecords(params);
      case 'getRecordsByStatus':
        return getRecordsByStatus(params);
      case 'exportRecordsCSV':
        return exportRecordsCSV();
      default:
        return { success: false, error: 'Unknown action: ' + action };
    }
  } catch (error) {
    Logger.log('Error in processRequest: ' + error);
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// DASHBOARD FUNCTIONS
// ============================================================================

function getDashboardStats() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) {
    return {
      total: 0,
      forRouting: 0,
      onProcess: 0,
      completed: 0
    };
  }

  let total = data.length - 1; // Exclude header
  let forRouting = 0;
  let onProcess = 0;
  let completed = 0;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][COLUMNS.STATUS] || '';
    if (status.toLowerCase() === 'for routing') forRouting++;
    if (status.toLowerCase() === 'on process') onProcess++;
    if (status.toLowerCase() === 'completed') completed++;
  }

  return {
    total: total,
    forRouting: forRouting,
    onProcess: onProcess,
    completed: completed
  };
}

// ============================================================================
// RECORD RETRIEVAL FUNCTIONS
// ============================================================================

function getRecords() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const records = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    records.push(formatRecord(data[i], i));
  }

  return records;
}

function formatRecord(row, rowIndex) {
  return {
    ID: rowIndex,
    RefNo: row[COLUMNS.REF_NO] || '',
    Subject: row[COLUMNS.SUBJECT] || '',
    Date: row[COLUMNS.DATE] || '',
    Drafter: row[COLUMNS.DRAFTER] || '',
    Status: row[COLUMNS.STATUS] || 'Pending',
    Remarks: row[COLUMNS.REMARKS] || '',
    DateReceived: row[COLUMNS.DATE_RECEIVED] || '',
    TargetDate: row[COLUMNS.TARGET_DATE] || '',
    ApprovedPDF: row[COLUMNS.APPROVED_PDF] || ''
  };
}

function getRecordsByStatus(params) {
  const status = params.status || '';
  const allRecords = getRecords();
  
  return allRecords.filter(record => 
    record.Status.toLowerCase() === status.toLowerCase()
  );
}

// ============================================================================
// RECORD MANAGEMENT FUNCTIONS
// ============================================================================

function addRecord(params) {
  try {
    const sheet = getSheet();
    const newRow = [
      '', // Ref No - will be auto-generated if needed
      params.subject || '',
      new Date(), // Date
      params.drafter || '',
      params.status || 'Pending',
      params.remarks || '',
      '', // Date Received
      '', // Target Date
      '' // Approved PDF
    ];

    sheet.appendRow(newRow);
    return { success: true, message: 'Record added successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateRecord(params) {
  try {
    const recordId = params.id;
    const updates = params.updates;
    const sheet = getSheet();
    
    // Record ID is actually the row number (1-indexed in sheet)
    const rowNumber = recordId + 1; // Convert from 0-indexed to 1-indexed
    
    if (updates.Subject) sheet.getRange(rowNumber, COLUMNS.SUBJECT + 1).setValue(updates.Subject);
    if (updates.Status) sheet.getRange(rowNumber, COLUMNS.STATUS + 1).setValue(updates.Status);
    if (updates.Remarks) sheet.getRange(rowNumber, COLUMNS.REMARKS + 1).setValue(updates.Remarks);
    if (updates.Drafter) sheet.getRange(rowNumber, COLUMNS.DRAFTER + 1).setValue(updates.Drafter);
    
    return { success: true, message: 'Record updated successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteRecord(params) {
  try {
    const recordId = params.id;
    const sheet = getSheet();
    
    // Record ID is actually the row number
    const rowNumber = recordId + 1; // Convert from 0-indexed to 1-indexed
    
    // Ensure we're not deleting the header row
    if (rowNumber > 1) {
      sheet.deleteRow(rowNumber);
      return { success: true, message: 'Record deleted successfully' };
    }
    
    return { success: false, error: 'Invalid record ID' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// SEARCH & FILTER FUNCTIONS
// ============================================================================

function searchRecords(params) {
  const query = (params.query || '').toLowerCase();
  const allRecords = getRecords();
  
  return allRecords.filter(record => {
    return Object.values(record).some(value => 
      String(value).toLowerCase().includes(query)
    );
  });
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

function exportRecordsCSV() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  let csv = '';
  
  // Add header
  csv += ['Ref No.', 'Subject', 'Date', 'Drafter', 'Status', 'Remarks', 'Date Received', 'Target Date', 'Approved PDF'].join(',') + '\n';
  
  // Add data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i].map(cell => {
      // Escape CSV values
      const value = String(cell).replace(/"/g, '""');
      return '"' + value + '"';
    });
    csv += row.join(',') + '\n';
  }
  
  return csv;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME);
}

function clearCache() {
  CacheService.getScriptCache().removeAll(['records', 'stats']);
  SpreadsheetApp.getUi().alert('Cache cleared successfully');
}

// ============================================================================
// DO NOT DEPLOY - Use as Code.gs in Google Apps Script
// ============================================================================
