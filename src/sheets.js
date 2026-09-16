import "dotenv/config";
import { getAuth } from "./googleAuth.js";

async function sheetsRequest(range, options = {}) {
  const auth = await getAuth();
  const { token } = await auth.getAccessToken();

  const encodedRange = encodeURIComponent(range);

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${process.env.SPREADSHEET_ID}/values/${encodedRange}` +
    `?key=${process.env.SHEETS_API_KEY}` +
    (options.query || "");

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Google Sheets API error ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

export async function getLeads() {
  return sheetsRequest(`${process.env.SHEET_NAME}!A1:H`);
}

export async function updateLeadClassification(rowNumber, intent, urgency) {
  return sheetsRequest(`${process.env.SHEET_NAME}!F${rowNumber}:H${rowNumber}`, {
    method: "PUT",
    query: "&valueInputOption=USER_ENTERED",
    body: {
      range: `${process.env.SHEET_NAME}!F${rowNumber}:H${rowNumber}`,
      majorDimension: "ROWS",
      values: [["Classified", intent, urgency]],
    },
  });
}

export async function updateLeadStatus(rowNumber, status) {
  return sheetsRequest(
    `${process.env.SHEET_NAME}!F${rowNumber}:F${rowNumber}`,
    {
      method: "PUT",
      query: "&valueInputOption=USER_ENTERED",
      body: {
        range: `${process.env.SHEET_NAME}!F${rowNumber}:F${rowNumber}`,
        values: [[status]],
      },
    }
  );
}