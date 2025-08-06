const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Game state management
class GameServer {
    constructor() {
        this.players = new Map();
        this.rooms = new Map();
        this.waitingPlayers = [];
        
        this.weapons = {
            sword: { name: 'Iron Sword', damage: 25, accuracy: 0.8, manaCost: 0 },
            axe: { name: 'Battle Axe', damage: 30, accuracy: 0.7, manaCost: 0 },
            bow: { name: 'Elven Bow', damage: 20, accuracy: 0.9, manaCost: 0 },
            dagger: { name: 'Swift Dagger', damage: 15, accuracy: 0.95, manaCost: 0 }
        };

        this.skills = {
            fireball: { name: 'Fireball', damage: 35, accuracy: 0.85, manaCost: 15 },
            heal: { name: 'Heal', heal: 25, accuracy: 1.0, manaCost: 20 },
            lightning: { name: 'Lightning', damage: 40, accuracy: 0.9, manaCost: 25 },
            shield: { name: 'Magic Shield', shield: 15, duration: 3, accuracy: 1.0, manaCost: 10 },
            poison: { name: 'Poison', damage: 10, duration: 3, accuracy: 0.9, manaCost: 12 },
            freeze: { name: 'Freeze', freeze: true, duration: 1, accuracy: 0.8, manaCost: 18 }
        };

        this.shopItems = {
            health_potion: { name: 'Health Potion', price: 20, effect: 'heal', value: 50 },
            mana_potion: { name: 'Mana Potion', price: 15, effect: 'mana', value: 25 },
            strength_boost: { name: 'Strength Boost', price: 50, effect: 'damage_boost', value: 10, duration: 3 },
            magic_armor: { name: 'Magic Armor', price: 75, effect: 'damage_reduction', value: 5, permanent: true },
            lucky_charm: { name: 'Lucky Charm', price: 100, effect: 'accuracy_boost', value: 0.2, permanent: true },
            vampire_fang: { name: 'Vampire Fang', price: 120, effect: 'life_steal', value: 0.25, permanent: true }
        };
    }

    createPlayer(socketId, name) {
        const player = {
            id: socketId,
            name: name,
            socket: null,
            health: 100,
            maxHealth: 100,
            mana: 50,
            maxMana: 50,
            coins: 100,
            inventory: {},
            effects: [],
            permanentEffects: {},
            isInGame: false,
            roomId: null
        };
        
        this.players.set(socketId, player);
        return player;
    }

    joinGame(player) {
        // Add to waiting list
        if (!this.waitingPlayers.includes(player.id)) {
            this.waitingPlayers.push(player.id);
        }

        // Try to match players
        if (this.waitingPlayers.length >= 2) {
            const player1Id = this.waitingPlayers.shift();
            const player2Id = this.waitingPlayers.shift();
            
            this.createGameRoom(player1Id, player2Id);
        }
    }

    createGameRoom(player1Id, player2Id) {
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const player1 = this.players.get(player1Id);
        const player2 = this.players.get(player2Id);

        if (!player1 || !player2) return;

        // Reset player stats for new game
        [player1, player2].forEach(player => {
            player.health = 100;
            player.maxHealth = 100;
            player.mana = 50;
            player.maxMana = 50;
            player.effects = [];
            player.isInGame = true;
            player.roomId = roomId;
        });

        const room = {
            id: roomId,
            players: [player1Id, player2Id],
            currentPlayer: player1Id,
            gameStarted: true,
            turnCount: 0
        };

        this.rooms.set(roomId, room);

        // Notify players
        const gameData = {
            roomId: roomId,
            players: {
                [player1Id]: this.getPlayerData(player1),
                [player2Id]: this.getPlayerData(player2)
            },
            currentPlayer: room.currentPlayer
        };

        player1.socket.emit('gameStart', gameData);
        player2.socket.emit('gameStart', gameData);
        player1.socket.join(roomId);
        player2.socket.join(roomId);

        console.log(`Game started: ${player1.name} vs ${player2.name}`);
    }

    useWeapon(playerId, weaponData) {
        const player = this.players.get(playerId);
        if (!player || !player.isInGame) return;

        const room = this.rooms.get(player.roomId);
        if (!room || room.currentPlayer !== playerId) return;

        const opponent = this.getOpponent(playerId);
        if (!opponent) return;

        const weapon = this.weapons[weaponData.weapon];
        const accuracy = this.calculateAccuracy(player, weapon.accuracy);
        const isHit = Math.random() < accuracy;
        
        let damage = 0;
        let actionText = '';

        if (isHit) {
            damage = this.calculateDamage(player, weapon.damage);
            damage = this.applyDamageReduction(opponent, damage);
            opponent.health = Math.max(0, opponent.health - damage);
            
            // Apply life steal if player has vampire fang
            if (player.permanentEffects.life_steal) {
                const healAmount = Math.floor(damage * player.permanentEffects.life_steal);
                player.health = Math.min(player.maxHealth, player.health + healAmount);
            }

            actionText = `⚔️ ${player.name} attacks with ${weapon.name} for ${damage} damage!`;
        } else {
            actionText = `💨 ${player.name} attacks with ${weapon.name} but misses!`;
        }

        this.processTurn(player.roomId, actionText, { damage, target: opponent.id });
    }

    useSkill(playerId, skillData) {
        const player = this.players.get(playerId);
        if (!player || !player.isInGame) return;

        const room = this.rooms.get(player.roomId);
        if (!room || room.currentPlayer !== playerId) return;

        if (player.mana < skillData.manaCost) return;

        const opponent = this.getOpponent(playerId);
        if (!opponent) return;

        const skill = this.skills[skillData.skill];
        player.mana -= skillData.manaCost;

        let actionText = '';
        let actionData = { target: opponent.id };

        if (skillData.damage) {
            // Damage skill
            const accuracy = this.calculateAccuracy(player, skillData.accuracy);
            const isHit = Math.random() < accuracy;
            
            if (isHit) {
                let damage = this.calculateDamage(player, skillData.damage);
                
                if (skillData.skill === 'poison') {
                    // Apply poison effect
                    this.addEffect(opponent, 'poison', skillData.duration, skillData.damage);
                    actionText = `☠️ ${player.name} poisons ${opponent.name}! ${damage} damage per turn for ${skillData.duration} turns!`;
                } else {
                    damage = this.applyDamageReduction(opponent, damage);
                    opponent.health = Math.max(0, opponent.health - damage);
                    actionText = `${skill.name === 'Fireball' ? '🔥' : '⚡'} ${player.name} casts ${skill.name} for ${damage} damage!`;
                }
                actionData.damage = damage;
            } else {
                actionText = `💨 ${player.name} casts ${skill.name} but misses!`;
            }
        } else if (skillData.heal) {
            // Heal skill
            const healAmount = skillData.heal;
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            actionText = `💚 ${player.name} heals for ${healAmount} HP!`;
            actionData.heal = healAmount;
            actionData.target = player.id;
        } else if (skillData.shield) {
            // Shield skill
            this.addEffect(player, 'shield', skillData.duration, skillData.shield);
            actionText = `🛡️ ${player.name} casts Magic Shield! +${skillData.shield} defense for ${skillData.duration} turns!`;
        } else if (skillData.freeze) {
            // Freeze skill
            const accuracy = this.calculateAccuracy(player, skillData.accuracy);
            const isHit = Math.random() < accuracy;
            
            if (isHit) {
                this.addEffect(opponent, 'freeze', skillData.duration, 0);
                actionText = `❄️ ${player.name} freezes ${opponent.name}! Skip next turn!`;
            } else {
                actionText = `💨 ${player.name} casts Freeze but misses!`;
            }
        }

        this.processTurn(player.roomId, actionText, actionData);
    }

    buyItem(playerId, itemData) {
        const player = this.players.get(playerId);
        if (!player || player.coins < itemData.price) return;

        player.coins -= itemData.price;
        
        const item = this.shopItems[itemData.itemType];
        
        if (item.permanent) {
            // Apply permanent effect
            player.permanentEffects[item.effect] = item.value;
        } else {
            // Add to inventory
            if (!player.inventory[itemData.itemType]) {
                player.inventory[itemData.itemType] = 0;
            }
            player.inventory[itemData.itemType]++;
        }

        // Notify player
        player.socket.emit('notification', {
            message: `Purchased ${item.name}!`,
            type: 'success'
        });

        // Update game state if in game
        if (player.isInGame && player.roomId) {
            this.updateGameState(player.roomId, `💰 ${player.name} purchased ${item.name}!`);
        }
    }

    useInventoryItem(playerId, itemData) {
        const player = this.players.get(playerId);
        if (!player || !player.inventory[itemData.itemType] || player.inventory[itemData.itemType] <= 0) return;

        const item = this.shopItems[itemData.itemType];
        player.inventory[itemData.itemType]--;

        let actionText = '';
        let actionData = { target: player.id };

        switch (item.effect) {
            case 'heal':
                player.health = Math.min(player.maxHealth, player.health + item.value);
                actionText = `🧪 ${player.name} uses Health Potion! +${item.value} HP!`;
                actionData.heal = item.value;
                break;
            case 'mana':
                player.mana = Math.min(player.maxMana, player.mana + item.value);
                actionText = `🔮 ${player.name} uses Mana Potion! +${item.value} MP!`;
                break;
            case 'damage_boost':
                this.addEffect(player, 'strength', item.duration, item.value);
                actionText = `💪 ${player.name} uses Strength Boost! +${item.value} damage for ${item.duration} turns!`;
                break;
        }

        if (player.isInGame && player.roomId) {
            this.updateGameState(player.roomId, actionText, actionData);
        }
    }

    processTurn(roomId, actionText, actionData = {}) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Process effects (poison, etc.)
        room.players.forEach(playerId => {
            const player = this.players.get(playerId);
            this.processPlayerEffects(player);
        });

        // Check for game end
        const alivePlayers = room.players.filter(playerId => {
            const player = this.players.get(playerId);
            return player && player.health > 0;
        });

        if (alivePlayers.length <= 1) {
            this.endGame(roomId, alivePlayers[0] || null);
            return;
        }

        // Switch turns (check for freeze effect)
        let nextPlayer = room.players.find(id => id !== room.currentPlayer);
        const nextPlayerObj = this.players.get(nextPlayer);
        
        if (nextPlayerObj && this.hasEffect(nextPlayerObj, 'freeze')) {
            // Skip frozen player's turn
            this.removeEffect(nextPlayerObj, 'freeze');
            actionText += ` ${nextPlayerObj.name} is frozen and skips their turn!`;
        } else {
            room.currentPlayer = nextPlayer;
        }

        room.turnCount++;

        this.updateGameState(roomId, actionText, actionData);
    }

    processPlayerEffects(player) {
        if (!player || !player.effects) return;

        // Process poison damage
        const poisonEffects = player.effects.filter(e => e.type === 'poison');
        poisonEffects.forEach(effect => {
            player.health = Math.max(0, player.health - effect.value);
            effect.duration--;
        });

        // Remove expired effects
        player.effects = player.effects.filter(effect => effect.duration > 0);

        // Regenerate mana each turn
        player.mana = Math.min(player.maxMana, player.mana + 5);
    }

    addEffect(player, type, duration, value) {
        const existingEffect = player.effects.find(e => e.type === type);
        if (existingEffect) {
            existingEffect.duration = duration;
            existingEffect.value = value;
        } else {
            player.effects.push({ type, duration, value });
        }
    }

    removeEffect(player, type) {
        player.effects = player.effects.filter(e => e.type !== type);
    }

    hasEffect(player, type) {
        return player.effects.some(e => e.type === type);
    }

    calculateAccuracy(player, baseAccuracy) {
        let accuracy = baseAccuracy;
        if (player.permanentEffects.accuracy_boost) {
            accuracy += player.permanentEffects.accuracy_boost;
        }
        return Math.min(1, accuracy);
    }

    calculateDamage(player, baseDamage) {
        let damage = baseDamage;
        
        // Apply strength boost
        const strengthEffect = player.effects.find(e => e.type === 'strength');
        if (strengthEffect) {
            damage += strengthEffect.value;
        }
        
        return damage;
    }

    applyDamageReduction(player, damage) {
        let finalDamage = damage;
        
        // Apply shield effect
        const shieldEffect = player.effects.find(e => e.type === 'shield');
        if (shieldEffect) {
            finalDamage = Math.max(0, finalDamage - shieldEffect.value);
        }
        
        // Apply permanent armor
        if (player.permanentEffects.damage_reduction) {
            finalDamage = Math.max(0, finalDamage - player.permanentEffects.damage_reduction);
        }
        
        return finalDamage;
    }

    updateGameState(roomId, lastAction = '', actionData = {}) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const gameData = {
            players: {},
            currentPlayer: room.currentPlayer,
            lastAction: lastAction,
            lastActionData: actionData
        };

        room.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                gameData.players[playerId] = this.getPlayerData(player);
            }
        });

        // Send to all players in room
        io.to(roomId).emit('gameUpdate', gameData);
    }

    endGame(roomId, winnerId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const winner = winnerId ? this.players.get(winnerId) : null;
        const winnerName = winner ? winner.name : 'Draw';

        // Calculate rewards
        const baseCoins = 50;
        const baseXP = 100;

        room.players.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                const isWinner = playerId === winnerId;
                const coins = isWinner ? baseCoins * 2 : baseCoins;
                const xp = isWinner ? baseXP * 1.5 : baseXP;
                
                player.coins += coins;
                player.isInGame = false;
                player.roomId = null;

                player.socket.emit('gameEnd', {
                    winner: winnerId,
                    winnerName: winnerName,
                    rewards: { coins, xp }
                });

                player.socket.leave(roomId);
            }
        });

        this.rooms.delete(roomId);
        console.log(`Game ended: ${winnerName} wins`);
    }

    getOpponent(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.roomId) return null;

        const room = this.rooms.get(player.roomId);
        if (!room) return null;

        const opponentId = room.players.find(id => id !== playerId);
        return this.players.get(opponentId);
    }

    getPlayerData(player) {
        return {
            id: player.id,
            name: player.name,
            health: player.health,
            maxHealth: player.maxHealth,
            mana: player.mana,
            maxMana: player.maxMana,
            coins: player.coins,
            inventory: player.inventory,
            effects: player.effects
        };
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player && player.roomId) {
            // End game if player disconnects
            this.endGame(player.roomId, null);
        }
        
        // Remove from waiting list
        const waitingIndex = this.waitingPlayers.indexOf(playerId);
        if (waitingIndex > -1) {
            this.waitingPlayers.splice(waitingIndex, 1);
        }
        
        this.players.delete(playerId);
    }

    getOnlinePlayers() {
        return Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            isInGame: player.isInGame
        }));
    }
}

// Initialize game server
const gameServer = new GameServer();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', (data) => {
        try {
            const player = gameServer.createPlayer(socket.id, data.playerName);
            player.socket = socket;

            socket.emit('playerJoined', {
                playerId: socket.id,
                playerName: data.playerName
            });

            // Broadcast updated players list
            io.emit('playersUpdate', gameServer.getOnlinePlayers());

            gameServer.joinGame(player);
        } catch (error) {
            console.error('Error joining game:', error);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });

    socket.on('useWeapon', (data) => {
        gameServer.useWeapon(socket.id, data);
    });

    socket.on('useSkill', (data) => {
        gameServer.useSkill(socket.id, data);
    });

    socket.on('buyItem', (data) => {
        gameServer.buyItem(socket.id, data);
    });

    socket.on('useInventoryItem', (data) => {
        gameServer.useInventoryItem(socket.id, data);
    });

    socket.on('playAgain', () => {
        const player = gameServer.players.get(socket.id);
        if (player) {
            gameServer.joinGame(player);
        }
    });

    socket.on('returnToLobby', () => {
        // Player returns to lobby, handled by client
        io.emit('playersUpdate', gameServer.getOnlinePlayers());
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        gameServer.removePlayer(socket.id);
        io.emit('playersUpdate', gameServer.getOnlinePlayers());
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🎮 Enhanced Duel Arena server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to play!`);
});

module.exports = { app, server, io };
