# Psychic Cleaner Checklist → Home of Engines

The CRM accepts signed single-row or batch deliveries at:

```text
POST https://YOUR-DEPLOYED-DOMAIN/api/integrations/checklist
```

The request must include `x-bbm-timestamp` and `x-bbm-signature`. The signature is an HMAC-SHA256 hex digest of:

```text
<unix_timestamp_seconds>.<exact_JSON_body>
```

The same secret is stored as `BBM_CHECKLIST_WEBHOOK_SECRET` in the WebDev project and as `BBM_CRM_WEBHOOK_SECRET` in Google Apps Script properties. Never put the secret in worksheet cells or source control.

## Apps Script properties

In the existing Psychic Cleaner Checklist Apps Script project, open **Project Settings → Script properties** and add:

| Property | Value |
|---|---|
| `BBM_CRM_WEBHOOK_URL` | `https://YOUR-DEPLOYED-DOMAIN/api/integrations/checklist` |
| `BBM_CRM_WEBHOOK_SECRET` | The same secret configured in the CRM |

## Apps Script code

Add the following functions to the existing Apps Script project. The script uses the current form-response row, so it can run beside the existing Google Sheets logging and email workflow.

```javascript
function bbmHex_(bytes) {
  return bytes.map(function (byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function bbmPostToCrm_(body) {
  var properties = PropertiesService.getScriptProperties();
  var url = properties.getProperty("BBM_CRM_WEBHOOK_URL");
  var secret = properties.getProperty("BBM_CRM_WEBHOOK_SECRET");
  if (!url || !secret) throw new Error("BBM CRM webhook properties are missing");

  var json = JSON.stringify(body);
  var timestamp = Math.floor(Date.now() / 1000).toString();
  var signature = bbmHex_(Utilities.computeHmacSha256Signature(timestamp + "." + json, secret));

  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: json,
    headers: {
      "x-bbm-timestamp": timestamp,
      "x-bbm-signature": signature
    },
    muteHttpExceptions: true
  });

  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error("CRM webhook failed (" + status + "): " + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

function bbmRowObject_(sheet, rowNumber) {
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  var values = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];
  var row = {};
  headers.forEach(function (header, index) {
    row[String(header).trim()] = values[index];
  });
  return row;
}

function bbmChecklistPayload_(sheet, rowNumber) {
  var row = bbmRowObject_(sheet, rowNumber);
  return {
    externalId: SpreadsheetApp.getActive().getId() + ":" + sheet.getSheetId() + ":" + rowNumber,
    sourceSheet: sheet.getName(),
    submittedAt: row.Timestamp || row["Timestamp"] || new Date().toISOString(),
    businessName: row["Business Name"] || row.Business || row["Company Name"],
    contactName: row["Contact Name"] || row.Name,
    email: row.Email || row["Email Address"],
    phone: row.Phone || row["Phone Number"],
    score: row.Score || row["Checklist Score"],
    tier: row.Tier || row["Result Tier"],
    campaignSource: row.Source || "Psychic Cleaner Checklist",
    sourceRow: row
  };
}

function bbmOnChecklistSubmit(e) {
  var sheet = e.range.getSheet();
  var payload = bbmChecklistPayload_(sheet, e.range.getRow());
  bbmPostToCrm_(payload);
}

function bbmReconcileRecentRows() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var firstRow = Math.max(2, lastRow - 99);
  var rows = [];
  for (var rowNumber = firstRow; rowNumber <= lastRow; rowNumber++) {
    rows.push(bbmChecklistPayload_(sheet, rowNumber));
  }
  bbmPostToCrm_({ rows: rows });
}
```

## Triggers

Create two Apps Script triggers:

| Function | Event source | Event type / frequency | Purpose |
|---|---|---|---|
| `bbmOnChecklistSubmit` | From spreadsheet | On form submit | Immediate lead ingestion |
| `bbmReconcileRecentRows` | Time-driven | Every hour | Re-sends the latest 100 rows; CRM deduplication prevents duplicates |

The CRM deduplicates on `externalId` within the owner account. Reconciliation can therefore safely resend rows after a temporary network or deployment failure.

## Expected payload fields

| Field | Required | CRM destination |
|---|---:|---|
| `externalId` | Yes | Stable deduplication key |
| `businessName` | Yes | Lead business name |
| `submittedAt` | Recommended | Checklist and lead timeline date |
| `contactName`, `email`, `phone` | Optional | Lead contact details |
| `score`, `tier` | Optional | Checklist qualification |
| `campaignSource` | Optional | Marketing attribution source |
| Additional fields | Optional | Preserved in the raw response payload |
