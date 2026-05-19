/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

async function main() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  let apiKey = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('GEMINI_API_KEY=')) {
      apiKey = line.split('=')[1].trim();
      break;
    }
  }

  if (!apiKey) {
    console.error('No API key found in .env.local');
    return;
  }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  if (data.models) {
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } else {
    console.log('Error fetching models:', data);
  }
}

main().catch(console.error);
