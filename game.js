// Supabase configuration - Replace with your actual Supabase credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client (will work in demo mode without real credentials)
let supabase = null;
try {
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (error) {
    console.log('Running in demo mode without Supabase connection');
}

// Game state
const gameState = {
    gameId: null,
    playerId: null,
    playerName: '',
    players: {},
    currentTurn: null,
    gameStarted: false,
    gameEnded: false
};

// DOM elements
const screens = {
    lobby: document.getElementById('lobby'),
    gameScreen: document.getElementById('game-screen'),
    gameOver: document.getElementById('game-over')
};

const elements = {
    playerNameInput: document.getElementById('player-name'),
    joinBtn: document.getElementById('join-btn'),
    lobbyStatus: document.getElementById('lobby-status'),
    gameStatus: document.getElementById('game-status'),
    battleLog: document.getElementById('battle-log'),
    turnIndicator: document.getElementById('turn-indicator'),
    weaponBtns: document.querySelectorAll('.weapon-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    player1Name: document.getElementById('player1-name'),
    player2Name: document.getElementById('player2-name'),
    player1Health: document.getElementById('player1-health'),
    player2Health: document.getElementById('player2-health'),
    player1HP: document.getElementById('player1-hp'),
    player2HP: document.getElementById('player2-hp'),
    player1Avatar: document.getElementById('player1-avatar'),
    player2Avatar: document.getElementById('player2-avatar'),
    winnerText: document.getElementById('winner-text')
};

// Weapon data
const weapons = {
    sword: { name: 'Sword', emoji: '⚔️', damage: 25, accuracy: 0.8 },
    axe: { name: 'Axe', emoji: '🪓', damage: 30, accuracy: 0.7 },
    bow: { name: 'Bow', emoji: '🏹', damage: 20, accuracy: 0.9 },
    dagger: { name: 'Dagger', emoji: '🗡️', damage: 15, accuracy: 0.95 }
};

// Event listeners
elements.joinBtn.addEventListener('click', joinGame);
elements.playAgainBtn.addEventListener('click', resetGame);
elements.playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
});

elements.weaponBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const weapon = e.target.getAttribute('data-weapon');
        if (weapon && !gameState.gameEnded) {
            makeAttack(weapon);
        }
    });
});

// Initialize game
function init() {
    showScreen('lobby');
    elements.playerNameInput.focus();
    
    // Demo mode notification if no Supabase connection
    if (!supabase) {
        elements.lobbyStatus.textContent = 'Demo Mode: Playing against AI opponent';
        elements.lobbyStatus.style.color = '#ffd700';
    }
}

// Screen management
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Join game function
async function joinGame() {
    const playerName = elements.playerNameInput.value.trim();
    
    if (!playerName) {
        alert('Please enter your name!');
        return;
    }
    
    gameState.playerName = playerName;
    gameState.playerId = generateId();
    
    elements.joinBtn.disabled = true;
    elements.lobbyStatus.textContent = 'Joining game...';
    
    if (supabase) {
        await joinOnlineGame();
    } else {
        // Demo mode - play against AI
        startDemoGame();
    }
}

// Generate unique ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Demo game (offline mode)
function startDemoGame() {
    gameState.gameId = generateId();
    gameState.players = {
        [gameState.playerId]: {
            id: gameState.playerId,
            name: gameState.playerName,
            health: 100,
            isAI: false
        },
        'ai': {
            id: 'ai',
            name: 'AI Opponent',
            health: 100,
            isAI: true
        }
    };
    
    gameState.currentTurn = gameState.playerId;
    gameState.gameStarted = true;
    
    startGame();
}

// Online game with Supabase
async function joinOnlineGame() {
    try {
        // Create or join a game room
        const { data: existingGame } = await supabase
            .from('games')
            .select('*')
            .eq('status', 'waiting')
            .limit(1)
            .single();
        
        if (existingGame) {
            // Join existing game
            gameState.gameId = existingGame.id;
            await joinExistingGame(existingGame);
        } else {
            // Create new game
            await createNewGame();
        }
        
        setupRealtimeSubscription();
    } catch (error) {
        console.error('Error joining online game:', error);
        elements.lobbyStatus.textContent = 'Connection failed. Starting demo mode...';
        setTimeout(startDemoGame, 2000);
    }
}

// Start the game
function startGame() {
    showScreen('gameScreen');
    updateUI();
    addToBattleLog('🎮 Game started! Choose your weapon to attack!');
    elements.gameStatus.textContent = 'Battle in progress...';
}

// Make an attack
function makeAttack(weaponType) {
    if (gameState.currentTurn !== gameState.playerId || gameState.gameEnded) {
        return;
    }
    
    const weapon = weapons[weaponType];
    const isHit = Math.random() < weapon.accuracy;
    const damage = isHit ? weapon.damage : 0;
    
    // Find opponent
    const opponents = Object.values(gameState.players).filter(p => p.id !== gameState.playerId);
    const opponent = opponents[0];
    
    if (opponent) {
        // Apply damage
        if (isHit) {
            opponent.health = Math.max(0, opponent.health - damage);
            addToBattleLog(`⚔️ ${gameState.players[gameState.playerId].name} attacks with ${weapon.emoji} ${weapon.name} for ${damage} damage!`);
            showDamageAnimation(opponent.id === 'ai' ? 'player2' : 'player1', damage);
        } else {
            addToBattleLog(`💨 ${gameState.players[gameState.playerId].name} attacks with ${weapon.emoji} ${weapon.name} but misses!`);
        }
        
        updateUI();
        
        // Check for game over
        if (opponent.health <= 0) {
            endGame(gameState.playerId);
            return;
        }
        
        // Switch turns
        gameState.currentTurn = opponent.id;
        updateTurnUI();
        
        if (supabase) {
            updateGameState();
        } else {
            // AI turn in demo mode
            setTimeout(makeAIMove, 1500);
        }
    }
}

// AI move (demo mode)
function makeAIMove() {
    if (gameState.currentTurn !== 'ai' || gameState.gameEnded) {
        return;
    }
    
    const weaponTypes = Object.keys(weapons);
    const randomWeapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    const weapon = weapons[randomWeapon];
    
    const isHit = Math.random() < weapon.accuracy;
    const damage = isHit ? weapon.damage : 0;
    
    const player = gameState.players[gameState.playerId];
    
    if (isHit) {
        player.health = Math.max(0, player.health - damage);
        addToBattleLog(`🤖 ${gameState.players.ai.name} attacks with ${weapon.emoji} ${weapon.name} for ${damage} damage!`);
        showDamageAnimation('player1', damage);
    } else {
        addToBattleLog(`💨 ${gameState.players.ai.name} attacks with ${weapon.emoji} ${weapon.name} but misses!`);
    }
    
    updateUI();
    
    // Check for game over
    if (player.health <= 0) {
        endGame('ai');
        return;
    }
    
    // Switch back to player turn
    gameState.currentTurn = gameState.playerId;
    updateTurnUI();
}

// Update UI
function updateUI() {
    const playerIds = Object.keys(gameState.players);
    const player1 = gameState.players[playerIds[0]];
    const player2 = gameState.players[playerIds[1]];
    
    if (player1) {
        elements.player1Name.textContent = player1.name;
        elements.player1HP.textContent = player1.health;
        const healthPercent = (player1.health / 100) * 100;
        elements.player1Health.style.width = `${healthPercent}%`;
    }
    
    if (player2) {
        elements.player2Name.textContent = player2.name;
        elements.player2HP.textContent = player2.health;
        const healthPercent = (player2.health / 100) * 100;
        elements.player2Health.style.width = `${healthPercent}%`;
    }
    
    updateTurnUI();
}

// Update turn UI
function updateTurnUI() {
    const isMyTurn = gameState.currentTurn === gameState.playerId;
    
    elements.turnIndicator.textContent = isMyTurn ? 'Your Turn!' : 'Opponent\'s Turn';
    elements.turnIndicator.style.background = isMyTurn ? 
        'linear-gradient(45deg, #ffd700, #ffed4a)' : 
        'linear-gradient(45deg, #ff6b6b, #ee5a24)';
    
    // Disable/enable weapon buttons
    document.querySelector('.weapons-container').classList.toggle('turn-disabled', !isMyTurn);
}

// Add message to battle log
function addToBattleLog(message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    elements.battleLog.appendChild(logEntry);
    elements.battleLog.scrollTop = elements.battleLog.scrollHeight;
}

// Show damage animation
function showDamageAnimation(targetPlayer, damage) {
    const avatar = targetPlayer === 'player1' ? elements.player1Avatar : elements.player2Avatar;
    
    // Add attack animation to avatar
    avatar.classList.add('attack-animation');
    setTimeout(() => avatar.classList.remove('attack-animation'), 600);
    
    // Show damage text
    const damageText = document.createElement('div');
    damageText.className = 'damage-text';
    damageText.textContent = `-${damage}`;
    damageText.style.left = '50%';
    damageText.style.top = '50%';
    
    avatar.style.position = 'relative';
    avatar.appendChild(damageText);
    
    setTimeout(() => damageText.remove(), 1000);
}

// End game
function endGame(winnerId) {
    gameState.gameEnded = true;
    
    const winner = gameState.players[winnerId];
    const winnerName = winner ? winner.name : 'Unknown';
    
    if (winnerId === gameState.playerId) {
        elements.winnerText.textContent = `🎉 Victory! ${winnerName} Wins! 🎉`;
        addToBattleLog(`🏆 ${winnerName} wins the duel!`);
    } else {
        elements.winnerText.textContent = `💀 Defeat! ${winnerName} Wins! 💀`;
        addToBattleLog(`💀 ${winnerName} wins the duel!`);
    }
    
    setTimeout(() => showScreen('gameOver'), 2000);
}

// Reset game
function resetGame() {
    gameState.gameId = null;
    gameState.playerId = null;
    gameState.players = {};
    gameState.currentTurn = null;
    gameState.gameStarted = false;
    gameState.gameEnded = false;
    
    elements.battleLog.innerHTML = '';
    elements.playerNameInput.value = '';
    elements.joinBtn.disabled = false;
    elements.lobbyStatus.textContent = '';
    
    showScreen('lobby');
    elements.playerNameInput.focus();
}

// Supabase real-time functions (for online multiplayer)
async function createNewGame() {
    const { data, error } = await supabase
        .from('games')
        .insert([
            {
                status: 'waiting',
                player1_id: gameState.playerId,
                player1_name: gameState.playerName,
                player1_health: 100,
                current_turn: gameState.playerId
            }
        ])
        .select()
        .single();
    
    if (error) throw error;
    
    gameState.gameId = data.id;
    elements.lobbyStatus.textContent = 'Waiting for another player...';
}

async function joinExistingGame(game) {
    const { error } = await supabase
        .from('games')
        .update({
            status: 'active',
            player2_id: gameState.playerId,
            player2_name: gameState.playerName,
            player2_health: 100
        })
        .eq('id', game.id);
    
    if (error) throw error;
    
    // Set up players
    gameState.players = {
        [game.player1_id]: {
            id: game.player1_id,
            name: game.player1_name,
            health: game.player1_health
        },
        [gameState.playerId]: {
            id: gameState.playerId,
            name: gameState.playerName,
            health: 100
        }
    };
    
    gameState.currentTurn = game.current_turn;
    gameState.gameStarted = true;
    
    startGame();
}

function setupRealtimeSubscription() {
    if (!supabase) return;
    
    supabase
        .channel('game_updates')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameState.gameId}` },
            handleGameUpdate
        )
        .subscribe();
}

function handleGameUpdate(payload) {
    const gameData = payload.new;
    
    if (gameData.status === 'active' && !gameState.gameStarted) {
        // Game started
        gameState.players = {
            [gameData.player1_id]: {
                id: gameData.player1_id,
                name: gameData.player1_name,
                health: gameData.player1_health
            },
            [gameData.player2_id]: {
                id: gameData.player2_id,
                name: gameData.player2_name,
                health: gameData.player2_health
            }
        };
        
        gameState.currentTurn = gameData.current_turn;
        gameState.gameStarted = true;
        
        startGame();
    } else if (gameData.status === 'active') {
        // Update game state
        gameState.players[gameData.player1_id].health = gameData.player1_health;
        gameState.players[gameData.player2_id].health = gameData.player2_health;
        gameState.currentTurn = gameData.current_turn;
        
        updateUI();
        
        // Check for winner
        if (gameData.winner) {
            endGame(gameData.winner);
        }
    }
}

async function updateGameState() {
    if (!supabase || !gameState.gameId) return;
    
    const playerIds = Object.keys(gameState.players);
    const updateData = {
        player1_health: gameState.players[playerIds[0]].health,
        player2_health: gameState.players[playerIds[1]].health,
        current_turn: gameState.currentTurn
    };
    
    // Check for winner
    if (gameState.players[playerIds[0]].health <= 0) {
        updateData.winner = playerIds[1];
        updateData.status = 'finished';
    } else if (gameState.players[playerIds[1]].health <= 0) {
        updateData.winner = playerIds[0];
        updateData.status = 'finished';
    }
    
    await supabase
        .from('games')
        .update(updateData)
        .eq('id', gameState.gameId);
}

// Initialize the game when page loads
init();
