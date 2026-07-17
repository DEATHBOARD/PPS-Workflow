const SPREADSHEET_ID = "1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs";

const DATA_SHEET_NAME = "Table1";
const DRAFTER_SHEET_NAME = "Drafters";
const SENDER_SHEET_NAME = "SenderNames";
const APPROVED_PDF_FOLDER_NAME = "Records System Approved PDFs";

const REF_PREFIX = "PPS";
const REF_DIGITS = 4;
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

const HEADERS = [
  "Ref No.",
  "Subject",
  "Date",
  "Drafter",
  "Status",
  "Remarks",
  "Date Encoded",
  "Target Date",
  "Approved PDF"
];

const DRAFTER_HEADERS = ["Drafter", "Date Added"];
const SENDER_HEADERS = ["Sender Name", "Date Added"];

const INITIAL_DRAFTERS = [
  "PSMS Abdilla Unggang",
  "PMSg Arjaei Duldulao",
  "PSSg Alvin Macahis",
  "PCpl Sharmine Macabuat",
  "PCpl Jumaida L Daud",
  "PCpl Al-Salim Jr Laja",
  "PCpl Renarose Udah",
  "Pat Dhormie Muhamil",
  "Pat Janielyn Parcon"
];

const INITIAL_SENDERS = [
  "DURUIN, JR",
  "GALVEZ",
  "STA. ANA",
  "UNDING",
  "GAAS"
];

/* =========================
   WEB APP
========================= */

function getSystemStatus() {
  const sheet = getSheet();

  return {
    dataSheetName: sheet.getName(),
    recordRows: Math.max(0, sheet.getLastRow() - 1),
    spreadsheetId: SPREADSHEET_ID,
    currentYear: getCurrentYear_(),
    nextRefNo: getNextRefNo()
  };
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Records System")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupSystem() {
  const dataSheet = getSheet();
  const drafterSheet = getDrafterSheet();
  const senderSheet = getSenderSheet();

  return {
    success: true,
    message: "Records System setup completed.",
    dataSheet: dataSheet.getName(),
    drafterSheet: drafterSheet.getName(),
    senderSheet: senderSheet.getName(),
    nextRefNo: getNextRefNo()
  };
}

/* =========================
   SHEET HELPERS
========================= */

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const namedSheet = ss.getSheetByName(DATA_SHEET_NAME);

  const excludedNames = [
    DRAFTER_SHEET_NAME,
    SENDER_SHEET_NAME
  ];

  const candidates = ss.getSheets().filter(sheet =>
    !excludedNames.includes(sheet.getName())
  );

  const matchingSheets = candidates.filter(sheet =>
    hasRecordHeaders_(sheet)
  );

  const populatedMatchingSheets = matchingSheets
    .filter(sheet => sheet.getLastRow() > 1)
    .sort((a, b) => b.getLastRow() - a.getLastRow());

  let sheet = null;

  if (
    namedSheet &&
    namedSheet.getLastRow() > 1 &&
    hasRecordHeaders_(namedSheet)
  ) {
    sheet = namedSheet;
  }

  if (!sheet && populatedMatchingSheets.length) {
    sheet = populatedMatchingSheets[0];
  }

  if (!sheet && namedSheet) {
    sheet = namedSheet;
  }

  if (!sheet && matchingSheets.length) {
    sheet = matchingSheets[0];
  }

  if (!sheet && candidates.length) {
    sheet =
      candidates.find(candidate => candidate.getLastRow() > 0) ||
      candidates[0];
  }

  if (!sheet) {
    sheet = ss.insertSheet(DATA_SHEET_NAME);
  }

  ensureHeaders_(sheet, HEADERS);
  return sheet;
}

function hasRecordHeaders_(sheet) {
  if (!sheet || sheet.getLastRow() < 1) {
    return false;
  }

  const columnCount = Math.max(
    HEADERS.length,
    Math.min(sheet.getLastColumn(), HEADERS.length)
  );

  const headers = sheet
    .getRange(1, 1, 1, columnCount)
    .getDisplayValues()[0]
    .map(value => normalizeHeader_(value));

  const requiredHeaders = [
    "ref no",
    "subject",
    "date",
    "drafter",
    "status"
  ];

  return requiredHeaders.every(required =>
    headers.some(header =>
      header === required ||
      header.startsWith(required)
    )
  );
}

function normalizeHeader_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ");
}

function getDataSheetDiagnostic() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const selected = getSheet();

  return {
    selectedSheet: selected.getName(),
    selectedLastRow: selected.getLastRow(),
    selectedLastColumn: selected.getLastColumn(),
    sheets: ss.getSheets().map(sheet => ({
      name: sheet.getName(),
      rows: sheet.getLastRow(),
      columns: sheet.getLastColumn(),
      hasRecordHeaders: hasRecordHeaders_(sheet)
    }))
  };
}

function getDrafterSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(DRAFTER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(DRAFTER_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, DRAFTER_HEADERS.length).setValues([DRAFTER_HEADERS]);

    if (INITIAL_DRAFTERS.length) {
      const now = new Date();
      const rows = INITIAL_DRAFTERS.map(name => [name, now]);
      sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }
  } else {
    ensureHeaders_(sheet, DRAFTER_HEADERS);
  }

  return sheet;
}

function getSenderSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SENDER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SENDER_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, SENDER_HEADERS.length).setValues([SENDER_HEADERS]);

    if (INITIAL_SENDERS.length) {
      const now = new Date();
      const rows = INITIAL_SENDERS.map(name => [name, now]);
      sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }
  } else {
    ensureHeaders_(sheet, SENDER_HEADERS);
  }

  ensureInitialSenders_(sheet);
  return sheet;
}

function ensureInitialSenders_(sheet) {
  const lastRow = sheet.getLastRow();
  const existingNames = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
        .flat()
        .map(name => normalize_(name))
        .filter(Boolean)
    : [];

  const missingNames = INITIAL_SENDERS.filter(
    name => !existingNames.includes(normalize_(name))
  );

  if (!missingNames.length) {
    return;
  }

  const now = new Date();
  const rows = missingNames.map(name => [name, now]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 2).setValues(rows);
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader_(sheet, headers.length);
    return;
  }

  const current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  let changed = false;

  headers.forEach((header, index) => {
    if (current[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
      changed = true;
    }
  });

  if (changed || sheet.getFrozenRows() !== 1) {
    styleHeader_(sheet, headers.length);
  }
}

function styleHeader_(sheet, columnCount) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columnCount)
    .setFontWeight("bold")
    .setBackground("#eaf1fb")
    .setFontColor("#0f172a");
}

/* =========================
   YEARLY REFERENCE NUMBER
   Example: PPS-0001
   Resets automatically every January 1.

   A separate counter is stored for each calendar year. The sheet is also
   scanned so deployment over existing data continues from the highest
   current-year PPS number. Deleted numbers are not reused.
========================= */

function getNextRefNo() {
  const sheet = getSheet();
  const year = getCurrentYear_();
  const highestInSheet = getHighestRefSequenceForYear_(sheet, year);
  const storedCounter = getStoredRefCounter_(year);
  const nextSequence = Math.max(highestInSheet, storedCounter) + 1;

  return formatPpsRefNo_(nextSequence);
}

function reserveNextRefNo_(sheet) {
  const year = getCurrentYear_();
  const highestInSheet = getHighestRefSequenceForYear_(sheet, year);
  const storedCounter = getStoredRefCounter_(year);
  const nextSequence = Math.max(highestInSheet, storedCounter) + 1;

  PropertiesService.getScriptProperties().setProperty(
    getRefCounterKey_(year),
    String(nextSequence)
  );

  return formatPpsRefNo_(nextSequence);
}

function getCurrentYear_() {
  return Number(
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy"
    )
  );
}

function getRefCounterKey_(year) {
  return "PPS_REF_COUNTER_" + String(year);
}

function getStoredRefCounter_(year) {
  const value = PropertiesService
    .getScriptProperties()
    .getProperty(getRefCounterKey_(year));

  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function getHighestRefSequenceForYear_(sheet, year) {
  const lastRow = sheet.getLastRow();
  const timezone = Session.getScriptTimeZone();
  let highest = 0;

  if (lastRow <= 1) {
    return highest;
  }

  // Columns used: A = Ref No., C = document Date, G = Date Encoded.
  const rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  rows.forEach(row => {
    const refText = String(row[0] == null ? "" : row[0]).trim();
    const match = refText.match(/^PPS-(\d+)$/i);

    if (!match) {
      return;
    }

    // Date Encoded is the primary yearly basis. Document Date is only a
    // fallback for older rows where Date Encoded is blank.
    const recordYear = getYearFromValue_(row[6], timezone) ||
      getYearFromValue_(row[2], timezone);

    if (recordYear !== Number(year)) {
      return;
    }

    const sequence = Number(match[1]);

    if (Number.isInteger(sequence) && sequence > highest) {
      highest = sequence;
    }
  });

  return highest;
}

function formatPpsRefNo_(sequence) {
  const safeSequence = Math.max(1, Number(sequence) || 1);
  return REF_PREFIX + "-" + String(safeSequence).padStart(REF_DIGITS, "0");
}

function getYearFromValue_(value, timezone) {
  if (!value) {
    return 0;
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Number(Utilities.formatDate(value, timezone, "yyyy"));
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{4})[-/]/);

  return match ? Number(match[1]) : 0;
}

/* =========================
   APPROVED PDF / MEMO
========================= */

function getApprovedPdfFolder_() {
  const folders = DriveApp.getFoldersByName(APPROVED_PDF_FOLDER_NAME);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(APPROVED_PDF_FOLDER_NAME);
}

function validatePdf_(fileData) {
  if (!fileData || !fileData.base64 || !fileData.name) {
    throw new Error("Please select a PDF file.");
  }

  const name = String(fileData.name).trim();
  const mimeType = String(fileData.mimeType || "").toLowerCase();

  if (mimeType !== "application/pdf" && !name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are allowed.");
  }

  const bytes = Utilities.base64Decode(fileData.base64);

  if (bytes.length > MAX_PDF_SIZE_BYTES) {
    throw new Error("The PDF file must not exceed 5 MB.");
  }

  return {
    bytes: bytes,
    name: name,
    mimeType: "application/pdf"
  };
}

function saveApprovedPdf(fileData, refNo) {
  if (!fileData || !fileData.base64) {
    return "";
  }

  const validated = validatePdf_(fileData);
  const folder = getApprovedPdfFolder_();
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyyMMdd_HHmmss"
  );

  const safeRef = String(refNo || "Record").replace(/[^\w.-]/g, "_");
  const fileName = "Approved_Memo_" + safeRef + "_" + timestamp + ".pdf";
  const blob = Utilities.newBlob(validated.bytes, validated.mimeType, fileName);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    // File remains saved even when public link sharing is restricted.
  }

  return file.getUrl();
}

function uploadApprovedMemo(rowNumber, fileData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet();
    const row = Number(rowNumber);

    validateRecordRow_(sheet, row);

    const refNo = sheet.getRange(row, 1).getDisplayValue();
    const approvedPdfUrl = saveApprovedPdf(fileData, refNo);

    sheet.getRange(row, 9).setValue(approvedPdfUrl);

    return {
      success: true,
      message: "Approved memo uploaded successfully.",
      rowNumber: row,
      refNo: refNo,
      approvedPdfUrl: approvedPdfUrl
    };
  } finally {
    lock.releaseLock();
  }
}

/* =========================
   RECORDS CRUD
========================= */

function saveRecord(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    data = data || {};

    const sheet = getSheet();
    const refNo = reserveNextRefNo_(sheet);
    const now = new Date();
    const timezone = Session.getScriptTimeZone();

    const subject = cleanText_(data.subject);
    const date = cleanText_(data.date);
    const targetDate = cleanText_(data.targetDate);
    const drafter = cleanText_(data.drafter);
    const status = cleanText_(data.status) || "For Routing";
    const remarks = cleanText_(data.remarks);

    if (!subject) {
      throw new Error("Subject is required.");
    }

    if (!date) {
      throw new Error("Date is required.");
    }

    if (!drafter) {
      throw new Error("Drafter is required.");
    }

    let approvedPdfUrl = "";

    if (data.approvedPdf && data.approvedPdf.base64) {
      approvedPdfUrl = saveApprovedPdf(data.approvedPdf, refNo);
    }

    sheet.appendRow([
      refNo,
      subject,
      date,
      drafter,
      status,
      remarks,
      now,
      targetDate,
      approvedPdfUrl
    ]);

    const newRow = sheet.getLastRow();

    return {
      success: true,
      message: "Record saved successfully.",
      refNo: refNo,
      record: {
        rowNumber: newRow,
        refNo: refNo,
        subject: subject,
        date: date,
        targetDate: targetDate,
        drafter: drafter,
        status: status,
        remarks: remarks,
        dateEncoded: Utilities.formatDate(now, timezone, "yyyy-MM-dd HH:mm:ss"),
        approvedPdfUrl: approvedPdfUrl
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function getRecords() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const timezone = Session.getScriptTimeZone();

  return values
    .map((row, index) => ({
      rowNumber: index + 2,
      refNo: row[0],
      subject: row[1] || "",
      date: formatDateValue(row[2], timezone),
      drafter: row[3] || "",
      status: row[4] || "",
      remarks: row[5] || "",
      dateEncoded: formatDateTimeValue(row[6], timezone),
      targetDate: formatDateValue(row[7], timezone),
      approvedPdfUrl: row[8] || ""
    }))
    .filter(record =>
      record.refNo ||
      record.subject ||
      record.date ||
      record.drafter ||
      record.status ||
      record.remarks
    );
}

function updateRecord(rowNumber, data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    data = data || {};

    const sheet = getSheet();
    const row = Number(rowNumber);
    const timezone = Session.getScriptTimeZone();

    validateRecordRow_(sheet, row);

    const subject = cleanText_(data.subject);
    const date = cleanText_(data.date);
    const targetDate = cleanText_(data.targetDate);
    const drafter = cleanText_(data.drafter);
    const status = cleanText_(data.status);
    const remarks = cleanText_(data.remarks);

    if (!subject) {
      throw new Error("Subject is required.");
    }

    if (!date) {
      throw new Error("Date is required.");
    }

    if (!drafter) {
      throw new Error("Drafter is required.");
    }

    let approvedPdfUrl = sheet.getRange(row, 9).getValue() || "";
    const refNo = sheet.getRange(row, 1).getDisplayValue();

    if (data.approvedPdf && data.approvedPdf.base64) {
      approvedPdfUrl = saveApprovedPdf(data.approvedPdf, refNo);
    }

    sheet.getRange(row, 2, 1, 5).setValues([[
      subject,
      date,
      drafter,
      status,
      remarks
    ]]);

    sheet.getRange(row, 8).setValue(targetDate);
    sheet.getRange(row, 9).setValue(approvedPdfUrl);

    const dateEncodedValue = sheet.getRange(row, 7).getValue();

    return {
      success: true,
      message: "Record updated successfully.",
      record: {
        rowNumber: row,
        refNo: refNo,
        subject: subject,
        date: date,
        targetDate: targetDate,
        drafter: drafter,
        status: status,
        remarks: remarks,
        dateEncoded: formatDateTimeValue(dateEncodedValue, timezone),
        approvedPdfUrl: approvedPdfUrl
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function deleteRecord(rowNumber) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet();
    const row = Number(rowNumber);

    validateRecordRow_(sheet, row);
    sheet.deleteRow(row);

    return {
      success: true,
      message: "Record deleted successfully."
    };
  } finally {
    lock.releaseLock();
  }
}

function validateRecordRow_(sheet, row) {
  if (!Number.isInteger(row) || row <= 1 || row > sheet.getLastRow()) {
    throw new Error("Invalid record row.");
  }
}

/* =========================
   DASHBOARD
========================= */

function getDashboardStats() {
  const records = getRecords();

  const countStatus = status => {
    const target = normalize_(status);
    return records.filter(record => normalize_(record.status) === target).length;
  };

  return {
    total: records.length,
    pending: countStatus("Pending"),
    forRouting: countStatus("For Routing"),
    onProcess: countStatus("On Process"),
    forwarded: countStatus("Forwarded"),
    returned: countStatus("Returned"),
    completed: countStatus("Completed")
  };
}

/* =========================
   DRAFTERS
========================= */

function getDrafters() {
  const sheet = getDrafterSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const timezone = Session.getScriptTimeZone();

  return values
    .map((row, index) => ({
      rowNumber: index + 2,
      name: row[0] || "",
      dateAdded: formatDateTimeValue(row[1], timezone)
    }))
    .filter(item => item.name);
}

function addDrafter(data) {
  const sheet = getDrafterSheet();
  const name = cleanText_(data && data.name);

  if (!name) {
    throw new Error("Drafter name is required.");
  }

  const exists = getDrafters().some(
    item => normalize_(item.name) === normalize_(name)
  );

  if (exists) {
    throw new Error("Drafter already exists.");
  }

  sheet.appendRow([name, new Date()]);

  return {
    success: true,
    message: "Drafter added successfully."
  };
}

function updateDrafter(rowNumber, data) {
  const sheet = getDrafterSheet();
  const row = Number(rowNumber);
  const name = cleanText_(data && data.name);

  validateSettingsRow_(sheet, row, "drafter");

  if (!name) {
    throw new Error("Drafter name is required.");
  }

  const duplicate = getDrafters().some(
    item =>
      Number(item.rowNumber) !== row &&
      normalize_(item.name) === normalize_(name)
  );

  if (duplicate) {
    throw new Error("Another drafter with the same name already exists.");
  }

  sheet.getRange(row, 1).setValue(name);

  return {
    success: true,
    message: "Drafter updated successfully."
  };
}

function deleteDrafter(rowNumber) {
  const sheet = getDrafterSheet();
  const row = Number(rowNumber);

  validateSettingsRow_(sheet, row, "drafter");
  sheet.deleteRow(row);

  return {
    success: true,
    message: "Drafter deleted successfully."
  };
}

/* =========================
   SENDERS
========================= */

function getSenders() {
  const sheet = getSenderSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const timezone = Session.getScriptTimeZone();

  return values
    .map((row, index) => ({
      rowNumber: index + 2,
      name: row[0] || "",
      dateAdded: formatDateTimeValue(row[1], timezone)
    }))
    .filter(item => item.name);
}

function addSender(data) {
  const sheet = getSenderSheet();
  const name = cleanText_(data && data.name);

  if (!name) {
    throw new Error("Sender name is required.");
  }

  const exists = getSenders().some(
    item => normalize_(item.name) === normalize_(name)
  );

  if (exists) {
    throw new Error("Sender already exists.");
  }

  sheet.appendRow([name, new Date()]);

  return {
    success: true,
    message: "Sender name added successfully."
  };
}

function updateSender(rowNumber, data) {
  const sheet = getSenderSheet();
  const row = Number(rowNumber);
  const name = cleanText_(data && data.name);

  validateSettingsRow_(sheet, row, "sender");

  if (!name) {
    throw new Error("Sender name is required.");
  }

  const duplicate = getSenders().some(
    item =>
      Number(item.rowNumber) !== row &&
      normalize_(item.name) === normalize_(name)
  );

  if (duplicate) {
    throw new Error("Another sender with the same name already exists.");
  }

  sheet.getRange(row, 1).setValue(name);

  return {
    success: true,
    message: "Sender name updated successfully."
  };
}

function deleteSender(rowNumber) {
  const sheet = getSenderSheet();
  const row = Number(rowNumber);

  validateSettingsRow_(sheet, row, "sender");
  sheet.deleteRow(row);

  return {
    success: true,
    message: "Sender name deleted successfully."
  };
}

function validateSettingsRow_(sheet, row, itemName) {
  if (!Number.isInteger(row) || row <= 1 || row > sheet.getLastRow()) {
    throw new Error("Invalid " + itemName + " row.");
  }
}

/* =========================
   FORMATTERS
========================= */

function cleanText_(value) {
  return String(value == null ? "" : value).trim();
}

function normalize_(value) {
  return cleanText_(value).toLowerCase();
}

function formatDateValue(value, timezone) {
  if (!value) {
    return "";
  }

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd");
  }

  return String(value);
}

function formatDateTimeValue(value, timezone) {
  if (!value) {
    return "";
  }

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd HH:mm:ss");
  }

  return String(value);
}
