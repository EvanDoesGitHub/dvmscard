document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and Configuration ---
    const INITIAL_BALANCE = 0;
    const MAX_BALANCE = 1000000000000000000000;
    const GRID_SIZE = 25; // 5x5 grid
    const MINE_CELL_CLASS = 'mine-cell';
    const GEM_CELL_CLASS = 'gem-cell';
    const REVEALED_CLASS = 'revealed';
    const GAME_ACTIVE_CLASS = 'game-active';

    // EMOJI CONSTANTS FOR MINES GAME
    const GEM_EMOJI = '💎'; // Diamond emoji
    const MINE_EMOJI = '💣'; // Bomb emoji

    // Payout multipliers based on number of gems revealed (simplified for now)
    // ADDED PAYOUTS FOR 1 AND 2 MINES
    const PAYOUT_MULTIPLIERS = {
        '1': [1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50, 1.55, 1.60, 1.65, 1.70, 1.75, 1.80, 1.85, 1.90, 1.95, 2.00, 2.05, 2.10, 2.15, 2.20], // For 1 mine, max 24 gems
        '2': [1.08, 1.15, 1.22, 1.30, 1.38, 1.46, 1.55, 1.65, 1.75, 1.85, 1.95, 2.05, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85, 2.95, 3.05, 3.15], // For 2 mines, max 23 gems
        '3': [1.10, 1.30, 1.60, 2.00, 2.50, 3.20, 4.00, 5.00, 6.50, 8.00, 10.00, 12.50, 15.00, 18.00, 22.00, 26.00, 30.00, 35.00, 40.00, 45.00, 50.00, 55.00],
        '5': [1.15, 1.40, 1.75, 2.20, 2.80, 3.60, 4.60, 5.90, 7.50, 9.50, 12.00, 15.50, 20.00, 25.50, 32.50, 41.50, 53.00, 67.00, 85.00, 108.00],
        '8': [1.20, 1.50, 1.90, 2.40, 3.00, 3.80, 4.80, 6.00, 7.50, 9.50, 12.00, 15.00, 18.00, 22.00, 27.00, 33.00, 40.00, 48.00, 58.00, 70.00, 85.00, 100.00],
        '10': [1.30, 1.70, 2.20, 2.80, 3.60, 4.60, 5.90, 7.50, 9.50, 12.00, 15.00, 19.00, 24.00, 30.00, 38.00, 48.00, 60.00, 75.00, 95.00, 120.00, 150.00, 180.00],
        '15': [1.50, 2.00, 2.70, 3.60, 4.80, 6.50, 8.70, 11.50, 15.00, 20.00, 26.00, 34.00, 44.00, 57.00, 74.00, 96.00, 125.00, 160.00, 200.00, 250.00, 300.00, 350.00],
        '20': [2.00, 2.80, 4.00, 5.50, 7.50, 10.50, 14.50, 20.00, 27.50, 37.50, 50.00, 68.00, 92.00, 125.00, 170.00, 230.00, 310.00, 420.00, 570.00, 770.00, 1000.00, 1300.00]
    };
    // Available mine counts for the selection modal
    const AVAILABLE_MINES_COUNTS = [1, 2, 3, 5, 8, 10, 15, 20];


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
        if (!multipliers || gemsFound === 0) {
            return 1.00;
        }
        // Ensure we don't go out of bounds for the multiplier array
        // gemsFound is 1-indexed for the user, but 0-indexed for array access
        return multipliers[gemsFound - 1] || multipliers[multipliers.length - 1];
    }

    function updatePayoutDisplay() {
        const payoutBase = gameStarted ? currentBet : parseFloat(betAmountInput.value);
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
        updatePayoutDisplay(); // Reset multiplier and payout display based on current bet input
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
        updatePayoutDisplay(); // Update payout display with new mine count
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

        currentBet = parseFloat(betAmountInput.value);
        // numberOfMines is already set from the modal selection

        if (isNaN(currentBet) || currentBet <= 0) {
            showSuccessModal('Please enter a valid bet amount.', false);
            return;
        }
        if (currentBet > balance) {
            showSuccessModal('Insufficient balance to place this bet.', false);
            return;
        }
        // Validate numberOfMines, ensuring it's within sensible range for the grid size
        if (numberOfMines < 1 || numberOfMines >= GRID_SIZE) {
            showSuccessModal('Invalid number of mines selected. Please select between 1 and ' + (GRID_SIZE - 1) + '.', false);
            openMineSelectionModal(false); // Re-open modal if invalid mine count
            return;
        }

        balance -= currentBet;
        saveBalance(); // Deduct bet immediately

        resetGame(); // Reset game state and board visuals
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
