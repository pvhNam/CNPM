/* =========================================
   Ô Ăn Quan - Game Logic & UI Controller
   ========================================= */

// ===== Constants =====
const BOARD_SIZE = 12;
const QUAN_POS = [0, 6];
const P1_CELLS = [1, 2, 3, 4, 5];
const P2_CELLS = [7, 8, 9, 10, 11];
const INIT_CITIZEN_STONES = 5;
const INIT_QUAN_STONES = 1;
const ANIM_DELAY = 280;

// ===== Game State =====
let board = [];
let scores = [0, 0];
let currentPlayer = 0; // 0 = P1, 1 = P2
let gameMode = 'pvp'; // 'pvp', 'ai', or 'online'
let selectedCell = null;
let isAnimating = false;
let gameOver = false;
let quanPresent = { 0: true, 6: true }; // Track if original Quan stone is still in each Quan square

// ===== Initialization =====
function initBoard() {
    board = new Array(BOARD_SIZE);
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (QUAN_POS.includes(i)) {
            board[i] = INIT_QUAN_STONES;
        } else {
            board[i] = INIT_CITIZEN_STONES;
        }
    }
    scores = [0, 0];
    currentPlayer = 0;
    selectedCell = null;
    isAnimating = false;
    gameOver = false;
    quanPresent = { 0: true, 6: true };
}

// ===== Board Logic =====
function nextPos(pos, dir) {
    return (pos + dir + BOARD_SIZE) % BOARD_SIZE;
}

function isQuanPos(pos) {
    return QUAN_POS.includes(pos);
}

function getPlayerCells(player) {
    return player === 0 ? P1_CELLS : P2_CELLS;
}

function canPlayerMove(player) {
    return getPlayerCells(player).some(i => board[i] > 0);
}

function totalStonesOnBoard() {
    return board.reduce((a, b) => a + b, 0);
}

function checkGameEnd() {
    // Game ends when both quan squares are empty
    if (board[0] === 0 && board[6] === 0) {
        return true;
    }
    return false;
}

function collectRemaining() {
    // Each player collects remaining stones on their side
    P1_CELLS.forEach(i => { scores[0] += board[i]; board[i] = 0; });
    P2_CELLS.forEach(i => { scores[1] += board[i]; board[i] = 0; });
}

// ===== Core Move Logic (async for animation) =====
async function executeMove(pos, dir) {
    isAnimating = true;
    updateStatus('Đang rải quân...', true);
    disableAllCells();

    let stones = board[pos];
    board[pos] = 0;
    renderBoard();
    await sleep(ANIM_DELAY);

    let currentPos = pos;

    // Distribute stones
    while (stones > 0) {
        currentPos = nextPos(currentPos, dir);
        board[currentPos]++;
        stones--;
        renderBoard();
        highlightCell(currentPos);
        await sleep(ANIM_DELAY);
    }

    // Resolve: continue or capture
    await resolveAfterDrop(currentPos, dir);

    // Check if game ends
    if (checkGameEnd()) {
        collectRemaining();
        renderBoard();
        endGame();
        return;
    }

    // Switch player
    currentPlayer = 1 - currentPlayer;

    // Check if next player can move
    if (!canPlayerMove(currentPlayer)) {
        // Player must scatter: take 5 from score to refill their cells
        const needed = 5;
        if (scores[currentPlayer] >= needed) {
            scores[currentPlayer] -= needed;
            const cells = getPlayerCells(currentPlayer);
            cells.forEach(i => { board[i] = 1; });
            renderBoard();
            updateStatus(`Người chơi ${currentPlayer + 1} rải lại quân`, true);
            await sleep(600);
        } else {
            // Not enough stones to scatter, game ends
            collectRemaining();
            renderBoard();
            endGame();
            return;
        }
    }

    isAnimating = false;
    updateTurnUI();

    // AI turn
    if (gameMode === 'ai' && currentPlayer === 1 && !gameOver) {
        await aiTurn();
    }
}

async function resolveAfterDrop(lastPos, dir) {
    let checkPos = nextPos(lastPos, dir);

    while (true) {
        // If next square has stones -> pick up and continue
        if (board[checkPos] > 0) {
            // "Quan già không được động" - can't pick up from Quan square
            if (isQuanPos(checkPos)) {
                break;
            }

            let stones = board[checkPos];
            board[checkPos] = 0;
            renderBoard();
            await sleep(ANIM_DELAY);

            let currentPos = checkPos;
            while (stones > 0) {
                currentPos = nextPos(currentPos, dir);
                board[currentPos]++;
                stones--;
                renderBoard();
                highlightCell(currentPos);
                await sleep(ANIM_DELAY);
            }

            checkPos = nextPos(currentPos, dir);
            continue;
        }

        // Next square is empty -> check for capture
        let afterEmpty = nextPos(checkPos, dir);

        // If the square after empty has stones -> capture!
        if (board[afterEmpty] > 0) {
            let captured = board[afterEmpty];
            board[afterEmpty] = 0;
            scores[currentPlayer] += captured;

            // Bonus +9 for the original Quan stone (worth 10 instead of 1)
            if (isQuanPos(afterEmpty) && quanPresent[afterEmpty]) {
                scores[currentPlayer] += 9; // 1 already counted above, +9 = 10 total for quan
                quanPresent[afterEmpty] = false;
                updateStatus('🎉 Ăn Quan! +10 điểm!', true);
            }

            renderBoard();
            flashCapture(afterEmpty);
            updateScoreUI();
            await sleep(ANIM_DELAY + 150);

            // Continue checking: look at the next square after captured
            checkPos = nextPos(afterEmpty, dir);

            // If it's empty, check for chain capture
            if (board[checkPos] === 0) {
                continue;
            } else {
                // Has stones, stop
                break;
            }
        } else {
            // Also empty -> turn ends
            break;
        }
    }
}

// ===== AI Logic =====
async function aiTurn() {
    isAnimating = true;
    updateStatus('Máy đang suy nghĩ...', true);
    await sleep(800);

    const bestMove = findBestMove();
    if (bestMove) {
        await executeMove(bestMove.pos, bestMove.dir);
    }
}

function findBestMove() {
    const moves = [];
    const cells = P2_CELLS;

    for (const pos of cells) {
        if (board[pos] === 0) continue;
        for (const dir of [-1, 1]) {
            const result = simulateMove(pos, dir);
            moves.push({ pos, dir, score: result });
        }
    }

    if (moves.length === 0) return null;

    // Sort by highest score captured
    moves.sort((a, b) => b.score - a.score);

    // Add some randomness among top moves
    const topMoves = moves.filter(m => m.score === moves[0].score);
    return topMoves[Math.floor(Math.random() * topMoves.length)];
}

function simulateMove(startPos, dir) {
    // Clone board
    const simBoard = [...board];
    const simQuanPresent = { ...quanPresent };
    let captured = 0;

    let stones = simBoard[startPos];
    simBoard[startPos] = 0;
    let currentPos = startPos;

    // Distribute
    while (stones > 0) {
        currentPos = nextPos(currentPos, dir);
        simBoard[currentPos]++;
        stones--;
    }

    // Resolve
    let checkPos = nextPos(currentPos, dir);
    let maxIter = 100;

    while (maxIter-- > 0) {
        if (simBoard[checkPos] > 0) {
            // "Quan già không được động"
            if (isQuanPos(checkPos)) break;

            stones = simBoard[checkPos];
            simBoard[checkPos] = 0;
            currentPos = checkPos;
            while (stones > 0) {
                currentPos = nextPos(currentPos, dir);
                simBoard[currentPos]++;
                stones--;
            }
            checkPos = nextPos(currentPos, dir);
            continue;
        }

        let afterEmpty = nextPos(checkPos, dir);

        if (simBoard[afterEmpty] > 0) {
            captured += simBoard[afterEmpty];
            // Bonus +9 for original Quan stone (worth 10 instead of 1)
            if (isQuanPos(afterEmpty) && simQuanPresent[afterEmpty]) {
                captured += 9;
                simQuanPresent[afterEmpty] = false;
            }
            simBoard[afterEmpty] = 0;
            checkPos = nextPos(afterEmpty, dir);
            if (simBoard[checkPos] === 0) continue;
            else break;
        } else {
            break;
        }
    }

    return captured;
}

// ===== UI Functions =====
function renderBoard() {
    for (let i = 0; i < BOARD_SIZE; i++) {
        const stonesContainer = document.getElementById(`stones-${i}`);
        const countEl = document.getElementById(`count-${i}`);
        const count = board[i];

        countEl.textContent = count;

        // Render stone visuals
        stonesContainer.innerHTML = '';

        if (isQuanPos(i) && count > 0 && quanPresent[i]) {
            // Show big gold quan stone only if original quan is still present
            const quanStone = document.createElement('div');
            quanStone.className = 'stone quan-stone';
            stonesContainer.appendChild(quanStone);

            // Show remaining small stones
            const remaining = Math.min(count - 1, 12);
            for (let j = 0; j < remaining; j++) {
                const stone = document.createElement('div');
                stone.className = 'stone';
                stonesContainer.appendChild(stone);
            }
        } else {
            const display = Math.min(count, 15);
            for (let j = 0; j < display; j++) {
                const stone = document.createElement('div');
                stone.className = 'stone';
                stonesContainer.appendChild(stone);
            }
        }
    }
}

function highlightCell(pos) {
    const cell = document.getElementById(`cell-${pos}`);
    cell.classList.add('highlight');
    setTimeout(() => cell.classList.remove('highlight'), 400);
}

function flashCapture(pos) {
    const cell = document.getElementById(`cell-${pos}`);
    cell.classList.add('capture-flash');
    setTimeout(() => cell.classList.remove('capture-flash'), 500);
}

function updateScoreUI() {
    document.getElementById('player1-score').textContent = scores[0];
    document.getElementById('player2-score').textContent = scores[1];
}

function updateTurnUI() {
    const t1 = document.getElementById('turn1');
    const t2 = document.getElementById('turn2');
    const p1Info = document.getElementById('player1-info');
    const p2Info = document.getElementById('player2-info');

    t1.classList.toggle('active', currentPlayer === 0);
    t2.classList.toggle('active', currentPlayer === 1);
    p1Info.classList.toggle('active-turn', currentPlayer === 0);
    p2Info.classList.toggle('active-turn', currentPlayer === 1);

    enablePlayerCells();

    let playerName;
    if (gameMode === 'online') {
        if (isMyTurnOnline()) {
            playerName = 'Bạn';
        } else {
            playerName = opponentInfo ? opponentInfo.displayName : 'Đối thủ';
        }
    } else {
        playerName = currentPlayer === 0 ? 'Người Chơi 1' :
            (gameMode === 'ai' ? 'Máy' : 'Người Chơi 2');
    }
    updateStatus(`Lượt của ${playerName}`);
}

function enablePlayerCells() {
    // Disable all first
    disableAllCells();

    if (isAnimating || gameOver) return;

    // In online mode, only enable cells if it's our turn
    if (gameMode === 'online' && !isMyTurnOnline()) return;

    const cells = getPlayerCells(currentPlayer);
    cells.forEach(i => {
        const cell = document.getElementById(`cell-${i}`);
        if (board[i] > 0) {
            cell.classList.remove('disabled');
        }
    });
}

function disableAllCells() {
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (!isQuanPos(i)) {
            document.getElementById(`cell-${i}`).classList.add('disabled');
        }
    }
}

function updateStatus(msg, isAction = false) {
    const bar = document.getElementById('status-bar');
    bar.textContent = msg;
    bar.classList.toggle('action', isAction);
}

// ===== Cell Click Handler =====
function onCellClick(pos) {
    if (isAnimating || gameOver) return;

    const playerCells = getPlayerCells(currentPlayer);
    if (!playerCells.includes(pos)) return;
    if (board[pos] === 0) return;

    // If AI's turn in AI mode, ignore clicks
    if (gameMode === 'ai' && currentPlayer === 1) return;

    // In online mode, only allow clicks on our turn
    if (gameMode === 'online' && !isMyTurnOnline()) return;

    selectedCell = pos;

    // Highlight selected cell
    document.querySelectorAll('.cell.citizen').forEach(c => c.classList.remove('selected'));
    document.getElementById(`cell-${pos}`).classList.add('selected');

    // Show direction selector
    showDirectionSelector();
}

function showDirectionSelector() {
    document.getElementById('direction-overlay').classList.add('show');
}

function hideDirectionSelector() {
    document.getElementById('direction-overlay').classList.remove('show');
}

function chooseDirection(dir) {
    hideDirectionSelector();
    document.querySelectorAll('.cell.citizen').forEach(c => c.classList.remove('selected'));

    if (selectedCell !== null) {
        // In online mode, send move to server
        if (gameMode === 'online') {
            sendMoveToServer(selectedCell, dir);
        }
        executeMove(selectedCell, dir);
        selectedCell = null;
    }
}

function cancelDirection() {
    hideDirectionSelector();
    selectedCell = null;
    document.querySelectorAll('.cell.citizen').forEach(c => c.classList.remove('selected'));
}

// ===== Game End =====
function endGame() {
    gameOver = true;
    isAnimating = false;
    updateScoreUI();

    // In online mode, send game over to server (only player 1 reports)
    if (gameMode === 'online' && onlinePlayerNumber === 1) {
        sendGameOverToServer(scores[0], scores[1]);
    }

    const modal = document.getElementById('gameover-modal');
    const icon = document.getElementById('gameover-icon');
    const title = document.getElementById('gameover-title');
    const msg = document.getElementById('gameover-message');
    const s1 = document.getElementById('go-score1');
    const s2 = document.getElementById('go-score2');

    s1.textContent = scores[0];
    s2.textContent = scores[1];

    if (scores[0] > scores[1]) {
        icon.textContent = '🏆';
        let winner;
        if (gameMode === 'online') {
            winner = onlinePlayerNumber === 1 ? 'Bạn' : (opponentInfo ? opponentInfo.displayName : 'Đối thủ');
        } else {
            winner = 'Người Chơi 1';
        }
        title.textContent = `${winner} Thắng!`;
        msg.textContent = gameMode === 'online' && onlinePlayerNumber === 1
            ? 'Chúc mừng bạn đã giành chiến thắng!'
            : `Chúc mừng! ${winner} đã giành chiến thắng!`;
    } else if (scores[1] > scores[0]) {
        icon.textContent = '🏆';
        let winner;
        if (gameMode === 'online') {
            winner = onlinePlayerNumber === 2 ? 'Bạn' : (opponentInfo ? opponentInfo.displayName : 'Đối thủ');
        } else {
            winner = gameMode === 'ai' ? 'Máy' : 'Người Chơi 2';
        }
        title.textContent = `${winner} Thắng!`;
        if (gameMode === 'online' && onlinePlayerNumber === 2) {
            msg.textContent = 'Chúc mừng bạn đã giành chiến thắng!';
        } else if (gameMode === 'ai') {
            msg.textContent = 'Máy tính đã thắng. Hãy thử lại!';
        } else {
            msg.textContent = `Chúc mừng! ${winner} đã giành chiến thắng!`;
        }
    } else {
        icon.textContent = '🤝';
        title.textContent = 'Hòa!';
        msg.textContent = 'Hai bên ngang tài ngang sức!';
    }

    modal.classList.add('show');
    disableAllCells();
    updateStatus('Trò chơi kết thúc!');
}

// ===== Screen Navigation =====
function startGame(mode) {
    gameMode = mode;
    initBoard();

    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    if (mode === 'ai') {
        document.getElementById('player2-name').textContent = 'Máy (AI)';
        document.getElementById('player1-name').textContent = currentUser ? currentUser.displayName : 'Người Chơi 1';
    } else if (mode === 'pvp') {
        document.getElementById('player1-name').textContent = 'Người Chơi 1';
        document.getElementById('player2-name').textContent = 'Người Chơi 2';
    }

    // Hide restart button in online mode
    document.getElementById('btn-restart').style.display = mode === 'online' ? 'none' : 'flex';

    renderBoard();
    updateScoreUI();
    updateTurnUI();
}

function backToMenu() {
    // If in online game, leave the room
    if (gameMode === 'online') {
        leaveOnlineGame();
    }

    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('gameover-modal').classList.remove('show');
    document.getElementById('lobby-screen').classList.remove('active');

    if (currentUser) {
        document.getElementById('menu-screen').classList.add('active');
        // Refresh user stats
        checkAuth();
    } else {
        document.getElementById('auth-screen').classList.add('active');
    }

    gameOver = true;
    isAnimating = false;
}

function restartGame() {
    // Don't allow restart in online mode
    if (gameMode === 'online') {
        backToMenu();
        return;
    }

    document.getElementById('gameover-modal').classList.remove('show');
    initBoard();
    renderBoard();
    updateScoreUI();
    updateTurnUI();
}

function showRules() {
    document.getElementById('rules-modal').classList.add('show');
}

function closeRules() {
    document.getElementById('rules-modal').classList.remove('show');
}

// ===== Utility =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Keyboard shortcuts =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideDirectionSelector();
        closeRules();
        cancelDirection();
    }
});

// Close modals on overlay click
document.getElementById('rules-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeRules();
});

document.getElementById('direction-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cancelDirection();
});
