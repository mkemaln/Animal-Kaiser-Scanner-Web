const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT;
const EMULATOR_URL = process.env.EMULATOR_URL;
const DECKS_FILE = path.join(__dirname, 'decks.json');

// Ensure decks.json exists
if (!fs.existsSync(DECKS_FILE)) {
  fs.writeFileSync(DECKS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

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

// Deck API: Get all decks
app.get('/api/decks', (req, res) => {
  try {
    const data = fs.readFileSync(DECKS_FILE, 'utf-8');
    res.json(JSON.parse(data || '[]'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read decks.' });
  }
});

// Deck API: Save new deck
app.post('/api/decks', (req, res) => {
  const { name, animal, strong, miracle } = req.body;
  if (!animal || !strong || !miracle) {
    return res.status(400).json({ error: 'A deck requires 1 Animal, 1 Strong, and 1 Miracle card.' });
  }

  try {
    const decks = JSON.parse(fs.readFileSync(DECKS_FILE, 'utf-8') || '[]');
    const newDeck = {
      id: Date.now().toString(),
      name: name || `Deck ${decks.length + 1}`,
      createdAt: new Date().toISOString(),
      animal,
      strong,
      miracle
    };
    decks.push(newDeck);
    fs.writeFileSync(DECKS_FILE, JSON.stringify(decks, null, 2), 'utf-8');
    res.json({ success: true, deck: newDeck });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save deck.' });
  }
});

// Deck API: Delete a deck
app.delete('/api/decks/:id', (req, res) => {
  try {
    let decks = JSON.parse(fs.readFileSync(DECKS_FILE, 'utf-8') || '[]');
    decks = decks.filter(d => d.id !== req.params.id);
    fs.writeFileSync(DECKS_FILE, JSON.stringify(decks, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete deck.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AK Card Server running on http://localhost:${PORT}`);
});