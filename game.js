// Medieval Knight Fighter - Game Engine
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const gameState = {
    player: null,
    enemy: null,
    keys: {},
    mouseButtons: {},
    gameLoop: null,
    playerHealth: 100,
    enemyHealth: 100
};

// Sprite Animation Configuration
const SPRITE_CONFIG = {
    player: {
        idle: { frames: 4, fps: 8, sprite: 'knight_idle.webp' },
        walkForward: { frames: 8, fps: 12, sprite: 'knight_walk_forward.webp' },
        walkBackward: { frames: 8, fps: 12, sprite: 'knight_walk_backward.webp' },
        attack: { frames: 6, fps: 15, sprite: 'knight_attack.webp', damage: 10 },
        block: { frames: 4, fps: 8, sprite: 'knight_block.webp' },
        dodge: { frames: 6, fps: 18, sprite: 'knight_dodge.webp' }
    },
    enemy: {
        idle: { frames: 4, fps: 8, sprite: 'enemy_idle.webp' },
        attack: { frames: 6, fps: 15, sprite: 'enemy_attack.webp', damage: 8 },
        block: { frames: 4, fps: 8, sprite: 'enemy_block.webp' }
    }
};

// Knight Character Class
class Knight {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 64;
        this.isPlayer = isPlayer;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 3;

        // Animation state
        this.currentAnimation = 'idle';
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.animationLocked = false;
        this.animationFinished = false;

        // Combat state
        this.isAttacking = false;
        this.isBlocking = false;
        this.isDodging = false;
        this.canTakeDamage = true;

        // Sprites
        this.sprites = {};
        this.spritesLoaded = false;

        // AI state (for enemy)
        if (!isPlayer) {
            this.ai = {
                state: 'idle',
                timer: 0,
                actionCooldown: 0,
                lastAction: null,
                aggressionLevel: 0.5
            };
        }
    }

    async loadSprites() {
        const config = this.isPlayer ? SPRITE_CONFIG.player : SPRITE_CONFIG.enemy;
        const promises = [];

        for (const [animName, animData] of Object.entries(config)) {
            promises.push(new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.sprites[animName] = {
                        image: img,
                        frames: animData.frames,
                        fps: animData.fps,
                        frameWidth: img.width / animData.frames,
                        frameHeight: img.height,
                        damage: animData.damage || 0
                    };
                    resolve();
                };
                img.onerror = reject;
                img.src = `assets/sprites/${animData.sprite}`;
            }));
        }

        await Promise.all(promises);
        this.spritesLoaded = true;
        console.log(`✓ Loaded ${Object.keys(this.sprites).length} sprites for ${this.isPlayer ? 'Player' : 'Enemy'}`);
    }

    setAnimation(animName, lock = false) {
        if (this.animationLocked && !this.animationFinished) return;

        if (this.currentAnimation !== animName) {
            this.currentAnimation = animName;
            this.currentFrame = 0;
            this.frameTimer = 0;
            this.animationLocked = lock;
            this.animationFinished = false;
        }
    }

    updateAnimation(deltaTime) {
        if (!this.spritesLoaded) return;

        const sprite = this.sprites[this.currentAnimation];
        if (!sprite) return;

        const frameTime = 1000 / sprite.fps;
        this.frameTimer += deltaTime;

        if (this.frameTimer >= frameTime) {
            this.frameTimer = 0;
            this.currentFrame++;

            if (this.currentFrame >= sprite.frames) {
                this.currentFrame = 0;

                if (this.animationLocked) {
                    this.animationFinished = true;
                    this.animationLocked = false;

                    // Reset combat states when animation finishes
                    if (this.currentAnimation === 'attack') {
                        this.isAttacking = false;
                        this.checkAttackHit();
                    } else if (this.currentAnimation === 'dodge') {
                        this.isDodging = false;
                        this.canTakeDamage = true;
                    }

                    this.setAnimation('idle');
                }
            }

            // Trigger attack damage in the middle of attack animation
            if (this.currentAnimation === 'attack' && this.currentFrame === Math.floor(sprite.frames / 2)) {
                this.dealDamage();
            }
        }
    }

    draw(ctx) {
        if (!this.spritesLoaded) {
            // Draw placeholder
            ctx.fillStyle = this.isPlayer ? '#4299e1' : '#e53e3e';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }

        const sprite = this.sprites[this.currentAnimation];
        if (!sprite) return;

        ctx.save();

        // Flip enemy sprite to face left
        if (!this.isPlayer) {
            ctx.translate(this.x + this.width, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(
                sprite.image,
                this.currentFrame * sprite.frameWidth, 0,
                sprite.frameWidth, sprite.frameHeight,
                0, 0,
                this.width, this.height
            );
        } else {
            ctx.drawImage(
                sprite.image,
                this.currentFrame * sprite.frameWidth, 0,
                sprite.frameWidth, sprite.frameHeight,
                this.x, this.y,
                this.width, this.height
            );
        }

        ctx.restore();
    }
    
    checkAttackHit() {
        // Check if attack connects with opponent
        const opponent = this.isPlayer ? gameState.enemy : gameState.player;
        if (!opponent) return;

        const distance = Math.abs(this.x - opponent.x);
        const attackRange = 80;

        if (distance < attackRange && !opponent.isBlocking && opponent.canTakeDamage) {
            const damage = this.sprites[this.currentAnimation].damage;
            if (this.isPlayer) {
                gameState.enemyHealth = Math.max(0, gameState.enemyHealth - damage);
                updateHealthBar('enemy', gameState.enemyHealth);
            } else {
                gameState.playerHealth = Math.max(0, gameState.playerHealth - damage);
                updateHealthBar('player', gameState.playerHealth);
            }
            console.log(`${this.isPlayer ? 'Player' : 'Enemy'} dealt ${damage} damage!`);
        }
    }

    dealDamage() {
        // Called during attack animation
        this.checkAttackHit();
    }

    // Enemy AI Logic
    updateAI(player) {
        if (this.isPlayer || !this.spritesLoaded) return;

        this.ai.timer += 16.67; // ~60fps
        this.ai.actionCooldown = Math.max(0, this.ai.actionCooldown - 16.67);

        if (this.animationLocked) return;

        const distanceToPlayer = player.x - this.x;
        const absDistance = Math.abs(distanceToPlayer);

        // Decision making
        if (this.ai.actionCooldown <= 0) {
            const rand = Math.random();

            if (absDistance < 100) {
                // Close range - attack or block
                if (player.isAttacking && rand > 0.6) {
                    this.performBlock();
                } else if (rand > 0.5) {
                    this.performAttack();
                } else {
                    this.performBlock();
                }
                this.ai.actionCooldown = 1000 + Math.random() * 500;
            } else if (absDistance < 250) {
                // Medium range - approach or attack
                if (rand > 0.7) {
                    this.performAttack();
                    this.ai.actionCooldown = 1200;
                } else {
                    // Move towards player
                    this.velocityX = distanceToPlayer > 0 ? -2 : 2;
                    this.setAnimation('idle');
                    this.ai.actionCooldown = 300;
                }
            } else {
                // Far range - approach
                this.velocityX = distanceToPlayer > 0 ? -2 : 2;
                this.setAnimation('idle');
                this.ai.actionCooldown = 500;
            }
        }

        // Apply velocity
        this.x += this.velocityX;
        this.velocityX *= 0.9; // Friction

        // Keep in bounds
        this.x = Math.max(400, Math.min(700, this.x));
    }

    performAttack() {
        if (this.animationLocked) return;
        this.setAnimation('attack', true);
        this.isAttacking = true;
    }

    performBlock() {
        if (this.animationLocked) return;
        this.setAnimation('block', true);
        this.isBlocking = true;
        setTimeout(() => { this.isBlocking = false; }, 800);
    }

    performDodge() {
        if (this.animationLocked || !this.isPlayer) return;
        this.setAnimation('dodge', true);
        this.isDodging = true;
        this.canTakeDamage = false;

        // Quick movement during dodge
        const dodgeDirection = gameState.keys['a'] ? -1 : 1;
        this.x += dodgeDirection * 60;
    }

    update(deltaTime) {
        this.updateAnimation(deltaTime);

        if (this.isPlayer) {
            // Player movement
            if (!this.animationLocked) {
                if (gameState.keys['a']) {
                    this.x -= this.speed;
                    if (!this.isAttacking && !this.isBlocking) {
                        this.setAnimation('walkBackward');
                    }
                } else if (gameState.keys['d']) {
                    this.x += this.speed;
                    if (!this.isAttacking && !this.isBlocking) {
                        this.setAnimation('walkForward');
                    }
                } else if (!this.isAttacking && !this.isBlocking && !this.isDodging) {
                    this.setAnimation('idle');
                }
            }

            // Keep player in bounds
            this.x = Math.max(50, Math.min(350, this.x));
        }
    }
}

// Health Bar Updates
function updateHealthBar(who, health) {
    const bar = document.getElementById(`${who}Health`);
    if (bar) {
        bar.style.width = `${health}%`;
    }

    // Check for game over
    if (health <= 0) {
        setTimeout(() => {
            alert(`${who === 'player' ? 'Enemy' : 'Player'} Wins! Reloading...`);
            location.reload();
        }, 500);
    }
}

// Input Handling
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key.toLowerCase()] = true;

    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (gameState.player) {
            gameState.player.performDodge();
        }
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();

    if (e.button === 0) { // Left click - Attack
        if (gameState.player) {
            gameState.player.performAttack();
        }
    } else if (e.button === 2) { // Right click - Block
        if (gameState.player) {
            gameState.player.performBlock();
        }
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Game Loop
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Clear canvas
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw arena floor
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 450, canvas.width, 150);
    ctx.strokeStyle = '#c9a961';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 450, canvas.width, 150);

    // Update and draw characters
    if (gameState.player && gameState.enemy) {
        gameState.player.update(deltaTime);
        gameState.enemy.update(deltaTime);
        gameState.enemy.updateAI(gameState.player);

        gameState.player.draw(ctx);
        gameState.enemy.draw(ctx);
    }

    requestAnimationFrame(gameLoop);
}

// Initialize Game
async function initGame() {
    console.log('🎮 Initializing Medieval Knight Fighter...');

    // Create characters
    gameState.player = new Knight(150, 350, true);
    gameState.enemy = new Knight(600, 350, false);

    // Load sprites
    try {
        await gameState.player.loadSprites();
        await gameState.enemy.loadSprites();
        console.log('✓ All sprites loaded successfully!');

        // Start game loop
        requestAnimationFrame(gameLoop);
        console.log('✓ Game started!');
    } catch (error) {
        console.error('✗ Failed to load sprites:', error);
        alert('Failed to load game assets. Please check the console for errors.');
    }
}

// Start the game when page loads
window.addEventListener('load', initGame);
