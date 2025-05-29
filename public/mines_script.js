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
    // This can be expanded to be more sophisticated based on mines count and gems revealed
    const PAYOUT_MULTIPLIERS = {
        '3': [1.1, 1.3, 1.6, 2.0, 2.5, 3.2, 4.0, 5.0, 6.5, 8.0, 10.0, 12.5, 15.0, 18.0, 22.0, 26.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0],
        '5': [1.1, 1.3, 1.6, 2.0, 2.5, 3.2, 4.0, 5.0, 6.5, 8.0, 10.0, 12.5, 15.0, 18.0, 22.0, 26.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0],
        '8': [1.2, 1.5, 1.9, 2.4, 3.0, 3.8, 4.8, 6.0, 7.5, 9.5, 12.0, 15.0, 18.0, 22.0, 27.0, 33.0, 40.0, 48.0, 58.0, 70.0, 85.0, 100.0],
        '10': [1.3, 1.7, 2.2, 2.8, 3.6, 4.6, 5.9, 7.5, 9.5, 12.0, 15.0, 19.0, 24.0, 30.0, 38.0, 48.0, 60.0, 75.0, 95.0, 120.0, 150.0, 180.0],
        '15': [1.5, 2.0, 2.7, 3.6, 4.8, 6.5, 8.7, 11.5, 15.0, 20.0, 26.0, 34.0, 44.0, 57.0, 74.0, 96.0, 125.0, 160.0, 200.0, 250.0, 300.0, 350.0],
        '20': [2.0, 2.8, 4.0, 5.5, 7.5, 10.5, 14.5, 20.0, 27.5, 37.5, 50.0, 68.0, 92.0, 125.0, 170.0, 230.0, 310.0, 420.0, 570.0, 770.0, 1000.0, 1300.0]
    };

    // --- DOM Elements ---
    const balanceDisplayElements = document.querySelectorAll('#header-balance');
    const betAmountInput = document.getElementById('bet-amount');
    const halfBetButton = document.getElementById('half-bet');
    const doubleBetButton = document.getElementById('double-bet');
    const minesCountSelect = document.getElementById('mines-count');
    const currentMultiplierSpan = document.getElementById('current-multiplier');
    const potentialPayoutSpan = document.getElementById('potential-payout');
    const betButton = document.getElementById('bet-button');
    const cashOutButton = document.getElementById('cash-out-button');
    const cashOutAmountSpan = document.getElementById('cash-out-amount');
    const minesBoard = document.getElementById('mines-board');
    const gameMessage = document.getElementById('game-message');

    // Modals (reusing existing structure)
    const successModalOverlay = document.getElementById('success-modal-overlay');
    const closeSuccessModalButton = document.getElementById('close-success-modal');
    const successMessage = document.getElementById('success-message');

    // --- Game State Variables ---
    let balance = parseFloat(localStorage.getItem('balance')) || INITIAL_BALANCE;
    let currentBet = 0; // This will be set from betAmountInput.value when game starts
    let numberOfMines = parseInt(minesCountSelect.value, 10);
    let minesLocations = []; // Array of indices where mines are located
    let revealedCells = []; // Array of indices of revealed cells
    let gemsFound = 0;
    let gameStarted = false;
    let gameOver = false;

    // --- Helper Functions ---

    function saveBalance() {
        localStorage.setItem('balance', balance.toFixed(2));
        updateBalanceDisplay();
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
        return multipliers[gemsFound - 1] || multipliers[multipliers.length - 1];
    }

    function updatePayoutDisplay() {
        // Use betAmountInput.value for potential payout calculation if game hasn't started
        // Otherwise, use currentBet (which is fixed once game starts)
        const payoutBase = gameStarted ? currentBet : parseFloat(betAmountInput.value);
        const multiplier = calculatePayoutMultiplier(gemsFound, numberOfMines);

        currentMultiplierSpan.textContent = `${multiplier.toFixed(2)}x`;
        potentialPayoutSpan.textContent = (payoutBase * multiplier).toFixed(2);
        cashOutAmountSpan.textContent = (payoutBase * multiplier).toFixed(2);
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
        minesCountSelect.disabled = false;
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
        minesCountSelect.disabled = false;

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
            gameMessage.textContent = `CASHED OUT! You won $${(currentBet * calculatePayoutMultiplier(gemsFound, numberOfMines)).toFixed(2)}!`;
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
            // No need for --mine-color property, CSS handles it
            if (!forceReveal) { // Only end game if it was the player's direct click on a mine
                endGame(true);
            }
        } else {
            cellElement.classList.add(GEM_CELL_CLASS);
            cellElement.textContent = GEM_EMOJI; // Use emoji
            // No need for --gem-color property, CSS handles it
            
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

    // --- Event Handlers ---

    function startGame() {
        if (gameStarted) {
            showSuccessModal('Game is already in progress. Cash out or hit a mine first!', false);
            return;
        }

        currentBet = parseFloat(betAmountInput.value);
        numberOfMines = parseInt(minesCountSelect.value, 10);

        if (isNaN(currentBet) || currentBet <= 0) {
            showSuccessModal('Please enter a valid bet amount.', false);
            return;
        }
        if (currentBet > balance) {
            showSuccessModal('Insufficient balance to place this bet.', false);
            return;
        }
        if (numberOfMines < 1 || numberOfMines >= GRID_SIZE) {
            showSuccessModal('Number of mines must be between 1 and ' + (GRID_SIZE - 1) + '.', false);
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
        minesCountSelect.disabled = true;
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
        // Visually update potential payout when bet amount changes manually
        if (!gameStarted) {
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
        // Visually update potential payout when bet amount changes manually
        if (!gameStarted) {
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
        // Visually update potential payout when bet amount changes manually
        if (!gameStarted) {
            updatePayoutDisplay();
        }
    });

    minesCountSelect.addEventListener('change', () => {
        numberOfMines = parseInt(minesCountSelect.value, 10);
        // If game is not active, update potential payout display based on new mine count
        if (!gameStarted && !gameOver) {
            updatePayoutDisplay();
        }
    });

    // Initial update of potential payout when page loads to reflect default bet/mines
    updatePayoutDisplay();
});
