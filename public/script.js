// public/script.js
// This script is specifically for the card_roller_game.html page.

const rollButton = document.getElementById('roll-button');
const rollingCardImage = document.getElementById('rolling-card-image');
const cardInfoDisplay = document.getElementById('card-info');
const inventoryList = document.getElementById('inventory-list');
const emptyInventoryMessage = document.querySelector('.empty-inventory-message');
const sellAllButton = document.getElementById('sell-all-button');

// Balance displays
const currentBalanceDisplayMain = document.getElementById('current-balance'); // Main balance on game page
const currentBalanceDisplayHeader = document.getElementById('current-balance-header-game-page'); // Header balance on game page

// Single Sell Modal elements
const sellModalOverlay = document.getElementById('sell-modal-overlay');
const modalCardTitle = document.getElementById('modal-card-title');
const modalCardImage = document.getElementById('modal-card-image');
const modalCardRarity = document.getElementById('modal-card-rarity');
const modalCardValue = document.getElementById('modal-card-value');
const modalCardMaxCount = document.getElementById('modal-card-max-count');
const sellQuantityInput = document.getElementById('sell-quantity');
const modalPotentialEarnings = document.getElementById('modal-potential-earnings');
const confirmSellButton = document.getElementById('confirm-sell-button');
const cancelSellButton = document.getElementById('cancel-sell-button');

// Sell All Modal elements
const sellAllModalOverlay = document.getElementById('sell-all-modal-overlay');
const sellAllPotentialEarnings = document.getElementById('sell-all-potential-earnings');
const sellAllCardsList = document.getElementById('sell-all-cards-list');
const confirmSellAllButton = document.getElementById('confirm-sell-all-button');
const cancelSellAllButton = document.getElementById('cancel-sell-all-button');

let animationInterval; // To store the interval ID for the rolling animation
let allCardImages = []; // To store all card image URLs fetched from the server for animation
let rolledCardsInventory = {}; // Use an object (map) to store cards by ID and their count
let currentBalance = 0.00; // Initialized by loading from server or localStorage

let cardToSell = null; // Stores the card object currently being sold
let hasRolledInitially = false; // Flag to track if the user has attempted a roll at least once

// Function to save user data (balance and inventory) to the server
async function saveUserData() {
    try {
        const response = await fetch('http://localhost:3000/api/save-user-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                balance: currentBalance,
                inventory: rolledCardsInventory
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('User data saved to server:', data.message);
        localStorage.setItem('dvms_current_balance', currentBalance.toFixed(2)); // Also save to localStorage as a robust fallback
        localStorage.setItem('dvms_rolled_cards_inventory', JSON.stringify(rolledCardsInventory));
    } catch (error) {
        console.error('Error saving user data to server:', error);
        // Fallback to localStorage if server save fails
        localStorage.setItem('dvms_current_balance', currentBalance.toFixed(2));
        localStorage.setItem('dvms_rolled_cards_inventory', JSON.stringify(rolledCardsInventory));
    }
}

// Function to load user data (balance and inventory) from the server
async function loadUserData() {
    try {
        const response = await fetch('http://localhost:3000/api/user-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();
        currentBalance = userData.balance || 0.00;
        rolledCardsInventory = userData.inventory || {};
        console.log('User data loaded from server:', { balance: currentBalance, inventory: rolledCardsInventory });
        updateBalanceDisplay(); // Update UI with loaded balance
        renderInventory(); // Update UI with loaded inventory
        localStorage.setItem('dvms_current_balance', currentBalance.toFixed(2)); // Keep localStorage in sync
        localStorage.setItem('dvms_rolled_cards_inventory', JSON.stringify(rolledCardsInventory));
    } catch (error) {
        console.error('Error loading user data from server:', error);
        // Fallback to localStorage if server load fails
        currentBalance = parseFloat(localStorage.getItem('dvms_current_balance')) || 0.00;
        rolledCardsInventory = JSON.parse(localStorage.getItem('dvms_rolled_cards_inventory')) || {};
        console.log('Falling back to localStorage for user data.');
        updateBalanceDisplay();
        renderInventory();
    }
}

// Function to update all balance displays and trigger save
function updateBalanceDisplay() {
    const formattedBalance = currentBalance.toFixed(2);
    if (currentBalanceDisplayMain) {
        currentBalanceDisplayMain.textContent = `$${formattedBalance}`;
    }
    if (currentBalanceDisplayHeader) {
        currentBalanceDisplayHeader.textContent = `$${formattedBalance}`;
    }
    saveUserData(); // Trigger save to server (and localStorage fallback)
    
    // Dispatch a custom event so other pages (like index.html) can update their balance display
    window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { newBalance: currentBalance }
    }));
}

// Function to fetch all card images initially for the animation
async function fetchAllCardsForAnimation() {
    console.log('Attempting to fetch all card images for animation...');
    try {
        const response = await fetch('http://localhost:3000/api/cards-images');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allCardImages = await response.json();
        console.log('All card images loaded for animation:', allCardImages.length, allCardImages);
        if (allCardImages.length === 0) {
            if (cardInfoDisplay) {
                console.warn('No card images received from server. Rolling might not work as expected.');
                cardInfoDisplay.innerHTML = "<p style='color: orange;'>Warning: No card images loaded. Check server data.</p>";
            }
        }
    } catch (error) {
        console.error('Error fetching cards for animation:', error);
        allCardImages = [{ image: "https://placehold.co/220x308/FF0000/FFFFFF?text=Error+Loading" }];
        if (cardInfoDisplay) {
            cardInfoDisplay.innerHTML = "<p style='color: red;'>Error loading card images for animation. Ensure server is running.</p>";
        }
    }
}

// Function to start the rolling animation
function startRollingAnimation() {
    console.log('startRollingAnimation called.');
    if (allCardImages.length === 0) {
        if (cardInfoDisplay) {
            cardInfoDisplay.innerHTML = "<p>No cards to roll. Please check server logs or card data.</p>";
        }
        if (rollButton) rollButton.disabled = false;
        return;
    }

    if (!hasRolledInitially && rollingCardImage && rollingCardImage.parentElement) {
        rollingCardImage.parentElement.classList.add('hide-placeholder');
        hasRolledInitially = true;
    }
    
    if (rollingCardImage) {
        rollingCardImage.classList.remove('landed');
        rollingCardImage.classList.add('rolling');
        rollingCardImage.src = ''; 
        rollingCardImage.style.opacity = 0; 
    }

    if (cardInfoDisplay) cardInfoDisplay.innerHTML = "<p>Rolling...</p>";
    if (rollButton) rollButton.disabled = true;
    if (sellAllButton) sellAllButton.disabled = true;

    let lastIndex = -1;

    animationInterval = setInterval(() => {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * allCardImages.length);
        } while (randomIndex === lastIndex && allCardImages.length > 1);
        
        if (rollingCardImage) {
            rollingCardImage.src = allCardImages[randomIndex].image;
            rollingCardImage.style.opacity = 1;
        }
        lastIndex = randomIndex;

    }, 100);
}

// Function to add a card to the inventory and update the display
function addCardToInventory(card) {
    if (rolledCardsInventory[card.id]) {
        rolledCardsInventory[card.id].count++;
    } else {
        rolledCardsInventory[card.id] = { ...card, count: 1 };
    }

    renderInventory();
    saveUserData(); // Trigger save to server (and localStorage fallback)
    if (sellAllButton) sellAllButton.disabled = Object.keys(rolledCardsInventory).length === 0;
}

// Function to render the inventory list
function renderInventory() {
    if (!inventoryList) {
        console.error("inventoryList element not found. Cannot render inventory.");
        return;
    }
    inventoryList.innerHTML = '';

    const cardsArray = Object.values(rolledCardsInventory);

    if (cardsArray.length === 0) {
        if (emptyInventoryMessage) {
            if (!inventoryList.contains(emptyInventoryMessage)) {
                inventoryList.appendChild(emptyInventoryMessage);
            }
            inventoryList.classList.add('empty-state');
            emptyInventoryMessage.style.display = 'flex';
        }
    } else {
        if (emptyInventoryMessage) {
            emptyInventoryMessage.style.display = 'none';
        }
        inventoryList.classList.remove('empty-state');
        cardsArray.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('inventory-card');

            const imgElement = document.createElement('img');
            imgElement.src = card.image;
            imgElement.alt = card.title;
            imgElement.onerror = function() {
                this.onerror = null;
                this.src = 'https://placehold.co/90x126/444444/FFFFFF?text=No+Image';
            };

            const titleElement = document.createElement('p');
            titleElement.classList.add('card-title');
            titleElement.textContent = card.title;

            const rarityElement = document.createElement('p');
            rarityElement.textContent = card.rarity;

            const valueElement = document.createElement('p');
            valueElement.textContent = `$${card.value.toFixed(2)}`;

            const sellButton = document.createElement('button');
            sellButton.classList.add('sell-single-button');
            sellButton.textContent = 'Sell';
            sellButton.dataset.cardId = card.id;
            sellButton.addEventListener('click', () => openSellModal(card.id));

            cardElement.appendChild(imgElement);
            cardElement.appendChild(titleElement);
            cardElement.appendChild(rarityElement);
            cardElement.appendChild(valueElement);

            if (card.count > 1) {
                const countElement = document.createElement('div');
                countElement.classList.add('card-count');
                countElement.textContent = `x${card.count}`;
                cardElement.appendChild(countElement);
            }
            cardElement.appendChild(sellButton);

            inventoryList.appendChild(cardElement);
        });
    }
}


// Function to stop the rolling animation and display the final card
async function stopRollingAnimationAndDisplayCard() {
    console.log('stopRollingAnimationAndDisplayCard called.');
    clearInterval(animationInterval);
    if (rollingCardImage) rollingCardImage.classList.remove('rolling');

    try {
        const response = await fetch('http://localhost:3000/roll', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const rolledCard = data.card;

        if (rolledCard) {
            if (rollingCardImage) {
                rollingCardImage.src = rolledCard.image;
                rollingCardImage.alt = rolledCard.title;
                rollingCardImage.classList.add('landed');
                rollingCardImage.style.opacity = 1;
            }

            if (cardInfoDisplay) {
                cardInfoDisplay.innerHTML = `
                    <p>You rolled: <strong>${rolledCard.title}</strong></p>
                    <p>Rarity: <strong>${rolledCard.rarity}</strong></p>
                    <p>Value: $${rolledCard.value.toFixed(2)}</p>
                `;
            }
            addCardToInventory(rolledCard);
        } else {
            if (cardInfoDisplay) {
                cardInfoDisplay.innerHTML = "<p>Failed to roll a card. No card data received.</p>";
            }
            if (rollingCardImage) {
                rollingCardImage.src = "https://placehold.co/220x308/FF0000/FFFFFF?text=Error";
                rollingCardImage.style.opacity = 1;
            }
        }

    } catch (error) {
        console.error('Error fetching rolled card:', error);
        if (cardInfoDisplay) {
            cardInfoDisplay.innerHTML = "<p>Error: Could not connect to server or roll card. Check server status.</p>";
        }
        if (rollingCardImage) {
            rollingCardImage.src = "https://placehold.co/220x308/FF0000/FFFFFF?text=Error";
            rollingCardImage.style.opacity = 1;
        }
    } finally {
        if (rollButton) rollButton.disabled = false;
        if (sellAllButton) sellAllButton.disabled = Object.keys(rolledCardsInventory).length === 0;
    }
}

// --- Single Sell Functionality ---

function openSellModal(cardId) {
    cardToSell = rolledCardsInventory[cardId];
    if (!cardToSell) return;

    if (modalCardTitle) modalCardTitle.textContent = cardToSell.title;
    if (modalCardImage) {
        modalCardImage.src = cardToSell.image;
        modalCardImage.alt = cardToSell.title;
    }
    if (modalCardRarity) modalCardRarity.textContent = cardToSell.rarity;
    if (modalCardValue) modalCardValue.textContent = cardToSell.value.toFixed(2);
    if (modalCardMaxCount) modalCardMaxCount.textContent = cardToSell.count;

    if (sellQuantityInput) {
        sellQuantityInput.value = 1;
        sellQuantityInput.max = cardToSell.count;
        sellQuantityInput.min = 1;
    }

    if (modalPotentialEarnings && sellQuantityInput) {
        modalPotentialEarnings.textContent = (cardToSell.value * parseInt(sellQuantityInput.value)).toFixed(2);
    }

    if (sellModalOverlay) sellModalOverlay.classList.add('active');
}

function closeSellModal() {
    if (sellModalOverlay) sellModalOverlay.classList.remove('active');
    cardToSell = null;
}

if (sellQuantityInput) {
    sellQuantityInput.addEventListener('input', () => {
        const quantity = parseInt(sellQuantityInput.value);
        if (isNaN(quantity) || quantity < 1) {
            sellQuantityInput.value = 1;
        } else if (quantity > cardToSell.count) {
            sellQuantityInput.value = cardToSell.count;
        }
        if (modalPotentialEarnings) {
            modalPotentialEarnings.textContent = (cardToSell.value * parseInt(sellQuantityInput.value)).toFixed(2);
        }
    });
}

if (confirmSellButton) {
    confirmSellButton.addEventListener('click', () => {
        const quantityToSell = parseInt(sellQuantityInput.value);
        if (cardToSell && quantityToSell > 0 && quantityToSell <= cardToSell.count) {
            const earnings = cardToSell.value * quantityToSell;
            currentBalance += earnings;
            updateBalanceDisplay(); // This will trigger saveUserData()

            rolledCardsInventory[cardToSell.id].count -= quantityToSell;
            if (rolledCardsInventory[cardToSell.id].count <= 0) {
                delete rolledCardsInventory[cardToSell.id];
            }
            renderInventory();
            saveUserData(); // Ensure inventory is saved after modification
            closeSellModal();
            if (sellAllButton) sellAllButton.disabled = Object.keys(rolledCardsInventory).length === 0;
        }
    });
}

if (cancelSellButton) {
    cancelSellButton.addEventListener('click', closeSellModal);
}


// --- Sell All Functionality ---

function openSellAllModal() {
    const cardsArray = Object.values(rolledCardsInventory);
    if (cardsArray.length === 0) {
        return;
    }

    let totalEarnings = 0;
    if (sellAllCardsList) sellAllCardsList.innerHTML = '';

    cardsArray.forEach(card => {
        const cardValue = card.value * card.count;
        totalEarnings += cardValue;

        const p = document.createElement('p');
        p.textContent = `${card.title} (x${card.count}) - $${cardValue.toFixed(2)}`;
        if (sellAllCardsList) sellAllCardsList.appendChild(p);
    });

    if (sellAllPotentialEarnings) sellAllPotentialEarnings.textContent = totalEarnings.toFixed(2);
    if (sellAllModalOverlay) sellAllModalOverlay.classList.add('active');
}

function closeSellAllModal() {
    if (sellAllModalOverlay) sellAllModalOverlay.classList.remove('active');
}

if (confirmSellAllButton) {
    confirmSellAllButton.addEventListener('click', () => {
        let totalEarnings = 0;
        for (const cardId in rolledCardsInventory) {
            totalEarnings += rolledCardsInventory[cardId].value * rolledCardsInventory[cardId].count;
        }

        currentBalance += totalEarnings;
        rolledCardsInventory = {};
        updateBalanceDisplay(); // This will trigger saveUserData()
        renderInventory();
        saveUserData(); // Ensure inventory is saved after modification
        closeSellAllModal();
        if (sellAllButton) sellAllButton.disabled = true;
    });
}

if (cancelSellAllButton) {
    cancelSellAllButton.addEventListener('click', closeSellAllModal);
}


// Event listeners for buttons
if (rollButton) {
    rollButton.addEventListener('click', () => {
        startRollingAnimation();
        setTimeout(stopRollingAnimationAndDisplayCard, 3000);
    });
}

if (sellAllButton) {
    sellAllButton.addEventListener('click', openSellAllModal);
}

// Initial setup when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Load user data from the server (db.json)
    loadUserData();
    // Fetch all card images for animation
    fetchAllCardsForAnimation();
});
