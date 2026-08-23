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

const IMAGES_DIR = path.join(__dirname, '/card_image');
const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

// Ensure decks.json exists
if (!fs.existsSync(DECKS_FILE)) {
  fs.writeFileSync(DECKS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to normalize any string: lowercase and remove all punctuation/spaces
function normalizeKey(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Extract Card ID like "A-071", "S-012", "M-005"
function extractCardId(str) {
  if (!str) return '';
  const match = str.match(/([ASMasm])[-_]?(\d{2,4})/);
  if (match) {
    return `${match[1].toLowerCase()}${match[2]}`; // e.g. "a071"
  }
  return '';
}

// In-memory index maps
const exactMap = new Map();
const normalizedMap = new Map();
const cardIdMap = new Map();

function buildImageIndex() {
  if (!fs.existsSync(IMAGES_DIR)) return;
  const files = fs.readdirSync(IMAGES_DIR);

  exactMap.clear();
  normalizedMap.clear();
  cardIdMap.clear();

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (!SUPPORTED_EXTS.includes(ext)) return;

    const baseName = path.basename(file, ext);
    const cleanBase = baseName.replace(/^\d+[-_]/, ''); // Strip "1_", "102_" prefixes

    // 1. Direct lowercase match
    exactMap.set(baseName.toLowerCase(), file);
    exactMap.set(cleanBase.toLowerCase(), file);

    // 2. Normalized match (e.g. "a071schneider")
    normalizedMap.set(normalizeKey(baseName), file);
    normalizedMap.set(normalizeKey(cleanBase), file);

    // 3. Card ID match (e.g. "a071")
    const cardId = extractCardId(baseName);
    if (cardId) {
      // Prioritize "front" over "back" if multiple exist
      if (!cardIdMap.has(cardId) || baseName.toLowerCase().includes('front')) {
        cardIdMap.set(cardId, file);
      }
    }
  });

  console.log(`[*] Indexed ${files.length} card images across ${cardIdMap.size} card IDs.`);
}

// Build index on boot
buildImageIndex();

// API endpoint to resolve and stream images
app.get('/api/images/:query', (req, res) => {
  const query = req.params.query.trim();
  const lowerQuery = query.toLowerCase();
  const normQuery = normalizeKey(query);
  const cardIdQuery = extractCardId(query);

  // Resolution Hierarchy:
  // 1. Exact base name match
  // 2. Normalized alphanumeric match
  // 3. Extracted Card ID match (A-071 -> a071)
  let matchedFile = 
    exactMap.get(lowerQuery) ||
    normalizedMap.get(normQuery) ||
    cardIdMap.get(cardIdQuery);

  if (matchedFile) {
    return res.sendFile(path.join(IMAGES_DIR, matchedFile));
  }

  // Fallback 1x1 transparent PNG if image doesn't exist
  return res.status(404).send('Card image not found');
});

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