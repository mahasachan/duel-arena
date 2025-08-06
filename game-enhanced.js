// Enhanced Game Client with WebSocket support
class EnhancedDuelGame {
    constructor() {
        this.socket = null;
        this.gameState = {
            playerId: null,
            playerName: '',
            roomId: null,
            isInGame: false,
            myTurn: false,
            gameStarted: false,
            players: {},
            myStats: {
                health: 100,
                maxHealth: 100,
                mana: 50,
                maxMana: 50,
                coins: 100,
                inventory: {},
                effects: []
            }
        };

        this.weapons = {
            sword: { name: 'Iron Sword', emoji: '⚔️', damage: 25, accuracy: 0.8, manaCost: 0 },
            axe: { name: 'Battle Axe', emoji: '🪓', damage: 30, accuracy: 0.7, manaCost: 0 },
            bow: { name: 'Elven Bow', emoji: '🏹', damage: 20, accuracy: 0.9, manaCost: 0 },
            dagger: { name: 'Swift Dagger', emoji: '🗡️', damage: 15, accuracy: 0.95, manaCost: 0 }
        };

        this.skills = {
            fireball: { name: 'Fireball', emoji: '🔥', damage: 35, accuracy: 0.85, manaCost: 15 },
            heal: { name: 'Heal', emoji: '💚', heal: 25, accuracy: 1.0, manaCost: 20 },
            lightning: { name: 'Lightning', emoji: '⚡', damage: 40, accuracy: 0.9, manaCost: 25 },
            shield: { name: 'Magic Shield', emoji: '🛡️', shield: 15, duration: 3, accuracy: 1.0, manaCost: 10 },
            poison: { name: 'Poison', emoji: '☠️', damage: 10, duration: 3, accuracy: 0.9, manaCost: 12 },
            freeze: { name: 'Freeze', emoji: '❄️', freeze: true, duration: 1, accuracy: 0.8, manaCost: 18 }
        };

        this.shopItems = {
            health_potion: { name: 'Health Potion', icon: '🧪', price: 20, effect: 'heal', value: 50 },
            mana_potion: { name: 'Mana Potion', icon: '🔮', price: 15, effect: 'mana', value: 25 },
            strength_boost: { name: 'Strength Boost', icon: '💪', price: 50, effect: 'damage_boost', value: 10, duration: 3 },
            magic_armor: { name: 'Magic Armor', icon: '🛡️', price: 75, effect: 'damage_reduction', value: 5, permanent: true },
            lucky_charm: { name: 'Lucky Charm', icon: '🍀', price: 100, effect: 'accuracy_boost', value: 0.2, permanent: true },
            vampire_fang: { name: 'Vampire Fang', icon: '🧛', price: 120, effect: 'life_steal', value: 0.25, permanent: true }
        };

        this.currentTab = 'weapons';
        this.initializeDOM();
        this.initializeSocket();
    }

    initializeDOM() {
        this.elements = {
            // Screens
            lobby: document.getElementById('lobby'),
            gameScreen: document.getElementById('game-screen'),
            gameOver: document.getElementById('game-over'),
            
            // Lobby elements
            playerNameInput: document.getElementById('player-name'),
            joinBtn: document.getElementById('join-btn'),
            lobbyStatus: document.getElementById('lobby-status'),
            playerCount: document.getElementById('player-count'),
            playersList: document.getElementById('players-list'),
            
            // Game elements
            gameStatus: document.getElementById('game-status'),
            connectionStatus: document.getElementById('connection-status'),
            turnIndicator: document.getElementById('turn-indicator'),
            battleLog: document.getElementById('battle-log'),
            
            // Player stats
            player1Name: document.getElementById('player1-name'),
            player2Name: document.getElementById('player2-name'),
            player1Health: document.getElementById('player1-health'),
            player2Health: document.getElementById('player2-health'),
            player1Mana: document.getElementById('player1-mana'),
            player2Mana: document.getElementById('player2-mana'),
            player1HP: document.getElementById('player1-hp'),
            player2HP: document.getElementById('player2-hp'),
            player1MP: document.getElementById('player1-mp'),
            player2MP: document.getElementById('player2-mp'),
            player1Coins: document.getElementById('player1-coins'),
            player2Coins: document.getElementById('player2-coins'),
            player1Avatar: document.getElementById('player1-avatar'),
            player2Avatar: document.getElementById('player2-avatar'),
            player1Effects: document.getElementById('player1-effects'),
            player2Effects: document.getElementById('player2-effects'),
            
            // Action panels
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            weaponBtns: document.querySelectorAll('.weapon-btn'),
            skillBtns: document.querySelectorAll('.skill-btn'),
            buyBtns: document.querySelectorAll('.buy-btn'),
            inventoryItems: document.getElementById('inventory-items'),
            
            // Game over
            winnerText: document.getElementById('winner-text'),
            coinsEarned: document.getElementById('coins-earned'),
            xpEarned: document.getElementById('xp-earned'),
            playAgainBtn: document.getElementById('play-again-btn'),
            returnLobbyBtn: document.getElementById('return-lobby-btn'),
            
            // Notifications
            notifications: document.getElementById('notifications')
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Lobby events
        this.elements.joinBtn.addEventListener('click', () => this.joinGame());
        this.elements.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });

        // Tab switching
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Weapon actions
        this.elements.weaponBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weapon = e.target.getAttribute('data-weapon');
                if (weapon && this.gameState.myTurn) {
                    this.useWeapon(weapon);
                }
            });
        });

        // Skill actions
        this.elements.skillBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skill = e.target.getAttribute('data-skill');
                const manaCost = parseInt(e.target.getAttribute('data-mana'));
                if (skill && this.gameState.myTurn && this.gameState.myStats.mana >= manaCost) {
                    this.useSkill(skill);
                }
            });
        });

        // Shop actions
        this.elements.buyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.shop-item').getAttribute('data-item');
                const price = parseInt(e.target.closest('.shop-item').getAttribute('data-price'));
                if (this.gameState.myStats.coins >= price) {
                    this.buyItem(item, price);
                }
            });
        });

        // Game over actions
        this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.elements.returnLobbyBtn.addEventListener('click', () => this.returnToLobby());

        // Inventory item usage
        this.elements.inventoryItems.addEventListener('click', (e) => {
            const inventoryItem = e.target.closest('.inventory-item');
            if (inventoryItem) {
                const itemType = inventoryItem.getAttribute('data-item');
                this.useInventoryItem(itemType);
            }
        });
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.updateConnectionStatus(true);
                this.elements.gameStatus.textContent = 'Connected to server';
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.updateConnectionStatus(false);
                this.elements.gameStatus.textContent = 'Disconnected from server';
            });

            this.socket.on('playerJoined', (data) => {
                this.gameState.playerId = data.playerId;
                this.gameState.playerName = data.playerName;
                this.showScreen('lobby');
                this.showNotification('Joined successfully!', 'success');
            });

            this.socket.on('playersUpdate', (players) => {
                this.updatePlayersList(players);
            });

            this.socket.on('gameStart', (gameData) => {
                this.startGame(gameData);
            });

            this.socket.on('gameUpdate', (gameData) => {
                this.updateGameState(gameData);
            });

            this.socket.on('gameEnd', (result) => {
                this.endGame(result);
            });

            this.socket.on('notification', (data) => {
                this.showNotification(data.message, data.type);
            });

            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
                this.showNotification(error.message || 'Connection error', 'error');
            });

        } catch (error) {
            console.error('Failed to initialize socket:', error);
            this.elements.gameStatus.textContent = 'Failed to connect to server';
            this.updateConnectionStatus(false);
        }
    }

    // Game Flow Methods
    joinGame() {
        const playerName = this.elements.playerNameInput.value.trim();
        if (!playerName) {
            this.showNotification('Please enter your name!', 'warning');
            return;
        }

        if (this.socket && this.socket.connected) {
            this.socket.emit('joinGame', { playerName });
            this.elements.joinBtn.disabled = true;
            this.elements.lobbyStatus.textContent = 'Joining game...';
        } else {
            this.showNotification('Not connected to server', 'error');
        }
    }

    startGame(gameData) {
        this.gameState.isInGame = true;
        this.gameState.gameStarted = true;
        this.gameState.roomId = gameData.roomId;
        this.gameState.players = gameData.players;
        this.gameState.myTurn = gameData.currentPlayer === this.gameState.playerId;
        
        this.showScreen('gameScreen');
        this.updateUI();
        this.addToBattleLog('🎮 Battle begins! Choose your action!');
        this.elements.gameStatus.textContent = 'Battle in progress';
    }

    useWeapon(weaponType) {
        if (!this.gameState.myTurn) return;

        const weapon = this.weapons[weaponType];
        this.socket.emit('useWeapon', {
            weapon: weaponType,
            damage: weapon.damage,
            accuracy: weapon.accuracy,
            manaCost: weapon.manaCost
        });

        this.gameState.myTurn = false;
        this.updateTurnUI();
    }

    useSkill(skillType) {
        if (!this.gameState.myTurn) return;

        const skill = this.skills[skillType];
        if (this.gameState.myStats.mana < skill.manaCost) {
            this.showNotification('Not enough mana!', 'warning');
            return;
        }

        this.socket.emit('useSkill', {
            skill: skillType,
            damage: skill.damage,
            heal: skill.heal,
            shield: skill.shield,
            duration: skill.duration,
            accuracy: skill.accuracy,
            manaCost: skill.manaCost,
            freeze: skill.freeze
        });

        this.gameState.myTurn = false;
        this.updateTurnUI();
    }

    buyItem(itemType, price) {
        if (this.gameState.myStats.coins < price) {
            this.showNotification('Not enough gold!', 'warning');
            return;
        }

        this.socket.emit('buyItem', { itemType, price });
    }

    useInventoryItem(itemType) {
        if (!this.gameState.myStats.inventory[itemType] || this.gameState.myStats.inventory[itemType] <= 0) {
            this.showNotification('Item not available!', 'warning');
            return;
        }

        this.socket.emit('useInventoryItem', { itemType });
    }

    // UI Update Methods
    updateGameState(gameData) {
        this.gameState.players = gameData.players;
        this.gameState.myTurn = gameData.currentPlayer === this.gameState.playerId;
        
        // Update player stats
        const myData = gameData.players[this.gameState.playerId];
        if (myData) {
            this.gameState.myStats = myData;
        }

        this.updateUI();
        this.updateTurnUI();

        if (gameData.lastAction) {
            this.addToBattleLog(gameData.lastAction);
            this.showBattleAnimation(gameData.lastAction);
        }
    }

    updateUI() {
        const playerIds = Object.keys(this.gameState.players);
        const player1Data = this.gameState.players[playerIds[0]];
        const player2Data = this.gameState.players[playerIds[1]];

        if (player1Data) {
            this.elements.player1Name.textContent = player1Data.name;
            this.elements.player1HP.textContent = `${player1Data.health}/${player1Data.maxHealth}`;
            this.elements.player1MP.textContent = `${player1Data.mana}/${player1Data.maxMana}`;
            this.elements.player1Coins.textContent = player1Data.coins;

            const healthPercent = (player1Data.health / player1Data.maxHealth) * 100;
            const manaPercent = (player1Data.mana / player1Data.maxMana) * 100;
            this.elements.player1Health.style.width = `${healthPercent}%`;
            this.elements.player1Mana.style.width = `${manaPercent}%`;

            this.updatePlayerEffects('player1', player1Data.effects || []);
        }

        if (player2Data) {
            this.elements.player2Name.textContent = player2Data.name;
            this.elements.player2HP.textContent = `${player2Data.health}/${player2Data.maxHealth}`;
            this.elements.player2MP.textContent = `${player2Data.mana}/${player2Data.maxMana}`;
            this.elements.player2Coins.textContent = player2Data.coins;

            const healthPercent = (player2Data.health / player2Data.maxHealth) * 100;
            const manaPercent = (player2Data.mana / player2Data.maxMana) * 100;
            this.elements.player2Health.style.width = `${healthPercent}%`;
            this.elements.player2Mana.style.width = `${manaPercent}%`;

            this.updatePlayerEffects('player2', player2Data.effects || []);
        }

        this.updateSkillButtons();
        this.updateShopButtons();
        this.updateInventory();
    }

    updateTurnUI() {
        const isMyTurn = this.gameState.myTurn;
        this.elements.turnIndicator.textContent = isMyTurn ? 'Your Turn!' : "Opponent's Turn";
        this.elements.turnIndicator.style.background = isMyTurn ? 
            'linear-gradient(45deg, #ffd700, #ffed4a)' : 
            'linear-gradient(45deg, #ff6b6b, #ee5a24)';

        // Enable/disable action buttons
        const actionPanel = document.querySelector('.action-panel');
        actionPanel.classList.toggle('turn-disabled', !isMyTurn);
    }

    updatePlayerEffects(playerNum, effects) {
        const effectsContainer = this.elements[`${playerNum}Effects`];
        effectsContainer.innerHTML = '';

        effects.forEach(effect => {
            const effectIcon = document.createElement('div');
            effectIcon.className = 'effect-icon';
            effectIcon.style.background = this.getEffectColor(effect.type);
            effectIcon.textContent = this.getEffectIcon(effect.type);
            effectIcon.title = `${effect.type}: ${effect.duration} turns`;
            effectsContainer.appendChild(effectIcon);
        });
    }

    updateSkillButtons() {
        this.elements.skillBtns.forEach(btn => {
            const manaCost = parseInt(btn.getAttribute('data-mana'));
            const canUse = this.gameState.myStats.mana >= manaCost;
            btn.disabled = !canUse || !this.gameState.myTurn;
            
            if (!canUse) {
                btn.style.opacity = '0.5';
            } else {
                btn.style.opacity = '1';
            }
        });
    }

    updateShopButtons() {
        this.elements.buyBtns.forEach(btn => {
            const price = parseInt(btn.closest('.shop-item').getAttribute('data-price'));
            const canBuy = this.gameState.myStats.coins >= price;
            btn.disabled = !canBuy;
            
            if (!canBuy) {
                btn.style.opacity = '0.5';
            } else {
                btn.style.opacity = '1';
            }
        });
    }

    updateInventory() {
        const inventory = this.gameState.myStats.inventory || {};
        const inventoryContainer = this.elements.inventoryItems;
        
        inventoryContainer.innerHTML = '';
        
        if (Object.keys(inventory).length === 0) {
            inventoryContainer.innerHTML = '<div class="inventory-empty">Your inventory is empty</div>';
            return;
        }

        Object.entries(inventory).forEach(([itemType, quantity]) => {
            if (quantity > 0) {
                const item = this.shopItems[itemType];
                const itemElement = document.createElement('div');
                itemElement.className = 'inventory-item';
                itemElement.setAttribute('data-item', itemType);
                itemElement.innerHTML = `
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-name">${item.name}</div>
                    <div class="item-quantity">${quantity}</div>
                `;
                inventoryContainer.appendChild(itemElement);
            }
        });
    }

    updatePlayersList(players) {
        this.elements.playerCount.textContent = players.length;
        this.elements.playersList.innerHTML = '';
        
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            if (player.id === this.gameState.playerId) {
                li.style.fontWeight = 'bold';
                li.style.color = '#ffd700';
            }
            this.elements.playersList.appendChild(li);
        });
    }

    // UI Helper Methods
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });
        
        // Update tab contents
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    showScreen(screenName) {
        const screens = [this.elements.lobby, this.elements.gameScreen, this.elements.gameOver];
        screens.forEach(screen => screen.classList.remove('active'));
        this.elements[screenName].classList.add('active');
    }

    addToBattleLog(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        this.elements.battleLog.appendChild(logEntry);
        this.elements.battleLog.scrollTop = this.elements.battleLog.scrollHeight;
    }

    showBattleAnimation(actionData) {
        if (actionData.damage > 0) {
            const targetPlayer = actionData.target === this.gameState.playerId ? 'player1' : 'player2';
            const avatar = this.elements[`${targetPlayer}Avatar`];
            
            // Attack animation
            avatar.classList.add('attack-animation');
            setTimeout(() => avatar.classList.remove('attack-animation'), 600);
            
            // Damage text
            this.showDamageText(avatar, actionData.damage, false);
        }
        
        if (actionData.heal > 0) {
            const targetPlayer = actionData.target === this.gameState.playerId ? 'player1' : 'player2';
            const avatar = this.elements[`${targetPlayer}Avatar`];
            this.showDamageText(avatar, actionData.heal, true);
        }
    }

    showDamageText(avatar, amount, isHeal = false) {
        const damageText = document.createElement('div');
        damageText.className = `damage-text ${isHeal ? 'heal-text' : ''}`;
        damageText.textContent = `${isHeal ? '+' : '-'}${amount}`;
        damageText.style.left = '50%';
        damageText.style.top = '50%';
        
        avatar.style.position = 'relative';
        avatar.appendChild(damageText);
        
        setTimeout(() => damageText.remove(), 1000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.elements.notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    updateConnectionStatus(connected) {
        const status = this.elements.connectionStatus;
        status.classList.toggle('connected', connected);
        status.classList.toggle('disconnected', !connected);
        status.querySelector('span').textContent = connected ? 'Connected' : 'Disconnected';
    }

    getEffectColor(effectType) {
        const colors = {
            shield: '#64ffda',
            poison: '#9c27b0',
            freeze: '#42a5f5',
            strength: '#ff6b6b',
            armor: '#ffd700'
        };
        return colors[effectType] || '#ccc';
    }

    getEffectIcon(effectType) {
        const icons = {
            shield: '🛡️',
            poison: '☠️',
            freeze: '❄️',
            strength: '💪',
            armor: '🛡️'
        };
        return icons[effectType] || '✨';
    }

    // Game End Methods
    endGame(result) {
        this.gameState.gameStarted = false;
        this.gameState.isInGame = false;
        
        const isWinner = result.winner === this.gameState.playerId;
        this.elements.winnerText.textContent = isWinner ? 
            `🎉 Victory! ${result.winnerName} Wins! 🎉` : 
            `💀 Defeat! ${result.winnerName} Wins! 💀`;
        
        this.elements.coinsEarned.textContent = result.rewards.coins;
        this.elements.xpEarned.textContent = result.rewards.xp;
        
        this.addToBattleLog(`🏆 ${result.winnerName} wins the duel!`);
        
        setTimeout(() => {
            this.showScreen('gameOver');
        }, 2000);
    }

    playAgain() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('playAgain');
            this.showScreen('lobby');
        }
    }

    returnToLobby() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('returnToLobby');
        }
        this.resetGame();
        this.showScreen('lobby');
    }

    resetGame() {
        this.gameState.isInGame = false;
        this.gameState.gameStarted = false;
        this.gameState.myTurn = false;
        this.gameState.players = {};
        
        this.elements.battleLog.innerHTML = '';
        this.elements.playerNameInput.value = '';
        this.elements.joinBtn.disabled = false;
        this.elements.lobbyStatus.textContent = '';
        
        this.switchTab('weapons');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new EnhancedDuelGame();
});
