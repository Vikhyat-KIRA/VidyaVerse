const fs = require('fs');
const { google } = require('googleapis');

async function main() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  let email = '';
  let key = '';
  let sheetId = '';

  for (const line of envFile.split('\n')) {
    if (line.startsWith('GOOGLE_SERVICE_ACCOUNT_EMAIL=')) {
      email = line.split('=')[1].trim();
    }
    if (line.startsWith('GOOGLE_PRIVATE_KEY=')) {
      // Get everything after =
      let val = line.substring(line.indexOf('=') + 1).trim();
      // Remove surrounding quotes if they exist
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      key = val;
    }
    if (line.startsWith('GOOGLE_SHEET_ID=')) {
      sheetId = line.split('=')[1].trim();
    }
  }

  console.log('Email:', email);
  console.log('Sheet ID:', sheetId);
  console.log('Key length:', key.length);

  // Parse the private key newlines
  const formattedKey = key.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:I',
  });

  console.log('Values retrieved successfully:', result.data.values ? result.data.values.length : 0);
}

main().catch(console.error);
