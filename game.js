// Medieval Knight Fighter - Rebuilt Game Engine
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Game Configuration
const GAME_CONFIG = {
    currentStage: 1,
    stages: [
        { name: 'Castle Arena', bg: 'assets/stages/stage1_castle.webp' },
        { name: 'Dark Dungeon', bg: 'assets/stages/stage2_dungeon.webp' },
        { name: 'Royal Courtyard', bg: 'assets/stages/stage3_courtyard.webp' }
    ],
    playerHealth: 100,
    enemyHealth: 100,
    particl

es: [],
    gameOver: false
};

// Sprite animation class with smooth frame interpolation
class AnimatedSprite {
    constructor(imagePath, frameCount, frameWidth, frameHeight) {
        this.image = new Image();
        this.image.src = imagePath;
        this.frameCount = frameCount;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDuration = 80; // ms per frame
        this.loaded = false;
        this.image.onload = () => { this.loaded = true; };
    }

    update(deltaTime) {
        this.frameTimer += deltaTime;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        }
    }

    draw(ctx, x, y, scale = 1, flipX = false) {
        if (!this.loaded) return;

        ctx.save();
        if (flipX) {
            ctx.translate(x + (this.frameWidth * scale), y);
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.image,
                this.currentFrame * this.frameWidth, 0,
                this.frameWidth, this.frameHeight,
                0, 0,
                this.frameWidth * scale, this.frameHeight * scale
            );
        } else {
            ctx.drawImage(
                this.image,
                this.currentFrame * this.frameWidth, 0,
                this.frameWidth, this.frameHeight,
                x, y,
                this.frameWidth * scale, this.frameHeight * scale
            );
        }
        ctx.restore();
    }

    reset() {
        this.currentFrame = 0;
        this.frameTimer = 0;
    }
}

// Fighter character class
class Fighter {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.width = 192; // 64 * 3 scale
        this.height = 192;
        this.isPlayer = isPlayer;

        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 4;
        this.gravity = 0.5;
        this.jumpPower = -12;
        this.grounded = false;

        // Combat
        this.attacking = false;
        this.blocking = false;
        this.dodging = false;
        this.attackCooldown = 0;
        this.dodgeCooldown = 0;
        this.invincible = false;

        // Animation state
        this.currentState = 'idle';
        this.animations = {};
        this.currentAnim = null;
        this.animLocked = false;

        // Load sprites
        this.loadSprites();

        // AI (for enemy)
        if (!isPlayer) {
            this.ai = {
                state: 'idle',
                timer: 0,
                attackRange: 220,
                retreatDistance: 100
            };
        }
    }

    loadSprites() {
        const prefix = this.isPlayer ? 'knight' : 'enemy';
        this.animations = {
            idle: new AnimatedSprite(`assets/sprites/${prefix}_idle.webp`, 4, 64, 64),
            walkForward: new AnimatedSprite(`assets/sprites/knight_walk_forward.webp`, 8, 64, 64),
            walkBackward: new AnimatedSprite(`assets/sprites/knight_walk_backward.webp`, 8, 64, 64),
            attack: new AnimatedSprite(`assets/sprites/${prefix}_attack.webp`, 6, 64, 64),
            block: new AnimatedSprite(`assets/sprites/${prefix}_block.webp`, 4, 64, 64),
            dodge: new AnimatedSprite(`assets/sprites/knight_dodge.webp`, 6, 64, 64)
        };
        this.currentAnim = this.animations.idle;
    }

    setState(newState, lock = false) {
        if (this.animLocked && !['idle'].includes(newState)) return;

        if (this.currentState !== newState) {
            this.currentState = newState;
            this.currentAnim = this.animations[newState] || this.animations.idle;
            this.currentAnim.reset();
            this.animLocked = lock;
        }
    }

    update(deltaTime, opponent) {
        // Update cooldowns
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        this.dodgeCooldown = Math.max(0, this.dodgeCooldown - deltaTime);

        // Update animation
        if (this.currentAnim) {
            this.currentAnim.update(deltaTime);

            // Unlock animation when it completes
            if (this.animLocked && this.currentAnim.currentFrame === 0 && this.currentAnim.frameTimer > 10) {
                this.animLocked = false;
                this.attacking = false;
                this.dodging = false;
                this.invincible = false;
                this.setState('idle');
            }
        }

        // AI for enemy
        if (!this.isPlayer && opponent) {
            this.updateAI(opponent, deltaTime);
        }

        // Physics
        this.velocityY += this.gravity;
        this.y += this.velocityY;
        this.x += this.velocityX;

        // Ground collision
        const groundY = 380;
        if (this.y >= groundY) {
            this.y = groundY;
            this.velocityY = 0;
            this.grounded = true;
        }

        // Boundary
        this.x = Math.max(50, Math.min(canvas.width - this.width - 50, this.x));

        // Friction
        this.velocityX *= 0.85;
    }

    updateAI(player, deltaTime) {
        if (this.animLocked) return;

        this.ai.timer += deltaTime;
        const distance = player.x - this.x;
        const absDistance = Math.abs(distance);

        // Decision making
        if (this.ai.timer > 1000) {
            this.ai.timer = 0;

            if (absDistance < this.ai.attackRange) {
                const rand = Math.random();
                if (rand > 0.6) {
                    this.performAttack(player);
                } else if (rand > 0.3) {
                    this.performBlock();
                } else {
                    // Retreat
                    this.velocityX = distance > 0 ? -3 : 3;
                }
            } else {
                // Approach player
                this.velocityX = distance > 0 ? 2.5 : -2.5;
            }
        }

        // Update movement animation
        if (!this.animLocked) {
            if (Math.abs(this.velocityX) > 0.5) {
                this.setState('idle'); // Could use walk anims if available
            } else {
                this.setState('idle');
            }
        }
    }

    performAttack(opponent) {
        if (this.attackCooldown > 0 || this.animLocked) return;

        this.attacking = true;
        this.setState('attack', true);
        this.attackCooldown = 800;

        // Check hit after animation delay
        setTimeout(() => {
            if (opponent && !opponent.blocking && !opponent.invincible) {
                const distance = Math.abs(this.x - opponent.x);
                if (distance < 220) {
                    const damage = 12 + Math.floor(Math.random() * 6);
                    if (this.isPlayer) {
                        GAME_CONFIG.enemyHealth = Math.max(0, GAME_CONFIG.enemyHealth - damage);
                        updateHealthBar('enemy', GAME_CONFIG.enemyHealth);
                    } else {
                        GAME_CONFIG.playerHealth = Math.max(0, GAME_CONFIG.playerHealth - damage);
                        updateHealthBar('player', GAME_CONFIG.playerHealth);
                    }

                    // Hit particles
                    createHitEffect(opponent.x + opponent.width/2, opponent.y + opponent.height/2);
                }
            }
        }, 300);
    }

    performBlock() {
        if (this.animLocked) return;
        this.blocking = true;
        this.setState('block', true);
        setTimeout(() => { this.blocking = false; }, 600);
    }

    performDodge() {
        if (this.dodgeCooldown > 0 || this.animLocked) return;

        this.dodging = true;
        this.invincible = true;
        this.setState('dodge', true);
        this.dodgeCooldown = 1500;

        // Quick dash
        this.velocityX = (keys['a'] ? -1 : 1) * 15;
    }

    draw(ctx) {
        if (this.currentAnim) {
            this.currentAnim.draw(ctx, this.x, this.y, 3, !this.isPlayer);
        }

        // Debug hitbox (optional)
        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Particle system for effects
function createHitEffect(x, y) {
    for (let i = 0; i < 15; i++) {
        GAME_CONFIG.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`
        });
    }
}

function updateParticles() {
    GAME_CONFIG.particles = GAME_CONFIG.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x, p.y, 6, 6);
        ctx.globalAlpha = 1;

        return p.life > 0;
    });
}

// Input handling
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (player) player.performDodge();
    }
});

document.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 0) { // Left click - attack
        if (player) player.performAttack(enemy);
    } else if (e.button === 2) { // Right click - block
        if (player) player.performBlock();
    }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

// UI Updates
function updateHealthBar(who, health) {
    const bar = document.getElementById(`${who}Health`);
    if (bar) {
        bar.style.width = `${health}%`;
        if (health < 30) {
            bar.style.background = 'linear-gradient(90deg, #ff0000, #ff3333)';
        } else if (health < 60) {
            bar.style.background = 'linear-gradient(90deg, #ff6b00, #ff9500)';
        }
    }

    // Check game over
    if (health <= 0 && !GAME_CONFIG.gameOver) {
        GAME_CONFIG.gameOver = true;
        setTimeout(() => showGameOver(who === 'enemy'), 1000);
    }
}

function showGameOver(playerWon) {
    const gameOverDiv = document.getElementById('gameOver');
    const winnerText = document.getElementById('winnerText');

    if (playerWon) {
        winnerText.textContent = 'VICTORY!';
        winnerText.style.color = '#00ff00';
    } else {
        winnerText.textContent = 'DEFEAT!';
        winnerText.style.color = '#ff0000';
        document.querySelector('#gameOver button').textContent = 'RETRY';
    }

    gameOverDiv.style.display = 'block';
}

function nextStage() {
    if (GAME_CONFIG.playerHealth <= 0) {
        location.reload();
        return;
    }

    GAME_CONFIG.currentStage++;
    if (GAME_CONFIG.currentStage > 3) {
        alert('YOU WIN THE TOURNAMENT!');
        location.reload();
        return;
    }

    location.reload(); // Simple reload for now
}

// Game objects
let player, enemy, stageBackground;

// Game initialization
async function init() {
    document.getElementById('loading').style.display = 'block';

    // Load stage background
    stageBackground = new Image();
    stageBackground.src = GAME_CONFIG.stages[GAME_CONFIG.currentStage - 1].bg;

    // Create fighters
    player = new Fighter(200, 380, true);
    enemy = new Fighter(850, 380, false);

    // Wait for assets
    await new Promise(resolve => setTimeout(resolve, 1500));

    document.getElementById('loading').style.display = 'none';

    // Update stage info
    document.getElementById('stageInfo').textContent = 
        `STAGE ${GAME_CONFIG.currentStage} - ${GAME_CONFIG.stages[GAME_CONFIG.currentStage - 1].name.toUpperCase()}`;

    // Start game loop
    gameLoop();
}

// Main game loop
let lastTime = 0;
function gameLoop(timestamp = 0) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (stageBackground.complete) {
        ctx.drawImage(stageBackground, 0, 0, canvas.width, canvas.height);
    }

    // Draw ground overlay
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 530, canvas.width, 70);

    // Update and draw fighters
    if (!GAME_CONFIG.gameOver) {
        // Player movement
        if (!player.animLocked) {
            if (keys['a']) {
                player.velocityX = -player.speed;
                if (!player.attacking) player.setState('walkBackward');
            } else if (keys['d']) {
                player.velocityX = player.speed;
                if (!player.attacking) player.setState('walkForward');
            } else if (!player.attacking && !player.blocking && !player.dodging) {
                player.setState('idle');
            }
        }

        player.update(deltaTime, enemy);
        enemy.update(deltaTime, player);
    }

    player.draw(ctx);
    enemy.draw(ctx);

    // Update particles
    updateParticles();

    requestAnimationFrame(gameLoop);
}

// Start game
window.addEventListener('load', init);
