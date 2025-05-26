// public/script.js

// *** IMPORTANT: This is your Railway application's base URL ***
const BASE_URL = 'https://dvms.up.railway.app';
// ************************************************************

// DOM Elements - Ensure these IDs match your HTML exactly!
const balanceDisplay = document.getElementById('balance-display'); // Used for header balance
const rollButton = document.getElementById('roll-button');
const inventoryContainer = document.getElementById('inventory-container');
const cardDisplay = document.getElementById('card-display'); // Container for the single displayed card
const cardImage = document.getElementById('card-image'); // Image within cardDisplay
const cardTitle = document.getElementById('card-title');
const cardRarity = document.getElementById('card-rarity');
const cardValue = document.getElementById('card-value');
const rarityRibbon = document.getElementById('rarity-ribbon');
const rollingCardAnimation = document.getElementById('rolling-card-animation'); // Container for the rolling animation
const backButton = document.getElementById('back-button');
const sellCardButton = document.getElementById('sell-card-button');
const openPackButton = document.getElementById('open-pack-button');
const cardValueDisplay = document.getElementById('card-value-display');
const cardValueDescription = document.getElementById('card-value-description');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmSellButton = document.getElementById('confirm-sell-button');
const cancelSellButton = document.getElementById('cancel-sell-button');
const closeConfirmationModal = document.querySelector('#confirmation-modal .close-button'); // Selector for the close button within the modal

// Game State
let userBalance = 0.00;
let userInventory = {};
let currentRolledCard = null; // To store the card that was just rolled
let cardsForAnimation = []; // Array of all card images for the rolling animation

// --- Utility Functions ---

function formatCurrency(amount) {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function updateBalanceDisplay() {
    if (balanceDisplay) { // Check if element exists before updating
        balanceDisplay.textContent = `${formatCurrency(userBalance)}`;
    }
    // If you have a separate balance display for the bottom section, update it too
    const balanceDisplayBottom = document.getElementById('balance-display-bottom');
    if (balanceDisplayBottom) {
        balanceDisplayBottom.textContent = `${formatCurrency(userBalance)}`;
    }
    saveUserData(); // Save balance whenever it updates
}

function updateInventoryDisplay() {
    if (!inventoryContainer) {
        console.error("Inventory container not found in HTML.");
        return;
    }
    inventoryContainer.innerHTML = ''; // Clear existing inventory
    const sortedInventory = Object.values(userInventory).sort((a, b) => {
        // Sort by rarity: Legendary > Epic > Rare > Uncommon > Common
        const rarityOrder = { 'Legendary': 5, 'Epic': 4, 'Rare': 3, 'Uncommon': 2, 'Common': 1 };
        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });

    if (sortedInventory.length === 0) {
        inventoryContainer.innerHTML = '<p class="empty-inventory-message">Roll a card to start your collection!</p>';
        return;
    }

    sortedInventory.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('inventory-card');
        cardElement.classList.add(card.rarity.toLowerCase()); // Add rarity class for styling

        // Add count overlay if more than one
        let countOverlay = '';
        if (card.count && card.count > 1) {
            countOverlay = `<div class="card-count-overlay">${card.count}</div>`;
        }

        cardElement.innerHTML = `
            ${countOverlay}
            <img src="${card.image}" alt="${card.title}" class="inventory-card-image">
            <div class="inventory-card-info">
                <span class="inventory-card-title">${card.title}</span>
                <span class="inventory-card-rarity ${card.rarity.toLowerCase()}">${card.rarity}</span>
                <span class="inventory-card-value">Value: ${formatCurrency(card.value)}</span>
            </div>
        `;
        cardElement.addEventListener('click', () => displayCardDetails(card));
        inventoryContainer.appendChild(cardElement);
    });
}

function displayCardDetails(card) {
    if (!cardDisplay || !cardImage || !cardTitle || !cardRarity || !cardValue || !rarityRibbon || !cardValueDisplay || !cardValueDescription || !rollButton || !openPackButton || !backButton || !sellCardButton) {
        console.error("One or more required DOM elements for card display are missing in HTML.");
        return;
    }

    cardImage.src = card.image;
    cardImage.alt = card.title;
    cardTitle.textContent = card.title;
    cardRarity.textContent = card.rarity;
    cardRarity.className = `card-rarity ${card.rarity.toLowerCase()}`; // Update class for styling
    cardValue.textContent = `Value: ${formatCurrency(card.value)}`;
    rarityRibbon.className = `rarity-ribbon ${card.rarity.toLowerCase()}`;

    currentRolledCard = card; // Set the current card for potential selling

    // Show/hide sell button based on card count
    if (userInventory[card.id] && userInventory[card.id].count > 0) {
        sellCardButton.style.display = 'block';
    } else {
        sellCardButton.style.display = 'none'; // Should not happen if coming from inventory
    }

    // Hide roll button, show back and sell buttons
    rollButton.style.display = 'none';
    openPackButton.style.display = 'none'; // Hide open pack button
    backButton.style.display = 'block';
    cardDisplay.style.display = 'block';
    cardValueDisplay.style.display = 'flex'; // Show card value specific details
    cardValueDescription.textContent = 'This card can be sold for its listed value.';

    rollingCardAnimation.style.display = 'none'; // Hide animation when displaying details
    // cardDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to card (optional)
}


// --- Server Communication ---

async function loadUserData() {
    try {
        const response = await fetch(`${BASE_URL}/api/user-data`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        userBalance = data.balance;
        // Ensure inventory is an object, converting from Map if necessary (from Mongoose)
        userInventory = data.inventory ? (data.inventory instanceof Object && !Array.isArray(data.inventory) ? data.inventory : Object.fromEntries(new Map(Object.entries(data.inventory)))) : {};
        updateBalanceDisplay();
        updateInventoryDisplay();
        console.log("User data loaded from server.");
    } catch (error) {
        console.error('Error loading user data from server:', error);
        console.warn("Falling back to localStorage for user data.");
        // Fallback to localStorage if server fails
        const storedBalance = localStorage.getItem('userBalance');
        const storedInventory = localStorage.getItem('userInventory');
        userBalance = storedBalance ? parseFloat(storedBalance) : 0.00;
        userInventory = storedInventory ? JSON.parse(storedInventory) : {};
        updateBalanceDisplay();
        updateInventoryDisplay();
    }
}

async function saveUserData() {
    try {
        const response = await fetch(`${BASE_URL}/api/save-user-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ balance: userBalance, inventory: userInventory }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log("User data saved to server:", result.message);
    } catch (error) {
        console.error('Error saving user data to server:', error);
        console.warn("Could not save to server. Data might be lost on refresh if not in localStorage.");
        // Fallback to localStorage if server fails
        localStorage.setItem('userBalance', userBalance);
        localStorage.setItem('userInventory', JSON.stringify(userInventory));
    }
}

async function fetchAllCardsForAnimation() {
    try {
        const response = await fetch(`${BASE_URL}/api/cards-images`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        cardsForAnimation = data;
        console.log("Cards for animation loaded.");
    } catch (error) {
        console.error('Error fetching cards for animation:', error);
        // Fallback to local placeholders if server fails for animation cards
        cardsForAnimation = [
            { id: 'placeholder1', image: 'https://placehold.co/220x308/CCCCCC/000000?text=Card+1' },
            { id: 'placeholder2', image: 'https://placehold.co/220x308/AAAAAA/FFFFFF?text=Card+2' },
            { id: 'placeholder3', image: 'https://placehold.co/220x308/DDDDDD/333333?text=Card+3' }
        ];
    }
}


// --- Game Logic ---

function showConfirmationModal() {
    if (!confirmationModal) {
        console.error("Confirmation modal not found in HTML.");
        return;
    }
    // Update modal content before showing if needed (e.g., card title/value)
    const modalConfirmCardTitle = document.getElementById('modal-confirm-card-title');
    const modalConfirmCardValue = document.getElementById('modal-confirm-card-value');
    if (modalConfirmCardTitle && modalConfirmCardValue && currentRolledCard) {
        modalConfirmCardTitle.textContent = currentRolledCard.title;
        modalConfirmCardValue.textContent = formatCurrency(currentRolledCard.value);
    }

    confirmationModal.style.display = 'block';
}

function hideConfirmationModal() {
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
    }
}

function sellCard() {
    if (!currentRolledCard) {
        console.error("No card selected to sell.");
        return;
    }
    showConfirmationModal();
}

async function confirmSellCard() {
    hideConfirmationModal();

    const cardIdToSell = currentRolledCard.id;

    if (userInventory[cardIdToSell] && userInventory[cardIdToSell].count > 0) {
        userBalance += currentRolledCard.value;
        userInventory[cardIdToSell].count--;

        if (userInventory[cardIdToSell].count <= 0) {
            delete userInventory[cardIdToSell]; // Remove if count is zero
        }
        updateBalanceDisplay();
        updateInventoryDisplay(); // Update inventory display after selling

        console.log(`Sold ${currentRolledCard.title} for ${formatCurrency(currentRolledCard.value)}.`);
        alert(`You sold ${currentRolledCard.title} for ${formatCurrency(currentRolledCard.value)}!`);

        // Hide card details and return to main view
        backToMainView();
    } else {
        alert("You don't have this card to sell!");
    }
}

async function startRollingAnimation() {
    if (!rollButton || !openPackButton || !cardDisplay || !rollingCardAnimation || !backButton || !sellCardButton) {
        console.error("One or more required DOM elements for rolling animation are missing in HTML.");
        return; // Prevent further execution if critical elements are missing
    }

    if (cardsForAnimation.length === 0) {
        console.warn("Cards for animation not loaded yet. Trying to fetch them again.");
        await fetchAllCardsForAnimation();
        if (cardsForAnimation.length === 0) {
            alert("Cannot start roll: Card data not available.");
            return;
        }
    }

    console.log("startRollingAnimation called.");
    rollButton.disabled = true; // Disable button during animation
    openPackButton.disabled = true;

    // Reset card display to hide previous card details
    cardDisplay.style.display = 'none';
    cardValueDisplay.style.display = 'none'; // Hide value details
    backButton.style.display = 'none';
    sellCardButton.style.display = 'none';

    rollingCardAnimation.style.display = 'flex'; // Show animation container

    // Start a continuous loop of random card images
    let animationInterval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * cardsForAnimation.length);
        rollingCardAnimation.innerHTML = `<img src="${cardsForAnimation[randomIndex].image}" class="rolling-card-image" alt="Rolling Card">`;
    }, 100); // Change image every 100ms

    // Stop animation after a few seconds and display the rolled card
    setTimeout(() => {
        clearInterval(animationInterval);
        stopRollingAnimationAndDisplayCard();
    }, 3000); // Roll for 3 seconds
}

async function stopRollingAnimationAndDisplayCard() {
    console.log("stopRollingAnimationAndDisplayCard called.");
    if (!cardImage || !cardTitle || !cardRarity || !cardValue || !rarityRibbon || !rollingCardAnimation || !cardDisplay || !cardValueDisplay || !cardValueDescription || !rollButton || !openPackButton || !backButton || !sellCardButton) {
        console.error("One or more required DOM elements for card display after roll are missing in HTML.");
        return; // Prevent further execution if critical elements are missing
    }

    try {
        const response = await fetch(`${BASE_URL}/roll`, { method: 'POST' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const rolledCard = data.card;

        currentRolledCard = rolledCard; // Store the rolled card for potential selling

        // Update card display
        cardImage.src = rolledCard.image;
        cardImage.alt = rolledCard.title;
        cardTitle.textContent = rolledCard.title;
        cardRarity.textContent = rolledCard.rarity;
        cardRarity.className = `card-rarity ${rolledCard.rarity.toLowerCase()}`; // Add rarity class for styling
        cardValue.textContent = `Value: ${formatCurrency(rolledCard.value)}`;
        rarityRibbon.className = `rarity-ribbon ${rolledCard.rarity.toLowerCase()}`; // Add rarity class to ribbon

        // Add to inventory
        if (userInventory[rolledCard.id]) {
            userInventory[rolledCard.id].count++;
        } else {
            userInventory[rolledCard.id] = { ...rolledCard, count: 1 };
        }
        updateInventoryDisplay(); // Update inventory display with the new card

        // Hide animation, show card details
        rollingCardAnimation.style.display = 'none';
        cardDisplay.style.display = 'block';
        cardValueDisplay.style.display = 'flex'; // Show card value specific details
        cardValueDescription.textContent = 'This card has been added to your inventory!';

        // Show relevant buttons
        rollButton.disabled = false; // Enable roll button again
        openPackButton.disabled = false;
        backButton.style.display = 'block';
        sellCardButton.style.display = 'block'; // Show sell button for the just rolled card
        // cardDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to card (optional)

        saveUserData(); // Save inventory after a roll
    } catch (error) {
        console.error('Error fetching rolled card:', error);
        alert('Failed to roll a card. Please try again.');
        rollButton.disabled = false;
        openPackButton.disabled = false;
        rollingCardAnimation.style.display = 'none'; // Hide animation on error
    }
}

function backToMainView() {
    if (!cardDisplay || !cardValueDisplay || !rollButton || !openPackButton || !backButton || !sellCardButton) {
        console.error("One or more required DOM elements for main view are missing in HTML.");
        return;
    }
    cardDisplay.style.display = 'none'; // Hide the single card display
    cardValueDisplay.style.display = 'none'; // Hide card value specific details
    rollButton.style.display = 'block'; // Show roll button
    openPackButton.style.display = 'block'; // Show open pack button
    backButton.style.display = 'none'; // Hide back button
    sellCardButton.style.display = 'none'; // Hide sell button
    currentRolledCard = null; // Clear the current rolled card
    updateInventoryDisplay(); // Refresh inventory display
}

// --- Event Listeners ---
// Add null checks for elements before adding event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (rollButton) rollButton.addEventListener('click', startRollingAnimation);
    if (openPackButton) openPackButton.addEventListener('click', startRollingAnimation);
    if (backButton) backButton.addEventListener('click', backToMainView);
    if (sellCardButton) sellCardButton.addEventListener('click', sellCard);
    if (confirmSellButton) confirmSellButton.addEventListener('click', confirmSellCard);
    if (cancelSellButton) cancelSellButton.addEventListener('click', hideConfirmationModal);
    if (closeConfirmationModal) closeConfirmationModal.addEventListener('click', hideConfirmationModal);
    if (confirmationModal) {
        window.addEventListener('click', (event) => {
            if (event.target == confirmationModal) {
                hideConfirmationModal();
            }
        });
    }

    loadUserData(); // Load user data first
    fetchAllCardsForAnimation(); // Load all cards for the animation
});
