/* ===================================
   Game Manager - Online Matchmaking & Game Sync
   =================================== */

const db = require('./db');

class GameManager {
    constructor() {
        this.waitingQueue = []; // Players waiting for a match
        this.rooms = new Map(); // roomId -> { player1, player2, board, scores, currentPlayer, ... }
        this.playerRooms = new Map(); // socketId -> roomId
    }

    // Add player to matchmaking queue
    findMatch(socket, user) {
        // Check if already in queue
        const existing = this.waitingQueue.find(p => p.socket.id === socket.id);
        if (existing) return;

        // Check if already in a game
        if (this.playerRooms.has(socket.id)) return;

        // Check if someone is waiting
        if (this.waitingQueue.length > 0) {
            const opponent = this.waitingQueue.shift();

            // Don't match with yourself
            if (opponent.user.id === user.id) {
                this.waitingQueue.push({ socket, user });
                return;
            }

            // Create a room
            const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const room = {
                id: roomId,
                player1: { socket: opponent.socket, user: opponent.user },
                player2: { socket, user },
                gameStarted: false
            };

            this.rooms.set(roomId, room);
            this.playerRooms.set(opponent.socket.id, roomId);
            this.playerRooms.set(socket.id, roomId);

            // Join socket room
            opponent.socket.join(roomId);
            socket.join(roomId);

            // Notify both players
            opponent.socket.emit('match_found', {
                roomId,
                playerNumber: 1,
                opponent: {
                    id: user.id,
                    displayName: user.displayName,
                    wins: user.wins,
                    losses: user.losses
                }
            });

            socket.emit('match_found', {
                roomId,
                playerNumber: 2,
                opponent: {
                    id: opponent.user.id,
                    displayName: opponent.user.displayName,
                    wins: opponent.user.wins,
                    losses: opponent.user.losses
                }
            });

            room.gameStarted = true;
            console.log(`🎮 Match created: ${opponent.user.displayName} vs ${user.displayName} in ${roomId}`);
        } else {
            // No opponent available, add to queue
            this.waitingQueue.push({ socket, user });
            socket.emit('waiting_for_match', { position: this.waitingQueue.length });
            console.log(`⏳ ${user.displayName} is waiting for a match...`);
        }
    }

    // Cancel matchmaking
    cancelMatch(socket) {
        this.waitingQueue = this.waitingQueue.filter(p => p.socket.id !== socket.id);
        socket.emit('match_cancelled');
    }

    // Handle a move from a player
    handleMove(socket, data) {
        const roomId = this.playerRooms.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room) return;

        // Determine which player made the move
        const isPlayer1 = room.player1.socket.id === socket.id;
        const opponentSocket = isPlayer1 ? room.player2.socket : room.player1.socket;

        // Forward move to opponent
        opponentSocket.emit('opponent_move', {
            pos: data.pos,
            dir: data.dir
        });
    }

    // Handle game over
    async handleGameOver(socket, data) {
        const roomId = this.playerRooms.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.saved) return;

        room.saved = true; // Prevent double-saving

        const { score1, score2 } = data;
        const p1Id = room.player1.user.id;
        const p2Id = room.player2.user.id;

        let winnerId = null;
        if (score1 > score2) winnerId = p1Id;
        else if (score2 > score1) winnerId = p2Id;

        try {
            // Save game history
            await db.query(
                `INSERT INTO game_history (player1_id, player2_id, player1_score, player2_score, winner_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [p1Id, p2Id, score1, score2, winnerId]
            );

            // Update player stats
            if (winnerId === p1Id) {
                await db.query('UPDATE users SET wins = wins + 1, total_score = total_score + ? WHERE id = ?', [score1, p1Id]);
                await db.query('UPDATE users SET losses = losses + 1, total_score = total_score + ? WHERE id = ?', [score2, p2Id]);
            } else if (winnerId === p2Id) {
                await db.query('UPDATE users SET wins = wins + 1, total_score = total_score + ? WHERE id = ?', [score2, p2Id]);
                await db.query('UPDATE users SET losses = losses + 1, total_score = total_score + ? WHERE id = ?', [score1, p1Id]);
            } else {
                await db.query('UPDATE users SET draws = draws + 1, total_score = total_score + ? WHERE id = ?', [score1, p1Id]);
                await db.query('UPDATE users SET draws = draws + 1, total_score = total_score + ? WHERE id = ?', [score2, p2Id]);
            }

            console.log(`📊 Game saved: P1(${score1}) vs P2(${score2}), Winner: ${winnerId || 'Draw'}`);
        } catch (err) {
            console.error('Error saving game result:', err);
        }
    }

    // Handle player disconnect
    handleDisconnect(socket) {
        // Remove from waiting queue
        this.waitingQueue = this.waitingQueue.filter(p => p.socket.id !== socket.id);

        // Check if in a room
        const roomId = this.playerRooms.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room) return;

        // Notify opponent
        const isPlayer1 = room.player1.socket.id === socket.id;
        const opponentSocket = isPlayer1 ? room.player2.socket : room.player1.socket;

        opponentSocket.emit('opponent_disconnected');

        // Clean up
        this.playerRooms.delete(room.player1.socket.id);
        this.playerRooms.delete(room.player2.socket.id);
        this.rooms.delete(roomId);

        console.log(`🔌 Player disconnected from ${roomId}`);
    }

    // Handle player leaving game (back to menu)
    handleLeaveGame(socket) {
        const roomId = this.playerRooms.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room) return;

        const isPlayer1 = room.player1.socket.id === socket.id;
        const opponentSocket = isPlayer1 ? room.player2.socket : room.player1.socket;

        opponentSocket.emit('opponent_left');

        // Clean up
        this.playerRooms.delete(room.player1.socket.id);
        this.playerRooms.delete(room.player2.socket.id);
        this.rooms.delete(roomId);
    }
}

module.exports = GameManager;
