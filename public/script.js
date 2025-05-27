document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and Configuration ---
    const MAX_BALANCE = 1000000; // Max balance for the game
    const MIN_BALANCE_FOR_ROLL = 25; // Minimum balance required to roll a card
    const INITIAL_BALANCE = 100; // Starting balance for new players
    const MAX_ROLLS_PER_HOUR = 10; // Max rolls allowed within one hour
    const COOLDOWN_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

    // Card data (simplified for example)
    const cards = [
        { name: "Common Card A", rarity: "common", value: 10, image: "card_common_a.png" },
        { name: "Common Card B", rarity: "common", value: 12, image: "card_common_b.png" },
        { name: "Common Card C", rarity: "common", value: 15, image: "card_common_c.png" },
        { name: "Uncommon Card X", rarity: "uncommon", value: 25, image: "card_uncommon_x.png" },
        { name: "Uncommon Card Y", rarity: "uncommon", value: 30, image: "card_uncommon_y.png" },
        { name: "Rare Card P", rarity: "rare", value: 75, image: "card_rare_p.png" },
        { name: "Rare Card Q", rarity: "rare", value: 100, image: "card_rare_q.png" },
        { name: "Epic Card M", rarity: "epic", value: 250, image: "card_epic_m.png" },
        { name: "Legendary Card Z", rarity: "legendary", value: 1000, image: "card_legendary_z.png" }
    ];

    // Rarity distribution percentages (sum should be 100)
    const rarityDistribution = {
        common: 60,
        uncommon: 25,
        rare: 10,
        epic: 4,
        legendary: 1
    };

    // --- DOM Elements ---
    const balanceDisplayElements = document.querySelectorAll('#header-balance, #current-balance');
    const rollButton = document.getElementById('roll-button');
    const cardDisplay = document.getElementById('card-display');
    const cardImage = cardDisplay.querySelector('.card-image');
    const cardName = document.getElementById('card-display').querySelector('h3');
    const cardRarity = document.getElementById('card-display').querySelector('.card-rarity');
    const cardValue = document.getElementById('card-display').querySelector('.card-value');
    const rollingCardAnimation = document.getElementById('rolling-card-animation');
    const rollOutcomeMessage = document.getElementById('roll-outcome-message');
    const totalValueDisplay = document.getElementById('total-value-display');
    const inventoryList = document.getElementById('inventory-list');
    const sellAllCommonButton = document.getElementById('sell-all-common-button');
    const emptyInventoryMessage = document.querySelector('.empty-inventory-message');

    // Modals
    const sellModalOverlay = document.getElementById('sell-modal-overlay');
    const closeSellModalButton = document.getElementById('close-sell-modal');
    const modalCardImage = document.getElementById('sell-modal-card-image');
    const modalCardName = document.getElementById('modal-card-name');
    const modalCardRarity = document.getElementById('modal-card-rarity');
    const modalCardValue = document.getElementById('modal-card-value');
    const confirmSellButton = document.getElementById('confirm-sell-button');
    const cancelSellButton = document.getElementById('cancel-sell-button');

    const sellAllCommonModalOverlay = document.getElementById('sell-all-common-modal-overlay');
    const closeSellAllCommonModalButton = document.getElementById('close-sell-all-common-modal');
    const commonCardsToSellList = document.getElementById('common-cards-to-sell-list');
    const totalCommonSellValueSpan = document.getElementById('total-common-sell-value');
    const confirmSellAllCommonButton = document.getElementById('confirm-sell-all-common-button');
    const cancelSellAllCommonButton = document.getElementById('cancel-sell-all-common-button');

    const successModalOverlay = document.getElementById('success-modal-overlay');
    const closeSuccessModalButton = document.getElementById('close-success-modal');
    const successMessage = document.getElementById('success-message');

    // Roll Limit UI Elements
    const rollsRemainingSpan = document.getElementById('rolls-remaining');
    const maxRollsSpan = document.getElementById('max-rolls');
    const cooldownDisplaySpan = document.getElementById('cooldown-display');

    // --- Game State Variables (Persisted in localStorage) ---
    let balance = parseFloat(localStorage.getItem('balance')) || INITIAL_BALANCE;
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let rollsUsed = parseInt(localStorage.getItem('rollsUsed')) || 0;
    let cooldownEndTime = parseInt(localStorage.getItem('cooldownEndTime')) || 0; // Timestamp when cooldown ends

    let timerInterval; // To hold the setInterval for the cooldown timer

    // --- Helper Functions ---

    function saveGameState() {
        localStorage.setItem('balance', balance.toFixed(2));
        localStorage.setItem('inventory', JSON.stringify(inventory));
        localStorage.setItem('rollsUsed', rollsUsed);
        localStorage.setItem('cooldownEndTime', cooldownEndTime);
        updateBalanceDisplay();
        renderInventory();
    }

    function updateBalanceDisplay() {
        balanceDisplayElements.forEach(element => {
            element.textContent = balance.toFixed(2);
        });
    }

    function getRandomCard() {
        let randomNumber = Math.random() * 100;
        let selectedRarity = '';
        let cumulativePercentage = 0;

        for (const rarity in rarityDistribution) {
            cumulativePercentage += rarityDistribution[rarity];
            if (randomNumber <= cumulativePercentage) {
                selectedRarity = rarity;
                break;
            }
        }
        const availableCardsOfRarity = cards.filter(card => card.rarity === selectedRarity);
        return availableCardsOfRarity[Math.floor(Math.random() * availableCardsOfRarity.length)];
    }

    function addCardToInventory(card) {
        // Check if card already exists in inventory
        const existingCardIndex = inventory.findIndex(item => item.name === card.name && item.rarity === card.rarity);

        if (existingCardIndex > -1) {
            // If it exists, increment quantity
            inventory[existingCardIndex].quantity = (inventory[existingCardIndex].quantity || 1) + 1;
        } else {
            // If not, add new card with quantity 1
            inventory.push({ ...card, quantity: 1 });
        }
        saveGameState();
    }

    function removeCardFromInventory(cardName, rarity, quantityToRemove = 1) {
        const index = inventory.findIndex(item => item.name === cardName && item.rarity === rarity);
        if (index > -1) {
            if (inventory[index].quantity > quantityToRemove) {
                inventory[index].quantity -= quantityToRemove;
            } else {
                inventory.splice(index, 1);
            }
            saveGameState();
            return true;
        }
        return false;
    }

    function renderInventory() {
        inventoryList.innerHTML = ''; // Clear current inventory display
        if (inventory.length === 0) {
            emptyInventoryMessage.style.display = 'block';
            sellAllCommonButton.disabled = true; // Disable sell all if no cards
            return;
        } else {
            emptyInventoryMessage.style.display = 'none';
        }

        let hasCommonCards = false;
        inventory.sort((a, b) => {
            // Sort by rarity: Legendary, Epic, Rare, Uncommon, Common
            const rarityOrder = { "legendary": 5, "epic": 4, "rare": 3, "uncommon": 2, "common": 1 };
            return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        });

        inventory.forEach(card => {
            if (card.rarity === 'common') {
                hasCommonCards = true;
            }
            const cardElement = document.createElement('div');
            cardElement.classList.add('inventory-card');
            cardElement.innerHTML = `
                <img src="${card.image}" alt="${card.name}" class="inventory-card-image">
                <div class="inventory-card-info">
                    <span class="inventory-card-title">${card.name}</span>
                    <span class="inventory-card-rarity ${card.rarity}">${card.rarity}</span>
                </div>
                ${card.quantity > 1 ? `<span class="card-count-overlay">${card.quantity}</span>` : ''}
            `;
            cardElement.addEventListener('click', () => openSellModal(card));
            inventoryList.appendChild(cardElement);
        });

        sellAllCommonButton.disabled = !hasCommonCards; // Enable/disable based on common cards
    }

    // --- Roll Limit & Cooldown Functions ---

    function updateRollsDisplay() {
        maxRollsSpan.textContent = MAX_ROLLS_PER_HOUR;
        rollsRemainingSpan.textContent = MAX_ROLLS_PER_HOUR - rollsUsed;

        const now = Date.now();
        if (cooldownEndTime > now) {
            rollButton.disabled = true;
            const timeLeft = cooldownEndTime - now;
            cooldownDisplaySpan.textContent = formatTime(timeLeft);
            cooldownDisplaySpan.parentElement.style.display = 'flex'; // Show timer
        } else {
            rollButton.disabled = false;
            cooldownDisplaySpan.parentElement.style.display = 'none'; // Hide timer
            cooldownDisplaySpan.textContent = '00:00:00'; // Reset display
            clearInterval(timerInterval); // Stop any running timer
            if (rollsUsed >= MAX_ROLLS_PER_HOUR) {
                // If rolls were used up, but cooldown is over, reset
                resetRolls();
            }
        }
        // Ensure roll button is disabled if balance is too low
        if (balance < MIN_BALANCE_FOR_ROLL) {
            rollButton.disabled = true;
            rollOutcomeMessage.textContent = `You need $${MIN_BALANCE_FOR_ROLL.toFixed(2)} to roll.`;
            rollOutcomeMessage.style.color = '#e74c3c'; // Red for warning
        } else if (!rollButton.disabled) { // Only clear message if not disabled by cooldown
            rollOutcomeMessage.textContent = ''; // Clear previous message
        }
    }

    function startCooldown() {
        cooldownEndTime = Date.now() + COOLDOWN_DURATION_MS;
        saveGameState(); // Save the new cooldown end time
        updateRollsDisplay(); // Update display immediately
        clearInterval(timerInterval); // Clear any existing timer
        timerInterval = setInterval(() => {
            updateRollsDisplay();
            if (Date.now() >= cooldownEndTime) {
                clearInterval(timerInterval);
                resetRolls(); // Reset rolls when cooldown is over
                updateRollsDisplay(); // Update display after reset
            }
        }, 1000); // Update every second
    }

    function resetRolls() {
        rollsUsed = 0;
        cooldownEndTime = 0; // Clear cooldown
        saveGameState();
        updateRollsDisplay();
        rollOutcomeMessage.textContent = ''; // Clear any cooldown message
        rollOutcomeMessage.style.color = 'var(--stake-text-medium)';
    }

    function formatTime(ms) {
        if (ms <= 0) return "00:00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return [hours, minutes, seconds]
            .map(t => t.toString().padStart(2, '0'))
            .join(':');
    }

    // --- Game Logic Functions ---

    async function rollCard() {
        if (balance < MIN_BALANCE_FOR_ROLL) {
            showSuccessModal(`You need $${MIN_BALANCE_FOR_ROLL.toFixed(2)} to roll a card.`);
            return;
        }

        // Check roll limit
        if (rollsUsed >= MAX_ROLLS_PER_HOUR) {
            showSuccessModal('You have reached your roll limit. Please wait for the cooldown to end.');
            return;
        }

        // Disable roll button and update display
        rollButton.disabled = true;
        rollOutcomeMessage.textContent = 'Rolling...';
        rollOutcomeMessage.style.color = 'var(--stake-text-medium)';
        rollingCardAnimation.style.display = 'block'; // Show rolling animation
        cardDisplay.style.display = 'none'; // Hide static card display

        // Deduct roll cost and update UI
        balance -= MIN_BALANCE_FOR_ROLL;
        rollsUsed++; // Increment roll count
        saveGameState(); // Save state immediately after roll

        // If this is the first roll that hits 10, start the cooldown
        if (rollsUsed === MAX_ROLLS_PER_HOUR) {
            startCooldown();
        } else {
            updateRollsDisplay(); // Just update remaining rolls
        }

        // Simulate rolling time
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds animation

        const newCard = getRandomCard();
        addCardToInventory(newCard);

        rollingCardAnimation.style.display = 'none'; // Hide rolling animation
        cardDisplay.style.display = 'block'; // Show static card display

        // Update card display with new card info
        cardImage.src = newCard.image;
        cardName.textContent = newCard.name;
        cardRarity.textContent = newCard.rarity;
        cardRarity.className = `card-rarity ${newCard.rarity}`; // Update class for rarity color
        cardValue.textContent = newCard.value.toFixed(2);

        // Add reveal animation
        cardDisplay.classList.add('reveal-animation');
        cardDisplay.addEventListener('animationend', () => {
            cardDisplay.classList.remove('reveal-animation');
        }, { once: true });

        rollOutcomeMessage.textContent = `You got: ${newCard.name} (${newCard.rarity}) for $${newCard.value.toFixed(2)}!`;
        rollOutcomeMessage.style.color = newCard.rarity === 'legendary' ? 'var(--stake-green-primary)' : 'var(--stake-text-light)'; // Highlight legendary

        // Re-enable roll button only if cooldown isn't active
        if (cooldownEndTime <= Date.now()) {
            rollButton.disabled = false;
        }
    }

    // --- Modal Functions ---

    let currentSellingCard = null; // Store the card being sold

    function openSellModal(card) {
        currentSellingCard = card;
        modalCardImage.src = card.image;
        modalCardName.textContent = card.name;
        modalCardRarity.textContent = card.rarity;
        modalCardRarity.className = `card-rarity ${card.rarity}`; // Apply rarity class for color
        modalCardValue.textContent = card.value.toFixed(2);
        sellModalOverlay.classList.add('active');
    }

    function closeSellModal() {
        sellModalOverlay.classList.remove('active');
        currentSellingCard = null;
    }

    function confirmSell() {
        if (currentSellingCard) {
            if (removeCardFromInventory(currentSellingCard.name, currentSellingCard.rarity)) {
                balance = Math.min(MAX_BALANCE, balance + currentSellingCard.value);
                showSuccessModal(`Successfully sold ${currentSellingCard.name} for $${currentSellingCard.value.toFixed(2)}!`);
                saveGameState();
            } else {
                showSuccessModal('Error: Card not found in inventory.', false);
            }
            closeSellModal();
        }
    }

    function openSellAllCommonModal() {
        const commonCards = inventory.filter(card => card.rarity === 'common');
        if (commonCards.length === 0) {
            showSuccessModal('You have no common cards to sell.', false);
            return;
        }

        commonCardsToSellList.innerHTML = '';
        let totalValue = 0;

        commonCards.forEach(card => {
            const p = document.createElement('p');
            p.textContent = `${card.name} x${card.quantity || 1} ($${(card.value * (card.quantity || 1)).toFixed(2)})`;
            commonCardsToSellList.appendChild(p);
            totalValue += card.value * (card.quantity || 1);
        });

        totalCommonSellValueSpan.textContent = totalValue.toFixed(2);
        sellAllCommonModalOverlay.classList.add('active');
    }

    function closeSellAllCommonModal() {
        sellAllCommonModalOverlay.classList.remove('active');
    }

    function confirmSellAllCommon() {
        let totalSoldValue = 0;
        const commonCards = inventory.filter(card => card.rarity === 'common');

        // Remove common cards from inventory
        inventory = inventory.filter(card => {
            if (card.rarity === 'common') {
                totalSoldValue += card.value * (card.quantity || 1);
                return false; // Remove this card
            }
            return true; // Keep other cards
        });

        balance = Math.min(MAX_BALANCE, balance + totalSoldValue);
        saveGameState();
        showSuccessModal(`Sold all common cards for a total of $${totalSoldValue.toFixed(2)}!`);
        closeSellAllCommonModal();
    }

    function showSuccessModal(message, isSuccess = true) {
        successMessage.textContent = message;
        if (isSuccess) {
            successMessage.style.color = 'var(--stake-green-primary)';
        } else {
            successMessage.style.color = '#e74c3c'; // Red for errors/warnings
        }
        successModalOverlay.classList.add('active');
    }

    function closeSuccessModal() {
        successModalOverlay.classList.remove('active');
    }

    // --- Event Listeners ---
    rollButton.addEventListener('click', rollCard);
    sellAllCommonButton.addEventListener('click', openSellAllCommonModal);

    closeSellModalButton.addEventListener('click', closeSellModal);
    cancelSellButton.addEventListener('click', closeSellModal);
    confirmSellButton.addEventListener('click', confirmSell);

    closeSellAllCommonModalButton.addEventListener('click', closeSellAllCommonModal);
    cancelSellAllCommonButton.addEventListener('click', closeSellAllCommonModal);
    confirmSellAllCommonButton.addEventListener('click', confirmSellAllCommon);

    closeSuccessModalButton.addEventListener('click', closeSuccessModal);

    // --- Initial Load ---
    updateBalanceDisplay();
    renderInventory();
    updateRollsDisplay(); // Initial update for rolls and timer
    // If a cooldown is active from a previous session, restart the timer
    if (cooldownEndTime > Date.now()) {
        startCooldown();
    }
});
