// Google Apps Script Backend for PPS Workflow
// Configuration
const SPREADSHEET_ID = ''; // 1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs
const RECORDS_SHEET = 'Records';
const SETTINGS_SHEET = 'Settings';

// Initialize sheets on first run
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create Records sheet if it doesn't exist
  try {
    ss.getSheetByName(RECORDS_SHEET);
  } catch (e) {
    const recordsSheet = ss.insertSheet(RECORDS_SHEET);
    recordsSheet.appendRow([
      'ID', 'Date Created', 'Subject', 'Status', 'For Routing', 'On Process', 'Completed',
      'Remarks', 'Drafter', 'Last Updated', 'QR Code'
    ]);
  }
  
  // Create Settings sheet if it doesn't exist
  try {
    ss.getSheetByName(SETTINGS_SHEET);
  } catch (e) {
    const settingsSheet = ss.insertSheet(SETTINGS_SHEET);
    settingsSheet.appendRow(['Setting', 'Value']);
    settingsSheet.appendRow(['NextID', '1000']);
  }
}

// Get all records
function getRecords() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(RECORDS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  const headers = data[0];
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = data[i][index];
    });
    records.push(record);
  }
  
  return records;
}

// Get dashboard statistics
function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(RECORDS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return {
      total: 0,
      forRouting: 0,
      onProcess: 0,
      completed: 0
    };
  }
  
  let total = data.length - 1;
  let forRouting = 0;
  let onProcess = 0;
  let completed = 0;
  
  for (let i = 1; i < data.length; i++) {
    const status = String(data[i][3]).toLowerCase(); // Status column
    if (status === 'for routing') forRouting++;
    else if (status === 'on process') onProcess++;
    else if (status === 'completed') completed++;
  }
  
  return {
    total: total,
    forRouting: forRouting,
    onProcess: onProcess,
    completed: completed
  };
}

// Add new record
function addRecord(recordData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(RECORDS_SHEET);
    const settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
    
    // Get next ID
    const settingsData = settingsSheet.getDataRange().getValues();
    let nextId = 1000;
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === 'NextID') {
        nextId = parseInt(settingsData[i][1]) + 1;
        settingsSheet.getRange(i + 1, 2).setValue(nextId);
      }
    }
    
    // Add new record
    const newRecord = [
      nextId - 1,
      new Date(),
      recordData.subject || '',
      recordData.status || 'Pending',
      recordData.forRouting || 'N',
      recordData.onProcess || 'N',
      recordData.completed || 'N',
      recordData.remarks || '',
      recordData.drafter || '',
      new Date(),
      recordData.qrCode || ''
    ];
    
    sheet.appendRow(newRecord);
    
    return {
      success: true,
      id: nextId - 1,
      message: 'Record added successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Update record
function updateRecord(recordId, updates) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(RECORDS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == recordId) {
        const headers = data[0];
        Object.keys(updates).forEach(key => {
          const colIndex = headers.indexOf(key);
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
          }
        });
        sheet.getRange(i + 1, 10).setValue(new Date()); // Update timestamp
        return {
          success: true,
          message: 'Record updated successfully'
        };
      }
    }
    
    return {
      success: false,
      error: 'Record not found'
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Delete record
function deleteRecord(recordId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(RECORDS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == recordId) {
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Record deleted successfully'
        };
      }
    }
    
    return {
      success: false,
      error: 'Record not found'
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Search records
function searchRecords(query) {
  const records = getRecords();
  const lowerQuery = query.toLowerCase();
  
  return records.filter(record => {
    return Object.values(record).some(value => {
      return String(value).toLowerCase().includes(lowerQuery);
    });
  });
}

// Filter records by status
function getRecordsByStatus(status) {
  const records = getRecords();
  return records.filter(record => record.Status === status);
}

// Export records to CSV
function exportRecordsCSV() {
  const records = getRecords();
  if (records.length === 0) {
    return 'No records found';
  }
  
  const headers = Object.keys(records[0]);
  let csv = headers.join(',') + '\n';
  
  records.forEach(record => {
    const row = headers.map(header => {
      const value = record[header];
      // Escape quotes and wrap in quotes if contains comma
      return typeof value === 'string' && value.includes(',') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

// Web app entry point
function doGet(e) {
  return HtmlService.createHtmlOutput('Google Apps Script Backend is running');
}

// API endpoint for frontend calls
function processRequest(action, params) {
  switch(action) {
    case 'getDashboardStats':
      return getDashboardStats();
    case 'getRecords':
      return getRecords();
    case 'addRecord':
      return addRecord(params);
    case 'updateRecord':
      return updateRecord(params.id, params.updates);
    case 'deleteRecord':
      return deleteRecord(params.id);
    case 'searchRecords':
      return searchRecords(params.query);
    case 'getRecordsByStatus':
      return getRecordsByStatus(params.status);
    case 'exportRecordsCSV':
      return exportRecordsCSV();
    default:
      return { error: 'Unknown action' };
  }
}
