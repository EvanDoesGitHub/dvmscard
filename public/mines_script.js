document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and Configuration ---
    const INITIAL_BALANCE = 100;
    const MAX_BALANCE = 1000000;
    const GRID_SIZE = 25; // 5x5 grid
    const MINE_CELL_CLASS = 'mine-cell';
    const GEM_CELL_CLASS = 'gem-cell';
    const REVEALED_CLASS = 'revealed';
    const GAME_ACTIVE_CLASS = 'game-active';

    // EMOJI CONSTANTS FOR MINES GAME
    const GEM_EMOJI = '💎'; // Diamond emoji
    const MINE_EMOJI = '💣'; // Bomb emoji

    // Payout multipliers based on number of gems revealed (from provided chart image_3acad2.jpg)
    // The arrays represent multipliers for 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 gems respectively.
    // Each key corresponds to the number of mines.
    const PAYOUT_MULTIPLIERS = {
        '1': [1.01, 1.08, 1.12, 1.18, 1.24, 1.30, 1.37, 1.46, 1.55, 1.65, 1.77, 1.90, 2.06, 2.25, 2.47, 2.75, 3.09, 3.54, 4.12, 4.95, 6.19, 8.25, 12.37, 24.75],
        '2': [1.08, 1.17, 1.29, 1.41, 1.56, 1.74, 1.94, 2.18, 2.47, 2.83, 3.26, 3.81, 4.50, 5.40, 6.60, 8.25, 10.61, 14.14, 19.80, 29.70, 49.50, 99.00, 297.00],
        '3': [1.12, 1.29, 1.48, 1.71, 2.00, 2.35, 2.79, 3.35, 4.07, 5.00, 6.26, 7.96, 10.35, 13.80, 18.97, 27.11, 40.66, 65.06, 113.85, 227.70, 569.25, 2277.00],
        '4': [1.18, 1.41, 1.71, 2.09, 2.58, 3.23, 4.09, 5.26, 6.88, 9.17, 12.51, 17.52, 25.30, 37.95, 59.64, 99.39, 178.91, 357.81, 834.90, 2504.00, 12523.00],
        '5': [1.24, 1.56, 2.00, 2.58, 3.39, 4.52, 6.14, 8.50, 12.04, 17.52, 26.77, 40.87, 66.41, 113.85, 208.72, 417.45, 939.26, 2504.00, 8766.00, 52598.00],
        '6': [1.30, 1.74, 2.35, 3.23, 4.52, 6.46, 9.44, 14.17, 21.89, 35.03, 58.38, 102.17, 189.76, 379.50, 834.90, 2087.00, 6261.00, 25047.00, 175329.00],
        '7': [1.37, 1.94, 2.79, 4.09, 6.14, 9.44, 14.95, 24.47, 41.60, 73.95, 138.66, 277.33, 600.87, 1442.00, 3965.00, 13219.00, 59486.00, 475893.00],
        '8': [1.46, 2.18, 3.35, 5.26, 8.50, 14.17, 24.47, 44.05, 83.20, 166.40, 356.56, 831.98, 2163.00, 6489.00, 23794.00, 118973.00, 1070759.00],
        '9': [1.55, 2.47, 4.07, 6.88, 12.04, 21.89, 41.60, 83.20, 176.80, 404.10, 1010.00, 2828.00, 9193.00, 36773.00, 202254.00, 2022545.00],
        '10': [1.65, 2.83, 5.00, 9.17, 17.52, 35.03, 73.95, 166.40, 404.10, 1077.00, 3232.00, 11314.00, 49031.00, 294188.00, 3236072.00],
        '11': [1.77, 3.26, 6.26, 12.51, 26.27, 58.38, 136.66, 356.56, 1010.00, 3232.00, 12123.00, 56574.00, 367735.00, 4412826.00],
        '12': [1.90, 3.81, 7.96, 17.52, 40.87, 102.17, 277.33, 831.98, 2828.00, 11314.00, 56574.00, 396022.00, 5148297.00],
        '13': [2.06, 4.50, 10.35, 25.30, 66.41, 189.76, 600.87, 2163.00, 9193.00, 49031.00, 367735.00, 5148297.00],
        '14': [2.25, 5.40, 13.80, 37.95, 113.85, 379.50, 1442.00, 6489.00, 36773.00, 294188.00, 4412826.00],
        '15': [2.47, 6.60, 18.97, 59.64, 208.72, 834.90, 3965.00, 23794.00, 202254.00, 3236072.00],
        '16': [2.75, 8.25, 27.11, 99.39, 417.45, 2087.00, 13219.00, 118973.00, 2022545.00],
        '17': [3.09, 10.61, 40.66, 178.91, 939.26, 6261.00, 59486.00, 1070759.00],
        '18': [3.54, 14.14, 65.06, 357.81, 2504.00, 25047.00, 475893.00],
        '19': [4.12, 19.80, 113.85, 834.90, 8766.00, 175329.00],
        '20': [4.95, 29.70, 227.70, 2504.00, 52598.00],
        '21': [6.19, 49.50, 569.25, 12523.00],
        '22': [8.25, 99.00, 2277.00],
        '23': [12.36, 297.00],
        '24': [24.75]
    };
    // Available mine counts for the selection modal
    const AVAILABLE_MINES_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];


    // --- DOM Elements ---
    const balanceDisplayElements = document.querySelectorAll('#header-balance');
    const betAmountInput = document.getElementById('bet-amount');
    const halfBetButton = document.getElementById('half-bet');
    const doubleBetButton = document.getElementById('double-bet');
    const displayMinesCount = document.getElementById('display-mines-count'); // Element to display selected mine count
    const changeMinesButton = document.getElementById('change-mines-button');
    const currentMultiplierSpan = document.getElementById('current-multiplier');
    const potentialPayoutSpan = document.getElementById('potential-payout');
    const betButton = document.getElementById('bet-button');
    const cashOutButton = document.getElementById('cash-out-button');
    const cashOutAmountSpan = document.getElementById('cash-out-amount');
    const minesBoard = document.getElementById('mines-board');
    const gameMessage = document.getElementById('game-message');

    // Modals
    const successModalOverlay = document.getElementById('success-modal-overlay');
    const closeSuccessModalButton = document.getElementById('close-success-modal');
    const successMessage = document.getElementById('success-message');

    // Mine Selection Modal Elements
    const mineSelectionModalOverlay = document.getElementById('mine-selection-modal-overlay');
    const mineSelectionGrid = mineSelectionModalOverlay.querySelector('.mine-selection-grid');
    const confirmMinesButton = document.getElementById('confirm-mines-button');

    // --- Game State Variables ---
    let balance = parseFloat(localStorage.getItem('balance')) || INITIAL_BALANCE;
    let currentBet = 0;
    let numberOfMines = parseInt(localStorage.getItem('minesCount') || '5', 10); // Load saved mine count or default to 5
    let minesLocations = []; // Array of indices where mines are located
    let revealedCells = []; // Array of indices of revealed cells
    let gemsFound = 0;
    let gameStarted = false;
    let gameOver = false;
    let selectedMinesFromModal = numberOfMines; // Temporarily holds selection from modal


    // --- Helper Functions ---

    function saveBalance() {
        localStorage.setItem('balance', balance.toFixed(2));
        updateBalanceDisplay();
    }

    function saveMinesCount() {
        localStorage.setItem('minesCount', numberOfMines.toString());
        displayMinesCount.textContent = `${numberOfMines} Mine${numberOfMines > 1 ? 's' : ''}`;
    }

    function updateBalanceDisplay() {
        balanceDisplayElements.forEach(element => {
            element.textContent = balance.toFixed(2);
        });
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

    function generateMines() {
        minesLocations = [];
        const allCells = Array.from({ length: GRID_SIZE }, (_, i) => i); // [0, 1, ..., 24]

        // Shuffle all cells and pick the first 'numberOfMines' as mine locations
        for (let i = allCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
        }

        minesLocations = allCells.slice(0, numberOfMines);
    }

    function calculatePayoutMultiplier(gemsFound, mines) {
        const multipliers = PAYOUT_MULTIPLIERS[mines.toString()];
        
        // If no multipliers for this mine count or no gems found, return base multiplier
        if (!multipliers || gemsFound === 0) {
            return 1.00;
        }

        // Ensure we don't go out of bounds for the multiplier array
        // gemsFound is 1-indexed for the user, but 0-indexed for array access
        const multiplierIndex = gemsFound - 1;
        if (multiplierIndex >= 0 && multiplierIndex < multipliers.length) {
            return multipliers[multiplierIndex];
        } else {
            // If somehow gemsFound exceeds available multipliers for this mine count,
            // return the last available multiplier or a default.
            return multipliers[multipliers.length - 1] || 1.00;
        }
    }

    function updatePayoutDisplay() {
        // Use currentBet if game has started, otherwise use the value from the bet input
        const payoutBase = gameStarted ? currentBet : parseFloat(betAmountInput.value || '0'); 
        const multiplier = calculatePayoutMultiplier(gemsFound, numberOfMines);
        const potentialPayout = (payoutBase * multiplier).toFixed(2);

        // Add animation class for multiplier
        currentMultiplierSpan.classList.remove('animate-update');
        void currentMultiplierSpan.offsetWidth; // Trigger reflow
        currentMultiplierSpan.textContent = `${multiplier.toFixed(2)}x`;
        currentMultiplierSpan.classList.add('animate-update');

        // Add animation class for potential payout
        potentialPayoutSpan.classList.remove('animate-update');
        void potentialPayoutSpan.offsetWidth; // Trigger reflow
        potentialPayoutSpan.textContent = potentialPayout;
        potentialPayoutSpan.classList.add('animate-update');

        // Update cash out button text
        cashOutAmountSpan.textContent = potentialPayout;
    }

    function resetGame() {
        gameStarted = false;
        gameOver = false;
        currentBet = 0; // Reset currentBet
        gemsFound = 0;
        revealedCells = [];
        minesBoard.innerHTML = ''; // Clear board
        minesBoard.classList.remove(GAME_ACTIVE_CLASS); // Remove active class
        betButton.disabled = false;
        cashOutButton.disabled = true;
        betAmountInput.disabled = false;
        changeMinesButton.disabled = false; // Enable change mines button
        gameMessage.textContent = 'Click "Bet" to start a new game!';
        gameMessage.style.color = 'var(--stake-text-light)';
        // Do NOT call updatePayoutDisplay here with currentBet = 0, as it would show 0.00 before bet is placed
        // The betAmountInput.value change listener will handle the initial display.
        generateBoard(); // Regenerate a fresh board for the next game
    }

    function endGame(hitMine = false) {
        gameOver = true;
        gameStarted = false;
        betButton.disabled = false;
        cashOutButton.disabled = true;
        betAmountInput.disabled = false;
        changeMinesButton.disabled = false; // Enable change mines button

        // Reveal all cells
        const cells = minesBoard.children;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (!cell.classList.contains(REVEALED_CLASS)) {
                revealCellContent(cell, i, true); // Reveal all unrevealed cells, forcing content display
            }
        }

        if (hitMine) {
            gameMessage.textContent = `BOOM! You hit a mine. You lost $${currentBet.toFixed(2)}.`;
            gameMessage.style.color = '#e74c3c'; // Red for loss
        } else {
            const winnings = currentBet * calculatePayoutMultiplier(gemsFound, numberOfMines);
            gameMessage.textContent = `CASHED OUT! You won $${winnings.toFixed(2)}!`;
            gameMessage.style.color = 'var(--stake-green-primary)'; // Green for win
        }
        updatePayoutDisplay(); // Update payout display to show final state (0 for loss, actual for win)
    }

    // Updated revealCellContent to use emojis
    function revealCellContent(cellElement, index, forceReveal = false) {
        if (!forceReveal && (cellElement.classList.contains(REVEALED_CLASS) || gameOver || !gameStarted)) {
            return; // Prevent revealing if already revealed, game over, or not started
        }

        cellElement.classList.add(REVEALED_CLASS);
        cellElement.removeEventListener('click', handleCellClick); // Prevent further clicks

        if (minesLocations.includes(index)) {
            cellElement.classList.add(MINE_CELL_CLASS);
            cellElement.textContent = MINE_EMOJI; // Use emoji
            if (!forceReveal) { // Only end game if it was the player's direct click on a mine
                endGame(true);
            }
        } else {
            cellElement.classList.add(GEM_CELL_CLASS);
            cellElement.textContent = GEM_EMOJI; // Use emoji
            
            if (!forceReveal) { // Only count gems and update payout if not a forced reveal at end of game
                gemsFound++;
                revealedCells.push(index);
                updatePayoutDisplay();

                if (gemsFound === (GRID_SIZE - numberOfMines)) {
                    // All gems found, automatic win
                    balance = Math.min(MAX_BALANCE, balance + (currentBet * calculatePayoutMultiplier(gemsFound, numberOfMines)));
                    saveBalance();
                    endGame(false);
                    showSuccessModal(`Congratulations! You found all gems and won $${(currentBet * calculatePayoutMultiplier(gemsFound, numberOfMines)).toFixed(2)}!`);
                } else {
                    cashOutButton.disabled = false; // Enable cash out after first gem
                }
            }
        }
    }

    function handleCellClick(event) {
        if (gameOver || !gameStarted) return;

        const cell = event.currentTarget;
        const index = parseInt(cell.dataset.index, 10);

        revealCellContent(cell, index);
    }

    function generateBoard() {
        minesBoard.innerHTML = ''; // Clear existing cells
        minesBoard.classList.remove(GAME_ACTIVE_CLASS); // Ensure game-active is off initially
        minesBoard.style.gridTemplateColumns = `repeat(5, 1fr)`; // Ensure 5x5 layout
        minesBoard.style.gridTemplateRows = `repeat(5, 1fr)`; // Ensure 5x5 layout

        for (let i = 0; i < GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.classList.add('mines-cell');
            cell.dataset.index = i;
            cell.addEventListener('click', handleCellClick);
            minesBoard.appendChild(cell);
        }
    }

    // --- Mine Selection Modal Functions ---
    function openMineSelectionModal(initialLoad = false) {
        mineSelectionModalOverlay.classList.add('active');
        populateMineSelectionGrid();
        
        // Select the current number of mines in the modal
        const currentSelected = mineSelectionGrid.querySelector(`.mine-option[data-mines="${numberOfMines}"]`);
        if (currentSelected) {
            currentSelected.classList.add('selected');
            selectedMinesFromModal = numberOfMines; // Ensure initial selection is set for confirm
        } else {
            // If current number of mines isn't an option (e.g., loaded from old data),
            // default to a common one like 5 mines and select it.
            if (!AVAILABLE_MINES_COUNTS.includes(numberOfMines)) {
                selectedMinesFromModal = 5; // Default to 5 if current is invalid
                const defaultOption = mineSelectionGrid.querySelector(`.mine-option[data-mines="5"]`);
                if (defaultOption) {
                    defaultOption.classList.add('selected');
                }
            }
        }

        // Disable bet button until selection is confirmed from modal on initial load
        if (initialLoad) {
            betButton.disabled = true;
            changeMinesButton.disabled = true; // Disable until confirmed
        }
    }

    function closeMineSelectionModal() {
        mineSelectionModalOverlay.classList.remove('active');
        // Re-enable bet button and change mines button after modal is closed (if not in game)
        if (!gameStarted) {
            betButton.disabled = false;
            changeMinesButton.disabled = false;
        }
    }

    function populateMineSelectionGrid() {
        mineSelectionGrid.innerHTML = ''; // Clear previous options
        AVAILABLE_MINES_COUNTS.forEach(count => {
            const optionDiv = document.createElement('div');
            optionDiv.classList.add('mine-option');
            optionDiv.dataset.mines = count;
            optionDiv.innerHTML = `
                <span class="mine-count-number">${count}</span>
                <span class="mine-count-text">Mine${count > 1 ? 's' : ''}</span>
            `;
            optionDiv.addEventListener('click', () => {
                // Remove 'selected' from all other options
                mineSelectionGrid.querySelectorAll('.mine-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                // Add 'selected' to the clicked option
                optionDiv.classList.add('selected');
                selectedMinesFromModal = count; // Store the selected value
            });
            mineSelectionGrid.appendChild(optionDiv);
        });
    }

    function confirmMineSelection() {
        numberOfMines = selectedMinesFromModal;
        saveMinesCount(); // Save the new mine count and update display element
        updatePayoutDisplay(); // Update payout display with new mine count based on current bet input value
        closeMineSelectionModal();
        gameMessage.textContent = `Mines set to ${numberOfMines}. Click "Bet" to start a new game!`;
        gameMessage.style.color = 'var(--stake-text-light)';
    }


    // --- Event Handlers ---

    function startGame() {
        if (gameStarted) {
            showSuccessModal('Game is already in progress. Cash out or hit a mine first!', false);
            return;
        }

        const betValue = parseFloat(betAmountInput.value);
        
        if (isNaN(betValue) || betValue <= 0) {
            showSuccessModal('Please enter a valid bet amount.', false);
            return;
        }
        if (betValue > balance) {
            showSuccessModal('Insufficient balance to place this bet.', false);
            return;
        }
        // Validate numberOfMines, ensuring it's within sensible range for the grid size
        if (numberOfMines < 1 || numberOfMines >= GRID_SIZE) {
            showSuccessModal('Invalid number of mines selected. Please select between 1 and ' + (GRID_SIZE - 1) + '.', false);
            openMineSelectionModal(false); // Re-open modal if invalid mine count
            return;
        }

        currentBet = betValue; // Set currentBet for the round
        balance -= currentBet;
        saveBalance(); // Deduct bet immediately

        resetGame(); // Reset game state and board visuals (this also sets currentBet to 0 and gemsFound to 0)
        
        // IMPORTANT: Re-set currentBet AFTER resetGame, as resetGame sets it to 0
        currentBet = betValue; 

        generateMines(); // Place mines for the new game
        
        gameStarted = true;
        gameOver = false;
        betButton.disabled = true;
        betAmountInput.disabled = true;
        changeMinesButton.disabled = true; // Disable change mines button during game
        minesBoard.classList.add(GAME_ACTIVE_CLASS); // Add active class to board
        gameMessage.textContent = 'Game started! Click a cell to reveal.';
        gameMessage.style.color = 'var(--stake-text-light)';
        updatePayoutDisplay(); // Initialize payout display with actual bet
    }

    function cashOut() {
        if (!gameStarted || gameOver || gemsFound === 0) {
            showSuccessModal('No active game to cash out or no gems found yet.', false);
            return;
        }

        const winnings = currentBet * calculatePayoutMultiplier(gemsFound, numberOfMines);
        balance = Math.min(MAX_BALANCE, balance + winnings);
        saveBalance();
        endGame(false); // End game as a win
        showSuccessModal(`Cashed out successfully! You won $${winnings.toFixed(2)}!`);
    }

    // --- Initialization ---
    updateBalanceDisplay();
    generateBoard(); // Initial board generation
    saveMinesCount(); // Update the display element with the loaded mine count
    updatePayoutDisplay(); // Initial update of potential payout based on loaded mine count

    // Event Listeners
    betButton.addEventListener('click', startGame);
    cashOutButton.addEventListener('click', cashOut);
    closeSuccessModalButton.addEventListener('click', closeSuccessModal);

    halfBetButton.addEventListener('click', () => {
        let currentVal = parseFloat(betAmountInput.value);
        if (isNaN(currentVal) || currentVal <= 0.01) {
            betAmountInput.value = (0.01).toFixed(2);
        } else {
            betAmountInput.value = (currentVal / 2).toFixed(2);
        }
        if (!gameStarted) { // Only update payout display if game hasn't started
            updatePayoutDisplay();
        }
    });

    doubleBetButton.addEventListener('click', () => {
        let currentVal = parseFloat(betAmountInput.value);
        if (isNaN(currentVal)) {
            betAmountInput.value = (1.00).toFixed(2);
        } else {
            betAmountInput.value = (currentVal * 2).toFixed(2);
        }
        if (!gameStarted) { // Only update payout display if game hasn't started
            updatePayoutDisplay();
        }
    });

    // Ensure bet amount is always at least 0.01 and formatted
    betAmountInput.addEventListener('change', () => {
        let val = parseFloat(betAmountInput.value);
        if (isNaN(val) || val < 0.01) {
            betAmountInput.value = (0.01).toFixed(2);
        } else {
            betAmountInput.value = val.toFixed(2);
        }
        if (!gameStarted) { // Only update payout display if game hasn't started
            updatePayoutDisplay();
        }
    });

    // Event listener for the "Change Mines" button to open the modal
    changeMinesButton.addEventListener('click', () => openMineSelectionModal(false));
    // Event listener for the "Confirm Selection" button inside the modal
    confirmMinesButton.addEventListener('click', confirmMineSelection);

    // Show mine selection modal on initial load if no game is active
    if (!gameStarted && !gameOver) {
        openMineSelectionModal(true); // Pass true to indicate initial load
    }
});
