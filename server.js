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

// Relay endpoint for the phone scanner
app.post('/api/scan', async (req, res) => {
  let { barcode } = req.body;

  if (!barcode) {
    return res.status(400).json({ error: 'Barcode value is required.' });
  }

  // Ensure barcode is formatted cleanly as a string
  const rawBarcode = barcode.toString().trim();

  try {
    // Forward the barcode as plain text / raw string to Play! emulator
    const response = await axios.post(EMULATOR_URL, rawBarcode.toString().trim(), {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 3000
    });

    console.log(`[+] Card scanned & sent to Play!: ${rawBarcode}`);
    return res.json({ success: true, status: response.status });
  } catch (error) {
    console.error(`[-] Failed sending to emulator: ${error.message, rawBarcode}`);
    return res.status(502).json({ 
      error: 'Failed to communicate with Play! emulator. Ensure Arcade I/O server is running on port 9876.'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scanner server running at http://localhost:${PORT}`);
  console.log(`Access on your phone using your PC LAN IP: http://<YOUR_PC_IP>:${PORT}`);
});