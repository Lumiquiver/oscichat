const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // <-- NEW: Helps find the HTML file
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Google Sheets auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.SHEET_ID;

// === NEW: SERVE THE FRONTEND UI ON THE MAIN SITE ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// GET last 100 messages
app.get('/messages', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      // NOTE: Make sure your Google Sheet tab is named 'OscillationChat'
      range: 'OscillationChat!A:C', 
    });
    const allMessages = response.data.values || [];
    res.json(allMessages.slice(-100));
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// POST a new message
app.post('/messages', async (req, res) => {
  const { user, message, key } = req.body;
  if (!user || !message) return res.status(400).send('Missing user or message');
  if (key !== process.env.COMPANY_KEY) return res.status(403).send('Unauthorized');

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'OscillationChat!A:C',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[new Date().toISOString(), user, message]] },
    });
    res.send('Message sent');
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
