const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises; // Import fs.promises for async file operations

const app = express();
const port = 3000;
const DB_FILE = path.join(__dirname, 'db.json'); // Path to your db.json file
const CARDS_FILE = path.join(__dirname, 'cards.json'); // Path to your cards.json file
const DEFAULT_USER_ID = 'default-user-id'; // A fixed user ID for local testing

let cards = []; // Will store card data loaded from cards.json
let dropRates = {}; // Will store drop rates, can also be loaded from cards.json or defined here

// Enable CORS for all routes
app.use(cors());
app.use(express.json()); // To parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// Function to load cards data from cards.json
async function loadCards() {
    try {
        const data = await fs.readFile(CARDS_FILE, 'utf8');
        cards = JSON.parse(data);
        console.log(`Loaded ${cards.length} cards from ${CARDS_FILE}`);
        // Optionally, calculate drop rates based on loaded cards or keep them fixed
        defineDropRates();
    } catch (error) {
        console.error('Error loading cards.json:', error);
        console.error('Please ensure cards.json exists in the root directory and is valid JSON.');
        // Fallback to a default set of cards if the file fails to load
        cards = [
            { id: 'default1', title: 'Fallback Common', rarity: 'Common', value: 5, image: 'https://placehold.co/220x308/FF0000/FFFFFF?text=Error+Card' },
            { id: 'default2', title: 'Fallback Rare', rarity: 'Rare', value: 50, image: 'https://placehold.co/220x308/FF0000/FFFFFF?text=Error+Card' }
        ];
        defineDropRates(); // Still define drop rates for fallback cards
    }
}

// Define drop rates for different rarities (can be in cards.json or fixed here)
function defineDropRates() {
    dropRates = {
        'Common': 0.50, // 50% chance
        'Uncommon': 0.30, // 30% chance
        'Rare': 0.15, // 15% chance
        'Epic': 0.04, // 4% chance
        'Legendary': 0.01 // 1% chance
    };
    // Basic validation to ensure drop rates sum to 1 (or close to it)
    const totalDropRate = Object.values(dropRates).reduce((sum, rate) => sum + rate, 0);
    if (Math.abs(totalDropRate - 1.0) > 0.0001) {
        console.warn(`Warning: Drop rates sum to ${totalDropRate.toFixed(2)}, not 1.0. This might affect rarity distribution.`);
    }
}


// Function to read data from db.json
async function readDb() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn('db.json not found, creating with default data.');
            const defaultData = {
                users: {
                    [DEFAULT_USER_ID]: {
                        balance: 0.00,
                        inventory: {}
                    }
                }
            };
            await writeDb(defaultData);
            return defaultData;
        }
        console.error('Error reading db.json:', error);
        return { users: { [DEFAULT_USER_ID]: { balance: 0.00, inventory: {} } } }; // Fallback
    }
}

// Function to write data to db.json
async function writeDb(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing to db.json:', error);
    }
}

// Middleware to ensure user data exists in db.json
app.use(async (req, res, next) => {
    const dbData = await readDb();
    if (!dbData.users[DEFAULT_USER_ID]) {
        dbData.users[DEFAULT_USER_ID] = { balance: 0.00, inventory: {} };
        await writeDb(dbData);
    }
    next();
});

// Endpoint to get all card images (for frontend animation)
app.get('/api/cards-images', (req, res) => {
    // Ensure cards are loaded before sending them
    if (cards.length === 0) {
        return res.status(503).json({ message: "Card data not loaded yet." });
    }
    const cardImages = cards.map(card => ({ id: card.id, image: card.image }));
    res.json(cardImages);
});

// Endpoint to roll a new card based on rarity
app.post('/roll', (req, res) => {
    if (cards.length === 0) {
        return res.status(503).json({ message: "Card data not loaded, cannot roll." });
    }

    const rand = Math.random();
    let selectedRarity = '';
    let cumulativeProbability = 0;

    for (const rarity in dropRates) {
        cumulativeProbability += dropRates[rarity];
        if (rand < cumulativeProbability) {
            selectedRarity = rarity;
            break;
        }
    }

    const availableCardsInRarity = cards.filter(card => card.rarity === selectedRarity);

    if (availableCardsInRarity.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableCardsInRarity.length);
        const rolledCard = availableCardsInRarity[randomIndex];
        res.json({ card: rolledCard });
    } else {
        console.warn(`No cards found for rarity: ${selectedRarity}. Rolling a random card instead.`);
        const randomIndex = Math.floor(Math.random() * cards.length);
        const rolledCard = cards[randomIndex];
        res.json({ card: rolledCard });
    }
});

// Endpoint to get user data (balance and inventory)
app.get('/api/user-data', async (req, res) => {
    const dbData = await readDb();
    const userData = dbData.users[DEFAULT_USER_ID];
    res.json(userData);
});

// Endpoint to save user data (balance and inventory)
app.post('/api/save-user-data', async (req, res) => {
    const { balance, inventory } = req.body;
    const dbData = await readDb();
    dbData.users[DEFAULT_USER_ID] = {
        balance: parseFloat(balance) || 0.00,
        inventory: inventory || {}
    };
    await writeDb(dbData);
    res.json({ success: true, message: 'User data saved.' });
});


// Serve the main HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/card_roller_game.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'card_roller_game.html'));
});

// Start the server
// Ensure cards are loaded before the server starts listening for requests
async function startServer() {
    await loadCards(); // Load cards data
    app.listen(port, () => {
        console.log(`DVMS Card Roller server listening at http://localhost:${port}`);
    });
}

startServer();
