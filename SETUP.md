# PPS Workflow - Google Apps Script Integration Setup Guide

## Overview

This guide walks you through connecting your PPS Workflow dashboard (HTML/CSS/JS) to Google Sheets via Google Apps Script for data persistence and backend management.

**Your Google Sheet:** https://docs.google.com/spreadsheets/d/1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs/edit?gid=0#gid=0

---

## Step 1: Prepare Your Google Sheet

### 1.1 Create Required Sheets

Your spreadsheet needs two sheets:

#### **Sheet 1: "Records"**
Create headers (first row):
| ID | Date Created | Subject | Status | For Routing | On Process | Completed | Remarks | Drafter | Last Updated | QR Code |
|---|---|---|---|---|---|---|---|---|---|---|

#### **Sheet 2: "Settings"**
Create with initial data:
| Setting | Value |
|---------|-------|
| NextID | 1000 |

**Spreadsheet ID:** `1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs`

---

## Step 2: Set Up Google Apps Script Project

### 2.1 Create a New Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Click **"+ New project"**
3. Name it: **"PPS Workflow Backend"**
4. Remove the default `Code.gs` file

### 2.2 Add Backend Code

1. Click **"+ Create"** → **"Script"**
2. Name it: **`backend.gs`**
3. Copy the entire content from: [`backend.gs`](https://github.com/DEATHBOARD/PPS-Workflow/blob/main/backend.gs)
4. Paste it into the Apps Script editor
5. **IMPORTANT:** Update line 2 with your Spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = '1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs';
   ```

### 2.3 Test the Backend

1. Click **Save** (Ctrl+S)
2. Select function: `initializeSheets` from the dropdown
3. Click **Run**
4. Grant permissions when prompted
5. Check your Google Sheet - the "Records" and "Settings" sheets should be created/verified

---

## Step 3: Deploy as Web App

### 3.1 Create Deployment

1. Click **Deploy** → **New deployment**
2. Select type: **Web app**
3. Execute as: **Your email**
4. Who has access: **Anyone** (or select specific users)
5. Click **Deploy**

### 3.2 Copy Deployment ID

1. You'll see a dialog with a URL like:
   ```
   https://script.google.com/macros/d/[DEPLOYMENT_ID]/usercopy
   ```
2. **Copy the DEPLOYMENT_ID** (the long string between `/d/` and `/usercopy`)

---

## Step 4: Update Frontend HTML

### 4.1 Add Script Tags to index.html

Add these lines before the closing `</body>` tag in your `index.html`:

```html
<!-- Google Apps Script Integration -->
<script src="integration.js"></script>

<!-- Script for Google Apps Script connection -->
<script>
  // This enables google.script.run functionality
  // Only works when deployed as Google Apps Script web app
</script>
```

### 4.2 Verify Element IDs

Ensure your HTML has these element IDs for the JavaScript to work:

**Dashboard Section:**
```html
<div id="statTotal" class="stat-value">0</div>
<div id="statForRouting" class="stat-value">0</div>
<div id="statOnProcess" class="stat-value">0</div>
<div id="statCompleted" class="stat-value">0</div>
```

**Records Table Section:**
```html
<tbody id="recordsTableBody">
  <!-- Records will be inserted here -->
</tbody>

<!-- Search/Filter inputs (optional) -->
<input id="recordsSearch" type="text" placeholder="Search records...">
<select id="statusFilter">
  <option value="">All Statuses</option>
  <option value="Pending">Pending</option>
  <option value="For Routing">For Routing</option>
  <option value="On Process">On Process</option>
  <option value="Completed">Completed</option>
</select>
```

**Data Entry Form:**
```html
<form id="dataEntryForm">
  <input type="text" name="subject" placeholder="Subject" required>
  <select name="status">
    <option value="Pending">Pending</option>
    <option value="For Routing">For Routing</option>
    <option value="On Process">On Process</option>
    <option value="Completed">Completed</option>
  </select>
  <textarea name="remarks" placeholder="Remarks"></textarea>
  <input type="text" name="drafter" placeholder="Drafter">
  <button type="button" onclick="submitNewRecord('dataEntryForm')">Submit</button>
</form>
```

---

## Step 5: Deploy as Google Apps Script Web App

### 5.1 Option A: Host Entire App in Google Apps Script

If you want to host the entire app in Google Apps Script:

1. In Apps Script, create a new HTML file:
   - Click **"+ Create"** → **"HTML"**
   - Name it: `index.html`
   
2. Copy your HTML content into this file
3. Update `backend.gs` `doGet()` function:
```javascript
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

4. Save and redeploy

### 5.2 Option B: Host HTML Separately, Call Backend via API

1. Keep your HTML hosted separately (GitHub Pages, your server, etc.)
2. Add this to your `integration.js` (already included):
```javascript
function callBackend(action, params = {}) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .processRequest(action, params);
  });
}
```

3. Deploy Apps Script as Web App
4. Your HTML can call the backend via the deployment URL

### 5.3 Deploy/Redeploy

1. Click **Deploy** → **New deployment** (or **Manage deployments** to update)
2. Select **Web app**
3. Execute as: Your account
4. Who has access: **Anyone** (for testing) or specific users
5. Click **Deploy**

---

## Step 6: Test the Integration

### 6.1 Test Data Entry

1. Open the deployed web app
2. Go to **"Data Entry"** tab
3. Fill in a test record:
   - Subject: "Test Record"
   - Status: "Pending"
   - Remarks: "Testing"
   - Drafter: "Your Name"
4. Click **"Submit"**
5. Check your Google Sheet - the record should appear in the "Records" sheet

### 6.2 Test Dashboard

1. Go to **"Dashboard"** tab
2. Stats should load automatically
3. You should see the count of total, routing, processing, and completed records

### 6.3 Test Records Table

1. Go to **"Records Table"** tab
2. All records should display
3. Test search and filter functionality
4. Test Edit/Delete buttons

### 6.4 Debug Issues

**Open Developer Console:**
- Press `F12` in your browser
- Go to **Console** tab
- Look for any error messages

**Check Apps Script Logs:**
- In Apps Script editor, click **View** → **Logs**
- Run functions manually to see execution logs

---

## Available Functions Reference

### Frontend Functions (integration.js)

**Dashboard:**
- `loadDashboardStats()` - Loads and displays dashboard statistics
- `showView(viewName)` - Switches between views (dashboard, entry, records, settings)

**Records Management:**
- `loadRecordsTable()` - Loads all records from backend
- `displayRecordsTable(records)` - Renders records in table
- `submitNewRecord(formId)` - Adds new record
- `editRecord(recordId)` - Opens edit dialog for a record
- `saveEditedRecord()` - Saves record changes
- `deleteRecord(recordId)` - Deletes a record
- `deleteRecordConfirm(recordId)` - Confirmation dialog before delete

**Search & Filter:**
- `searchRecords(query)` - Searches records by any field
- `filterByStatus(status)` - Filters records by status

**Export:**
- `exportRecordsCSV()` - Exports all records as CSV file

**Utilities:**
- `showLoading(show, message)` - Shows/hides loading overlay
- `showAlert(type, message)` - Shows toast alert
- `formatDate(date)` - Formats date for display

### Backend Functions (backend.gs)

**Data Operations:**
- `getRecords()` - Returns all records
- `addRecord(recordData)` - Adds new record
- `updateRecord(recordId, updates)` - Updates existing record
- `deleteRecord(recordId)` - Deletes a record
- `searchRecords(query)` - Searches records

**Analytics:**
- `getDashboardStats()` - Returns counts by status
- `getRecordsByStatus(status)` - Filters by status

**Export:**
- `exportRecordsCSV()` - Generates CSV export

**Utilities:**
- `initializeSheets()` - Creates required sheets
- `processRequest(action, params)` - Main API endpoint

---

## Troubleshooting

### Issue: "Script URL not found" or "403 Forbidden"

**Solution:**
1. Ensure deployment is set to "Anyone" or specific users
2. Check that deployment ID is correct
3. Redeploy with latest version
4. Clear browser cache (Ctrl+Shift+Delete)

### Issue: "Spreadsheet not found"

**Solution:**
1. Verify `SPREADSHEET_ID` in `backend.gs` is correct: `1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs`
2. Ensure the Google Sheet is shared with your Google account
3. Run `initializeSheets()` function manually
4. Check that you have edit access to the sheet

### Issue: Records not saving

**Solution:**
1. Check browser console for errors (F12)
2. Verify "Records" sheet exists in Google Sheet
3. Ensure all required columns are present
4. Check Apps Script logs: **View** → **Logs**
5. Run `initializeSheets()` to recreate sheets

### Issue: Permission errors

**Solution:**
1. In Apps Script, go to **Project Settings**
2. Check that the Google Sheet is accessible to your account
3. Manually authorize each function by running it once
4. Grant all permission prompts that appear
5. Redeploy with fresh authorization

### Issue: "google.script is not defined"

**Solution:**
1. Make sure you're running within Google Apps Script deployment
2. Add `integration.js` to your HTML via `<script src="integration.js"></script>`
3. Or include the code directly in a `<script>` tag in your HTML

---

## Security Considerations

### Current Setup
- Currently set to "Anyone" access (for testing)

### For Production
1. **Change deployment to specific users/domain:**
   - Go to deployment settings
   - Select "Only yourself" or specific emails/domains

2. **Add authentication:**
   ```javascript
   function getCurrentUser() {
     return Session.getActiveUser().getEmail();
   }
   ```

3. **Implement row-level permissions:**
   - Add user email column to records
   - Filter records by current user

4. **Add audit logging:**
   ```javascript
   function logAction(action, recordId, userId) {
     // Log changes to separate sheet
   }
   ```

5. **Restrict sensitive operations:**
   - Limit delete permissions
   - Require approval for status changes

---

## Advanced Customization

### Adding Custom Status Values

1. Edit `backend.gs` `getDashboardStats()` function:
```javascript
if (status === 'your-new-status') yourCounter++;
```

2. Edit `integration.js` `getStatusClass()` function:
```javascript
'Your New Status': 'status-your-class',
```

3. Add CSS in `index.html`:
```css
.status-your-class { background:#yourcolor; color:#yourtext; }
```

4. Update status options in forms

### Adding New Columns

1. **Google Sheet:** Add new header column to "Records" sheet
2. **backend.gs:** Update column references in functions
3. **integration.js:** Update `displayRecordsTable()` to show new column
4. **index.html:** Add form field for new column in data entry

### Scheduling Tasks

Add to `backend.gs`:
```javascript
function scheduleTask() {
  // Your scheduled task code
}
```

Then set up time-based trigger:
1. In Apps Script, click **"Triggers"** (alarm icon)
2. Click **"Create new trigger"**
3. Select your function
4. Choose frequency

### Adding QR Code Generation

Add to `backend.gs`:
```javascript
function generateQRCode(recordId) {
  const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${recordId}`;
  return qrURL;
}
```

---

## API Usage Examples

### Add Record
```javascript
const result = await callBackend('addRecord', {
  subject: 'Test Subject',
  status: 'Pending',
  remarks: 'Test remarks',
  drafter: 'John Doe'
});
console.log('Record ID:', result.id);
```

### Search
```javascript
const results = await callBackend('searchRecords', {
  query: 'important'
});
console.log('Found:', results.length, 'records');
```

### Update
```javascript
const result = await callBackend('updateRecord', {
  id: 1000,
  updates: {
    Status: 'Completed',
    Remarks: 'All done'
  }
});
```

### Get by Status
```javascript
const completed = await callBackend('getRecordsByStatus', {
  status: 'Completed'
});
```

### Export
```javascript
const csv = await callBackend('exportRecordsCSV');
// csv now contains CSV formatted data
```

---

## Files in Repository

- **`index.html`** - Frontend UI with styling
- **`backend.gs`** - Google Apps Script backend
- **`integration.js`** - JavaScript frontend integration
- **`SETUP.md`** - This setup guide

---

## Quick Start Checklist

- [ ] Create "Records" and "Settings" sheets in Google Sheet
- [ ] Create Google Apps Script project
- [ ] Add backend.gs with correct SPREADSHEET_ID
- [ ] Run initializeSheets() function
- [ ] Deploy as Web App
- [ ] Add integration.js to HTML
- [ ] Test data entry
- [ ] Test dashboard stats
- [ ] Test records table
- [ ] Test search/filter
- [ ] Test edit/delete

---

## Support & Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API Reference](https://developers.google.com/sheets/api)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0)
- [Font Awesome Icons](https://fontawesome.com/icons)
- [JavaScript Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

---

## Tips & Best Practices

1. **Performance:** Cache data in browser when possible to reduce API calls
2. **Error Handling:** Always wrap backend calls in try-catch blocks
3. **User Feedback:** Always show loading state and success/error messages
4. **Data Validation:** Validate on frontend before sending to backend
5. **Logging:** Check Apps Script logs frequently during development
6. **Testing:** Test with different data types and edge cases
7. **Documentation:** Add comments to custom functions for team reference

---

**Last Updated:** July 17, 2026  
**Version:** 1.0  
**Status:** Production Ready  
**Spreadsheet ID:** `1CLvPRWFP8rim79dCUhntBz7cbi2-pxvl_k5agqzHdHs`