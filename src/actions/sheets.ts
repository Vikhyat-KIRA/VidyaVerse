'use server';

// Server-side Google Sheets integration
// Uses Service Account credentials — NEVER expose these to the client

import { google } from 'googleapis';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SheetUserRow {
  uid: string;
  name: string;
  email: string;
  class: string;
  board: string;
  school: string;
  aim: string;
  createdAt: string;
  lastUpdated: string;
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────

async function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error(
      'Google Sheets credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local'
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'), // Handle escaped newlines in env vars
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // Force a fresh short-lived token
  try {
    await auth.authorize();
  } catch (err) {
    console.error('[VidyaVerse] Google Sheets JWT auth failed:', (err as Error).message);
    throw err;
  }
  return auth;
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error('GOOGLE_SHEET_ID is missing from .env.local');
  }
  return id;
}

// ─── Sheet Operations ────────────────────────────────────────────────────────

/**
 * Sync a user profile to the Google Sheet (upsert — update if exists, append if new)
 * Called after signup or profile update
 */
export async function syncProfileToSheet(profile: {
  uid: string;
  name: string;
  email: string;
  class: string;
  board: string;
  school: string;
  aim: string;
}): Promise<void> {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = getSheetId();

    const now = new Date().toISOString();

    // First, try to find if user already exists in the sheet
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:A', // Column A = uid
    });

    const rows = existing.data.values || [];
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === profile.uid) {
        rowIndex = i + 1; // Sheets are 1-indexed
        break;
      }
    }

    const rowData = [
      profile.uid,
      profile.name,
      profile.email,
      profile.class,
      profile.board,
      profile.school,
      profile.aim,
      rowIndex > 0 ? '' : now, // Keep existing createdAt or set new one
      now, // lastUpdated
    ];

    if (rowIndex > 0) {
      // Update existing row (preserve createdAt in column H)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Sheet1!A${rowIndex}:I${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              profile.uid,
              profile.name,
              profile.email,
              profile.class,
              profile.board,
              profile.school,
              profile.aim,
              '', // Don't overwrite createdAt — leave blank to preserve
              now,
            ],
          ],
        },
      });

      // Re-fetch to keep createdAt (update only columns B-G and I)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Sheet1!B${rowIndex}:G${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              profile.name,
              profile.email,
              profile.class,
              profile.board,
              profile.school,
              profile.aim,
            ],
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Sheet1!I${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[now]],
        },
      });
    } else {
      // Append new row
      rowData[7] = now; // createdAt for new users
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Sheet1!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    }
  } catch (err) {
    console.error('[VidyaVerse] syncProfileToSheet failed:', (err as Error).message);
    // Non-critical: app continues working without Sheets sync
  }
}

/**
 * Get a user's personalization context from the Google Sheet
 * Used by VAYU for AI context injection
 */
export async function getUserContextFromSheet(uid: string): Promise<{
  aim: string;
  school: string;
  class: string;
  board: string;
  name: string;
} | null> {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = getSheetId();

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:I',
    });

    const rows = result.data.values || [];

    // Skip header row (index 0), search for matching uid
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === uid) {
        return {
          name: rows[i][1] || 'Student',
          // rows[2] = email (skip)
          class: rows[i][3] || '',
          board: rows[i][4] || '',
          school: rows[i][5] || 'Unknown School',
          aim: rows[i][6] || 'Become an excellent student',
        };
      }
    }

    return null;
  } catch (err) {
    console.error('[VidyaVerse] getUserContextFromSheet failed:', (err as Error).message);
    return null;
  }
}

/**
 * Get a user's aim from the sheet (convenience function for VAYU)
 */
export async function getUserAim(uid: string): Promise<string> {
  const context = await getUserContextFromSheet(uid);
  return context?.aim || 'Become an excellent student';
}

/**
 * Get a user's school from the sheet (convenience function for VAYU)
 */
export async function getUserSchool(uid: string): Promise<string> {
  const context = await getUserContextFromSheet(uid);
  return context?.school || 'Unknown School';
}

/**
 * Get full user row from the sheet
 */
export async function getUserFromSheet(uid: string): Promise<SheetUserRow | null> {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = getSheetId();

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:I',
    });

    const rows = result.data.values || [];

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === uid) {
        return {
          uid: rows[i][0],
          name: rows[i][1] || '',
          email: rows[i][2] || '',
          class: rows[i][3] || '',
          board: rows[i][4] || '',
          school: rows[i][5] || '',
          aim: rows[i][6] || '',
          createdAt: rows[i][7] || '',
          lastUpdated: rows[i][8] || '',
        };
      }
    }

    return null;
  } catch (err) {
    console.error('[VidyaVerse] getUserFromSheet failed:', (err as Error).message);
    return null;
  }
}

/**
 * Update a specific field in the sheet for a user
 */
export async function updateUserFieldInSheet(
  uid: string,
  field: keyof Omit<SheetUserRow, 'uid' | 'createdAt'>,
  value: string
): Promise<void> {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = getSheetId();

  // Column mapping: A=uid, B=name, C=email, D=class, E=board, F=school, G=aim, H=createdAt, I=lastUpdated
  const columnMap: Record<string, string> = {
    name: 'B',
    email: 'C',
    class: 'D',
    board: 'E',
    school: 'F',
    aim: 'G',
    lastUpdated: 'I',
  };

  const column = columnMap[field];
  if (!column) return;

  // Find user row
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:A',
  });

  const rows = result.data.values || [];
  let rowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === uid) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    // Update the specific cell
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Sheet1!${column}${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });

    // Also update lastUpdated
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Sheet1!I${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[new Date().toISOString()]],
      },
    });
  }
}
