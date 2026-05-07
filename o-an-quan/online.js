/* ===================================
   Online Multiplayer - Socket.IO Client
   =================================== */

let socket = null;
let onlinePlayerNumber = 0; // 1 or 2
let onlineRoomId = null;
let opponentInfo = null;

function initSocket() {
    if (socket && socket.connected) return;

    socket = io(SERVER_URL || window.location.origin, {
        withCredentials: true
    });

    socket.on('connect', () => {
        console.log('🔗 Connected to server');
    });

    socket.on('waiting_for_match', (data) => {
        updateLobbyStatus('Đang tìm đối thủ...', true);
    });

    socket.on('match_found', (data) => {
        onlineRoomId = data.roomId;
        onlinePlayerNumber = data.playerNumber;
        opponentInfo = data.opponent;

        console.log(`🎮 Match found! You are Player ${onlinePlayerNumber}`);
        console.log(`👤 Opponent: ${opponentInfo.displayName}`);

        startOnlineGame();
    });

    socket.on('opponent_move', (data) => {
        // Execute opponent's move on our board
        handleOpponentMove(data.pos, data.dir);
    });

    socket.on('opponent_disconnected', () => {
        if (!gameOver) {
            updateStatus('⚠️ Đối thủ đã mất kết nối. Bạn thắng!', true);
            // Auto-win
            gameOver = true;
            isAnimating = false;
            showOnlineDisconnectModal();
        }
    });

    socket.on('opponent_left', () => {
        if (!gameOver) {
            updateStatus('⚠️ Đối thủ đã thoát. Bạn thắng!', true);
            gameOver = true;
            isAnimating = false;
            showOnlineDisconnectModal();
        }
    });

    socket.on('match_cancelled', () => {
        showMenuScreen();
    });

    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
    });
}

function findMatch() {
    if (!currentUser) return;

    initSocket();
    showLobbyScreen();
    updateLobbyStatus('Đang kết nối...', true);

    socket.emit('find_match', {
        id: currentUser.id,
        displayName: currentUser.displayName,
        wins: currentUser.wins,
        losses: currentUser.losses
    });
}

function cancelMatchmaking() {
    if (socket) {
        socket.emit('cancel_match');
    }
    showMenuScreen();
}

function showLobbyScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('active');
}

function updateLobbyStatus(msg, showSpinner = false) {
    const statusEl = document.getElementById('lobby-status');
    const spinnerEl = document.getElementById('lobby-spinner');
    statusEl.textContent = msg;
    spinnerEl.style.display = showSpinner ? 'block' : 'none';
}

function startOnlineGame() {
    gameMode = 'online';
    initBoard();

    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    // Set player names
    if (onlinePlayerNumber === 1) {
        document.getElementById('player1-name').textContent = currentUser.displayName + ' (Bạn)';
        document.getElementById('player2-name').textContent = opponentInfo.displayName;
    } else {
        document.getElementById('player1-name').textContent = opponentInfo.displayName;
        document.getElementById('player2-name').textContent = currentUser.displayName + ' (Bạn)';
    }

    renderBoard();
    updateScoreUI();
    updateTurnUI();
}

// Send move to server
function sendMoveToServer(pos, dir) {
    if (socket && gameMode === 'online') {
        socket.emit('make_move', { pos, dir });
    }
}

// Handle opponent's move
async function handleOpponentMove(pos, dir) {
    if (gameOver) return;
    await executeMove(pos, dir);
}

// Send game over to server
function sendGameOverToServer(score1, score2) {
    if (socket && gameMode === 'online') {
        socket.emit('game_over', { score1, score2 });
    }
}

// Leave online game
function leaveOnlineGame() {
    if (socket && gameMode === 'online') {
        socket.emit('leave_game');
    }
    onlineRoomId = null;
    onlinePlayerNumber = 0;
    opponentInfo = null;
}

function showOnlineDisconnectModal() {
    const modal = document.getElementById('gameover-modal');
    const icon = document.getElementById('gameover-icon');
    const title = document.getElementById('gameover-title');
    const msg = document.getElementById('gameover-message');

    icon.textContent = '⚠️';
    title.textContent = 'Đối thủ đã thoát';
    msg.textContent = 'Bạn giành chiến thắng do đối thủ mất kết nối!';

    document.getElementById('go-score1').textContent = scores[0];
    document.getElementById('go-score2').textContent = scores[1];

    modal.classList.add('show');
}

// Check if it's this player's turn in online mode
function isMyTurnOnline() {
    if (gameMode !== 'online') return true;
    // Player 1 = currentPlayer 0, Player 2 = currentPlayer 1
    return (onlinePlayerNumber - 1) === currentPlayer;
}
