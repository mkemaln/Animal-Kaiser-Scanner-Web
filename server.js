const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT;
const EMULATOR_URL = process.env.EMULATOR_URL;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/scan', async (req, res) => {
  const { barcode } = req.body;
  if (!barcode) return res.status(400).json({ error: 'Missing barcode.' });

  try {
    const response = await axios.post(EMULATOR_URL, barcode.toString().trim(), {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 3000
    });

    console.log(`[+] Card scanned & sent to Play!: ${barcode}`);
    return res.json({ success: true, status: response.status });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AK Card Server running on http://localhost:${PORT}`);
});