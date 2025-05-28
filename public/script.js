document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and Configuration ---
    const MAX_BALANCE = 1000000; // Max balance for the game
    const MIN_BALANCE_FOR_ROLL = 0; // Cost to roll a card - SET TO 0 FOR FREE ROLLS!
    const INITIAL_BALANCE = 100; // Starting balance for new players
    const MAX_ROLLS_PER_HOUR = 10; // Max rolls allowed within one hour
    const COOLDOWN_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

    // Card data
    const cards = [
        { name: "Common Card A", rarity: "common", value: 10, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Common+A" },
        { name: "Common Card B", rarity: "common", value: 12, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Common+B" },
        { name: "Common Card C", rarity: "common", value: 15, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Common+C" },
        { name: "Uncommon Card X", rarity: "uncommon", value: 25, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Uncommon+X" },
        { name: "Uncommon Card Y", rarity: "uncommon", value: 30, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Uncommon+Y" },
        { name: "Rare Card P", rarity: "rare", value: 75, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Rare+P" },
        { name: "Rare Card Q", rarity: "rare", value: 100, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Rare+Q" },
        { name: "Epic Card M", rarity: "epic", value: 250, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Epic+M" },
        { name: "Legendary Card Z", rarity: "legendary", value: 1000, image: "https://placehold.co/220x308/1A1B1E/00E576?text=Legendary+Z" }
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
    const inventoryList = document.getElementById('inventory-list');
    const sellAllButton = document.getElementById('sell-all-button');

    // Modals
    const individualSellModalOverlay = document.getElementById('individual-sell-modal-overlay');
    const closeIndividualSellModalButton = document.getElementById('close-individual-sell-modal');
    const individualModalCardImage = document.getElementById('individual-sell-modal-card-image');
    const individualModalCardName = document.getElementById('individual-modal-card-name');
    const individualModalCardRarity = document.getElementById('individual-modal-card-rarity');
    const individualModalCardValue = document.getElementById('individual-modal-card-value');
    const individualModalCardAvailableQuantity = document.getElementById('individual-modal-card-available-quantity');
    const sellQuantityInput = document.getElementById('sell-quantity-input');
    const individualModalTotalValue = document.getElementById('individual-modal-total-value');
    const confirmIndividualSellButton = document.getElementById('confirm-individual-sell-button');
    const cancelIndividualSellButton = document.getElementById('cancel-individual-sell-button');

    const sellAllModalOverlay = document.getElementById('sell-all-modal-overlay');
    const closeSellAllModalButton = document.getElementById('close-sell-all-modal');
    const allCardsToSellList = document.getElementById('all-cards-to-sell-list');
    const totalAllSellValueSpan = document.getElementById('total-all-sell-value');
    const confirmSellAllButton = document.getElementById('confirm-sell-all-button');
    const cancelSellAllButton = document.getElementById('cancel-sell-all-button');

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
    let rollsUsed = parseInt(localStorage.getItem('rollsUsed') || '0', 10);
    let cooldownEndTime = parseInt(localStorage.getItem('cooldownEndTime') || '0', 10);

    let timerInterval; // To hold the setInterval for the cooldown timer
    let currentSellingCard = null;

    // --- Helper Functions ---

    function saveGameState() {
        localStorage.setItem('balance', balance.toFixed(2));
        localStorage.setItem('inventory', JSON.stringify(inventory));
        localStorage.setItem('rollsUsed', rollsUsed.toString());
        localStorage.setItem('cooldownEndTime', cooldownEndTime.toString());
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
        const existingCardIndex = inventory.findIndex(item => item.name === card.name && item.rarity === card.rarity);

        if (existingCardIndex > -1) {
            inventory[existingCardIndex].quantity = (inventory[existingCardIndex].quantity || 1) + 1;
        } else {
            inventory.push({ ...card, quantity: 1 });
        }
        saveGameState();
    }

    function removeCardFromInventory(cardName, rarity, quantityToRemove = 1) {
        const index = inventory.findIndex(item => item.name === cardName && item.rarity === rarity);
        if (index > -1) {
            if (inventory[index].quantity >= quantityToRemove) {
                inventory[index].quantity -= quantityToRemove;
                if (inventory[index].quantity <= 0) {
                    inventory.splice(index, 1);
                }
                saveGameState();
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    function renderInventory() {
        inventoryList.innerHTML = '';

        const sortedInventory = [...inventory].sort((a, b) => {
            const rarityOrder = { "legendary": 5, "epic": 4, "rare": 3, "uncommon": 2, "common": 1 };
            return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        });

        if (sortedInventory.length === 0) {
            emptyInventoryMessage.style.display = 'flex';
            inventoryList.classList.add('empty-state');
            sellAllButton.disabled = true;
            return;
        } else {
            emptyInventoryMessage.style.display = 'none';
            inventoryList.classList.remove('empty-state');
            sellAllButton.disabled = false;
        }

        sortedInventory.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('inventory-card');
            cardElement.innerHTML = `
                <img src="${card.image}" alt="${card.name}" class="inventory-card-image">
                <div class="inventory-card-info">
                    <span class="inventory-card-title">${card.name}</span>
                    <span class="inventory-card-rarity ${card.rarity}">${card.rarity}</span>
                </div>
                ${card.quantity > 1 ? `<span class="card-count-overlay">${card.quantity}</span>` : ''}
                <button class="inventory-card-sell-button" data-name="${card.name}" data-rarity="${card.rarity}">Sell ($${card.value.toFixed(2)})</button>
            `;
            const sellIndividualButton = cardElement.querySelector('.inventory-card-sell-button');
            sellIndividualButton.addEventListener('click', (event) => {
                event.stopPropagation();
                openIndividualSellModal(card);
            });
            inventoryList.appendChild(cardElement);
        });
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
            cooldownDisplaySpan.parentElement.style.display = 'flex';
            rollOutcomeMessage.textContent = 'Roll limit reached. Next roll in:';
            rollOutcomeMessage.style.color = '#e74c3c';
        } else {
            // Cooldown has passed or never active.
            // If rolls were previously maxed, reset them now.
            if (rollsUsed >= MAX_ROLLS_PER_HOUR) {
                resetRolls(); // This will also call saveGameState() and updateRollsDisplay()
            }
            rollButton.disabled = false;
            cooldownDisplaySpan.parentElement.style.display = 'none';
            cooldownDisplaySpan.textContent = '00:00:00';
            clearInterval(timerInterval);
            rollOutcomeMessage.textContent = '';
            rollOutcomeMessage.style.color = 'var(--stake-text-medium)';
        }
    }

    // New function to manage cooldown: start if needed, or just update timer
    function manageCooldown() {
        const now = Date.now();
        if (rollsUsed >= MAX_ROLLS_PER_HOUR && cooldownEndTime <= now) {
            // Only start a *new* cooldown if rolls are used up AND cooldown is not already active
            cooldownEndTime = now + COOLDOWN_DURATION_MS;
            saveGameState(); // Save the new cooldown end time
        }

        // Clear any existing interval to prevent multiple timers running
        clearInterval(timerInterval);

        // Always start or continue the countdown if cooldownEndTime is in the future
        if (cooldownEndTime > now) {
            timerInterval = setInterval(() => {
                const currentTime = Date.now();
                if (currentTime >= cooldownEndTime) {
                    clearInterval(timerInterval);
                    resetRolls(); // Reset rolls when cooldown is truly over
                    updateRollsDisplay(); // Update display after reset
                } else {
                    updateRollsDisplay(); // Keep updating the display
                }
            }, 1000); // Update every second
        }
        updateRollsDisplay(); // Initial display update
    }


    function resetRolls() {
        rollsUsed = 0;
        cooldownEndTime = 0; // Clear cooldown
        saveGameState(); // Save state after reset
        // updateRollsDisplay() is called by the caller or by saveGameState()
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
        // Check roll limit BEFORE attempting to roll
        if (rollsUsed >= MAX_ROLLS_PER_HOUR) {
            manageCooldown(); // Ensure cooldown is active if rolls are exhausted
            showSuccessModal('You have reached your roll limit. Please wait for the cooldown to end.', false);
            return;
        }

        // Check balance (optional, based on MIN_BALANCE_FOR_ROLL)
        if (balance < MIN_BALANCE_FOR_ROLL) {
            showSuccessModal(`You need at least $${MIN_BALANCE_FOR_ROLL.toFixed(2)} to roll a card.`, false);
            return;
        }

        // Deduct roll cost if any
        if (MIN_BALANCE_FOR_ROLL > 0) {
            balance -= MIN_BALANCE_FOR_ROLL;
            // Balance is saved by saveGameState at the end of function
        }

        // Disable roll button and update display
        rollButton.disabled = true;
        rollOutcomeMessage.textContent = 'Rolling...';
        rollOutcomeMessage.style.color = 'var(--stake-text-medium)';
        rollingCardAnimation.style.display = 'block';
        cardDisplay.style.display = 'none';

        rollsUsed++; // Increment roll count
        saveGameState(); // Save state immediately after roll (this updates rollsRemainingSpan)

        // If this roll hits the limit, ensure cooldown management is triggered
        if (rollsUsed >= MAX_ROLLS_PER_HOUR) {
            manageCooldown(); // This will start cooldown if it's not already running
        }


        // Simulate rolling time
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newCard = getRandomCard();
        addCardToInventory(newCard);

        rollingCardAnimation.style.display = 'none';
        cardDisplay.style.display = 'block';

        cardImage.src = newCard.image;
        cardName.textContent = newCard.name;
        cardRarity.textContent = newCard.rarity;
        cardRarity.className = `card-rarity ${newCard.rarity}`;
        cardValue.textContent = newCard.value.toFixed(2);

        const oldRibbon = cardDisplay.querySelector('.rarity-ribbon');
        if (oldRibbon) {
            oldRibbon.remove();
        }

        const rarityRibbon = document.createElement('div');
        rarityRibbon.classList.add('rarity-ribbon', newCard.rarity);
        rarityRibbon.textContent = newCard.rarity;
        cardDisplay.appendChild(rarityRibbon);

        cardDisplay.classList.add('reveal-animation');
        cardDisplay.addEventListener('animationend', () => {
            cardDisplay.classList.remove('reveal-animation');
        }, { once: true });

        rollOutcomeMessage.textContent = `You got: ${newCard.name} (${newCard.rarity}) for $${newCard.value.toFixed(2)}!`;
        rollOutcomeMessage.style.color = newCard.rarity === 'legendary' ? 'var(--stake-green-primary)' : 'var(--stake-text-light)';

        // Re-enable roll button only if cooldown is not active
        if (cooldownEndTime <= Date.now()) {
            rollButton.disabled = false;
        } else {
             // If cooldown is active, button should remain disabled, and timer will handle re-enabling
             // This is important because manageCooldown might have just started the cooldown
        }
    }

    // --- Individual Sell Modal Functions ---

    function openIndividualSellModal(card) {
        currentSellingCard = card;
        individualModalCardImage.src = card.image;
        individualModalCardName.textContent = card.name;
        individualModalCardRarity.textContent = card.rarity;
        individualModalCardRarity.className = `card-rarity ${card.rarity}`;
        individualModalCardValue.textContent = card.value.toFixed(2);
        individualModalCardAvailableQuantity.textContent = card.quantity;

        sellQuantityInput.value = 1;
        sellQuantityInput.max = card.quantity;
        updateIndividualSellTotalValue();

        individualSellModalOverlay.classList.add('active');
    }

    function closeIndividualSellModal() {
        individualSellModalOverlay.classList.remove('active');
        currentSellingCard = null;
    }

    function updateIndividualSellTotalValue() {
        const quantity = parseInt(sellQuantityInput.value, 10);
        const valuePerCard = currentSellingCard ? currentSellingCard.value : 0;
        individualModalTotalValue.textContent = (quantity * valuePerCard).toFixed(2);
    }

    function confirmIndividualSell() {
        if (!currentSellingCard) {
            showSuccessModal('Error: No card selected for selling.', false);
            closeIndividualSellModal();
            return;
        }

        const quantityToSell = parseInt(sellQuantityInput.value, 10);
        const availableQuantity = currentSellingCard.quantity;

        if (isNaN(quantityToSell) || quantityToSell <= 0 || quantityToSell > availableQuantity) {
            showSuccessModal(`Invalid quantity. Please enter a number between 1 and ${availableQuantity}.`, false);
            return;
        }

        if (removeCardFromInventory(currentSellingCard.name, currentSellingCard.rarity, quantityToSell)) {
            const totalValueSold = currentSellingCard.value * quantityToSell;
            balance = Math.min(MAX_BALANCE, balance + totalValueSold);
            showSuccessModal(`Successfully sold ${quantityToSell} x ${currentSellingCard.name} for $${totalValueSold.toFixed(2)}!`);
            saveGameState();
        } else {
            showSuccessModal('Error: Could not sell card(s). Not enough quantity or card not found.', false);
        }
        closeIndividualSellModal();
    }

    // --- Universal Sell All Modal Functions ---

    function openSellAllCardsModal() {
        if (inventory.length === 0) {
            showSuccessModal('Your inventory is empty. No cards to sell.', false);
            return;
        }

        allCardsToSellList.innerHTML = '';
        let totalValue = 0;

        inventory.forEach(card => {
            const p = document.createElement('p');
            p.textContent = `${card.name} (${card.rarity}) x${card.quantity || 1} ($${(card.value * (card.quantity || 1)).toFixed(2)})`;
            allCardsToSellList.appendChild(p);
            totalValue += card.value * (card.quantity || 1);
        });

        totalAllSellValueSpan.textContent = totalValue.toFixed(2);
        sellAllModalOverlay.classList.add('active');
    }

    function closeSellAllCardsModal() {
        sellAllModalOverlay.classList.remove('active');
    }

    function confirmSellAllCards() {
        let totalSoldValue = 0;
        if (inventory.length > 0) {
            inventory.forEach(card => {
                totalSoldValue += card.value * (card.quantity || 1);
            });
            inventory = [];
            balance = Math.min(MAX_BALANCE, balance + totalSoldValue);
            saveGameState();
            showSuccessModal(`Sold all cards for a total of $${totalSoldValue.toFixed(2)}!`);
        } else {
            showSuccessModal('No cards to sell.', false);
        }
        closeSellAllCardsModal();
    }

    // --- General Success Modal Function ---

    function showSuccessModal(message, isSuccess = true) {
        successMessage.textContent = message;
        if (isSuccess) {
            successMessage.style.color = 'var(--stake-green-primary)';
        } else {
            successMessage.style.color = '#e74c3c';
        }
        successModalOverlay.classList.add('active');
    }

    function closeSuccessModal() {
        successModalOverlay.classList.remove('active');
    }

    // --- Event Listeners ---
    rollButton.addEventListener('click', rollCard);
    sellAllButton.addEventListener('click', openSellAllCardsModal);

    // Individual Sell Modal Listeners
    closeIndividualSellModalButton.addEventListener('click', closeIndividualSellModal);
    cancelIndividualSellButton.addEventListener('click', closeIndividualSellModal);
    confirmIndividualSellButton.addEventListener('click', confirmIndividualSell);
    sellQuantityInput.addEventListener('input', updateIndividualSellTotalValue);

    // Universal Sell All Modal Listeners
    closeSellAllModalButton.addEventListener('click', closeSellAllCardsModal);
    cancelSellAllButton.addEventListener('click', closeSellAllCardsModal);
    confirmSellAllButton.addEventListener('click', confirmSellAllCards);

    // General Success Modal Listener
    closeSuccessModalButton.addEventListener('click', closeSuccessModal);

    // --- Initial Load Logic ---
    updateBalanceDisplay();
    renderInventory();
    manageCooldown(); // This function now handles both starting and continuing the cooldown
});
