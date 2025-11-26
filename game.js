// ===== MEDIEVAL KNIGHT FIGHTER - Professional Game Engine =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Configuration
const CONFIG = {
    canvas: { width: 1024, height: 600 },
    gravity: 0.8,
    friction: 0.85,
    jumpForce: -15,
    moveSpeed: 5,
    attackDamage: 12,
    blockReduction: 0.7,
    staminaCost: { attack: 20, dodge: 30 },
    staminaRegen: 0.5,
    stages: [
        { name: '🏰 Castle Arena', bg: 'stage1_castle.webp', floor: 450 },
        { name: '⛓️ Dark Dungeon', bg: 'stage2_dungeon.webp', floor: 450 },
        { name: '🌅 Royal Courtyard', bg: 'stage3_courtyard.webp', floor: 450 }
    ]
};

// Game State
const game = {
    player: null,
    enemy: null,
    currentStage: 0,
    round: 1,
    particles: [],
    screenShake: 0,
    paused: false,
    backgrounds: {},
    bgLoaded: false
};

// Particle System
class Particle {
    constructor(x, y, color, size, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.velocity = velocity || { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 };
        this.life = 1.0;
        this.decay = 0.02;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y += 0.2; // gravity
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Sprite Animation System
class SpriteSheet {
    constructor(imagePath, frameWidth, frameHeight, frames) {
        this.image = new Image();
        this.image.src = imagePath;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frames = frames;
        this.loaded = false;
        this.image.onload = () => { this.loaded = true; };
    }

    drawFrame(ctx, frame, x, y, width, height, flipX = false) {
        if (!this.loaded) return;

        ctx.save();
        if (flipX) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.image,
                frame * this.frameWidth, 0,
                this.frameWidth, this.frameHeight,
                0, 0,
                width, height
            );
        } else {
            ctx.drawImage(
                this.image,
                frame * this.frameWidth, 0,
                this.frameWidth, this.frameHeight,
                x, y,
                width, height
            );
        }
        ctx.restore();
    }
}

// Fighter Class
class Fighter {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 80;
        this.isPlayer = isPlayer;

        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.grounded = false;

        // Combat Stats
        this.health = 100;
        this.maxHealth = 100;
        this.stamina = 100;
        this.maxStamina = 100;

        // State
        this.state = 'idle';
        this.facing = isPlayer ? 1 : -1; // 1 = right, -1 = left
        this.isAttacking = false;
        this.isBlocking = false;
        this.isDodging = false;
        this.canMove = true;
        this.invulnerable = false;

        // Animation
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.animationSpeed = 8; // fps
        this.sprites = {};
        this.loadSprites();

        // Combat
        this.combo = 0;
        this.lastHitTime = 0;
        this.attackCooldown = 0;

        // AI (for enemy)
        if (!isPlayer) {
            this.ai = {
                state: 'idle',
                timer: 0,
                decisionCooldown: 0,
                aggression: 0.6
            };
        }
    }

    loadSprites() {
        const prefix = this.isPlayer ? 'knight_' : 'enemy_';
        const spriteDefs = {
            idle: { file: `${prefix}idle.webp`, frames: 4 },
            walk: { file: `${prefix}walk_forward.webp`, frames: 8 },
            attack: { file: `${prefix}attack.webp`, frames: 6 },
            block: { file: `${prefix}block.webp`, frames: 4 },
            dodge: { file: this.isPlayer ? `${prefix}dodge.webp` : null, frames: 6 }
        };

        for (const [anim, def] of Object.entries(spriteDefs)) {
            if (def.file) {
                this.sprites[anim] = new SpriteSheet(
                    `assets/sprites/${def.file}`,
                    64, 64, def.frames
                );
            }
        }
    }

    setState(newState, lock = false) {
        if (this.state === newState) return;
        if (lock && !this.canMove) return;

        this.state = newState;
        this.frameIndex = 0;
        this.frameTimer = 0;

        if (lock) {
            this.canMove = false;
        }
    }

    updateAnimation(deltaTime) {
        const sprite = this.sprites[this.state];
        if (!sprite || !sprite.loaded) return;

        const frameTime = 1000 / this.animationSpeed;
        this.frameTimer += deltaTime;

        if (this.frameTimer >= frameTime) {
            this.frameTimer = 0;
            this.frameIndex++;

            if (this.frameIndex >= sprite.frames) {
                this.frameIndex = 0;

                // Handle animation completion
                if (this.state === 'attack') {
                    this.finishAttack();
                } else if (this.state === 'dodge') {
                    this.finishDodge();
                }
            }

            // Attack hit detection on key frame
            if (this.state === 'attack' && this.frameIndex === Math.floor(sprite.frames / 2)) {
                this.performAttackHit();
            }
        }
    }
    
    performAttackHit() {
        const opponent = this.isPlayer ? game.enemy : game.player;
        if (!opponent) return;

        const distance = Math.abs(this.x - opponent.x);
        const attackRange = 100;

        if (distance < attackRange && !opponent.isDodging) {
            let damage = CONFIG.attackDamage;

            if (opponent.isBlocking) {
                damage *= CONFIG.blockReduction;
                createHitEffect(opponent.x + opponent.width/2, opponent.y + opponent.height/2, '#4a9eff');
            } else {
                // Full damage
                if (this.isPlayer) {
                    this.combo++;
                    showCombo(this.combo);
                }
                createHitEffect(opponent.x + opponent.width/2, opponent.y + opponent.height/2, '#ff4444');
                game.screenShake = 10;
            }

            opponent.takeDamage(damage);
        }
    }

    finishAttack() {
        this.isAttacking = false;
        this.canMove = true;
        this.setState('idle');
    }

    finishDodge() {
        this.isDodging = false;
        this.invulnerable = false;
        this.canMove = true;
        this.setState('idle');
    }

    takeDamage(amount) {
        if (this.invulnerable || this.isDodging) return;

        this.health = Math.max(0, this.health - amount);
        this.updateHealthUI();

        if (this.health <= 0) {
            this.die();
        }
    }

    updateHealthUI() {
        const prefix = this.isPlayer ? 'player' : 'enemy';
        document.getElementById(`${prefix}Health`).style.width = `${(this.health / this.maxHealth) * 100}%`;
        document.getElementById(`${prefix}HealthText`).textContent = `${Math.ceil(this.health)} / ${this.maxHealth}`;
    }

    die() {
        console.log(`${this.isPlayer ? 'Player' : 'Enemy'} defeated!`);
        game.paused = true;
        setTimeout(() => {
            if (this.isPlayer) {
                alert('💀 DEFEAT! Enemy Wins!\n\nPress R to restart');
            } else {
                game.round++;
                if (game.round <= 3) {
                    nextRound();
                } else {
                    alert('🏆 VICTORY! You defeated all enemies!\n\nPress R to play again');
                }
            }
        }, 1000);
    }

    // Player Actions
    attack() {
        if (!this.canMove || this.stamina < CONFIG.staminaCost.attack || this.attackCooldown > 0) return;

        this.stamina -= CONFIG.staminaCost.attack;
        this.isAttacking = true;
        this.setState('attack', true);
        this.attackCooldown = 500;
    }

    block(active) {
        if (!this.canMove) return;
        this.isBlocking = active;
        if (active && this.grounded) {
            this.setState('block');
        } else if (!active && this.state === 'block') {
            this.setState('idle');
        }
    }

    dodge() {
        if (!this.canMove || this.stamina < CONFIG.staminaCost.dodge || !this.grounded) return;

        this.stamina -= CONFIG.staminaCost.dodge;
        this.isDodging = true;
        this.invulnerable = true;
        this.setState('dodge', true);

        // Dodge movement
        const dodgeDir = this.facing;
        this.velocityX = dodgeDir * 8;
    }

    // AI Logic
    updateAI(deltaTime) {
        if (this.isPlayer || !game.player) return;

        this.ai.decisionCooldown = Math.max(0, this.ai.decisionCooldown - deltaTime);

        if (!this.canMove || this.ai.decisionCooldown > 0) return;

        const player = game.player;
        const distance = player.x - this.x;
        const absDistance = Math.abs(distance);

        // Decision making
        if (absDistance < 120) {
            // Close range combat
            const rand = Math.random();

            if (player.isAttacking && rand < 0.4) {
                this.block(true);
                setTimeout(() => this.block(false), 600);
                this.ai.decisionCooldown = 800;
            } else if (rand < 0.6) {
                this.attack();
                this.ai.decisionCooldown = 1000;
            } else {
                // Retreat
                this.velocityX = distance > 0 ? 3 : -3;
                this.ai.decisionCooldown = 400;
            }
        } else if (absDistance < 300) {
            // Medium range - approach or attack
            if (Math.random() < 0.3) {
                this.attack();
                this.ai.decisionCooldown = 1200;
            } else {
                // Move towards player
                this.velocityX = distance > 0 ? -CONFIG.moveSpeed * 0.7 : CONFIG.moveSpeed * 0.7;
                this.setState('walk');
                this.ai.decisionCooldown = 300;
            }
        } else {
            // Far range - approach
            this.velocityX = distance > 0 ? -CONFIG.moveSpeed : CONFIG.moveSpeed;
            this.setState('walk');
            this.ai.decisionCooldown = 500;
        }
    }

    // Physics Update
    updatePhysics() {
        const stage = CONFIG.stages[game.currentStage];

        // Apply gravity
        if (!this.grounded) {
            this.velocityY += CONFIG.gravity;
        }

        // Apply velocity
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Friction
        this.velocityX *= CONFIG.friction;

        // Ground collision
        if (this.y + this.height >= stage.floor) {
            this.y = stage.floor - this.height;
            this.velocityY = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        // Stage boundaries
        const padding = 50;
        this.x = Math.max(padding, Math.min(CONFIG.canvas.width - this.width - padding, this.x));

        // Update facing direction
        if (this.velocityX > 0.5) this.facing = 1;
        else if (this.velocityX < -0.5) this.facing = -1;
    }

    // Stamina regeneration
    updateStamina(deltaTime) {
        if (!this.isAttacking && !this.isDodging) {
            this.stamina = Math.min(this.maxStamina, this.stamina + CONFIG.staminaRegen);
        }

        const prefix = this.isPlayer ? 'player' : 'enemy';
        document.getElementById(`${prefix}Stamina`).style.width = `${(this.stamina / this.maxStamina) * 100}%`;
    }

    update(deltaTime) {
        if (game.paused) return;

        this.updateAnimation(deltaTime);
        this.updatePhysics();
        this.updateStamina(deltaTime);

        if (!this.isPlayer) {
            this.updateAI(deltaTime);
        }

        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    }

    draw(ctx) {
        const sprite = this.sprites[this.state];
        if (!sprite || !sprite.loaded) {
            // Fallback rectangle
            ctx.fillStyle = this.isPlayer ? '#4a9eff' : '#ff4444';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }

        sprite.drawFrame(
            ctx,
            this.frameIndex,
            this.x, this.y,
            this.width, this.height,
            this.facing < 0
        );

        // Debug hitbox (optional)
        // ctx.strokeStyle = this.isPlayer ? '#4a9eff' : '#ff4444';
        // ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Effects and UI Functions
function createHitEffect(x, y, color) {
    for (let i = 0; i < 15; i++) {
        game.particles.push(new Particle(x, y, color, Math.random() * 4 + 2));
    }
}

function showCombo(combo) {
    if (combo < 2) return;
    const comboEl = document.getElementById('comboDisplay');
    comboEl.textContent = `${combo}X COMBO!`;
    comboEl.style.opacity = '1';
    setTimeout(() => {
        comboEl.style.opacity = '0';
    }, 1000);
}

function updateParticles() {
    game.particles = game.particles.filter(p => p.update());
}

function drawParticles(ctx) {
    game.particles.forEach(p => p.draw(ctx));
}

// Stage Management
function loadBackgrounds() {
    CONFIG.stages.forEach((stage, i) => {
        const img = new Image();
        img.onload = () => {
            game.backgrounds[i] = img;
            if (Object.keys(game.backgrounds).length === CONFIG.stages.length) {
                game.bgLoaded = true;
                console.log('✓ All backgrounds loaded');
            }
        };
        img.src = `assets/backgrounds/${stage.bg}`;
    });
}

function nextRound() {
    game.currentStage = (game.currentStage + 1) % CONFIG.stages.length;
    const stage = CONFIG.stages[game.currentStage];

    document.getElementById('roundInfo').textContent = `ROUND ${game.round} - FIGHT!`;
    document.getElementById('stageInfo').textContent = stage.name;

    // Reset fighters
    game.player.health = game.player.maxHealth;
    game.player.stamina = game.player.maxStamina;
    game.player.x = 200;
    game.player.y = stage.floor - game.player.height;
    game.player.updateHealthUI();

    game.enemy = new Fighter(700, stage.floor - 80, false);

    game.paused = false;
}

// Input Handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (e.key === ' ') {
        e.preventDefault();
        if (game.player) game.player.dodge();
    }

    if (e.key.toLowerCase() === 'r') {
        location.reload();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (!game.player) return;

    if (e.button === 0) { // Left click - Attack
        game.player.attack();
    } else if (e.button === 2) { // Right click - Block
        game.player.block(true);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2 && game.player) {
        game.player.block(false);
    }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Player Movement
function handlePlayerMovement() {
    if (!game.player || !game.player.canMove || game.paused) return;

    if (keys['a']) {
        game.player.velocityX = -CONFIG.moveSpeed;
        if (game.player.grounded && game.player.state !== 'block') {
            game.player.setState('walk');
        }
    } else if (keys['d']) {
        game.player.velocityX = CONFIG.moveSpeed;
        if (game.player.grounded && game.player.state !== 'block') {
            game.player.setState('walk');
        }
    } else if (game.player.grounded && !game.player.isAttacking && !game.player.isBlocking) {
        if (Math.abs(game.player.velocityX) < 0.5) {
            game.player.setState('idle');
        }
    }
}

// Game Loop
let lastTime = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime || 16;
    lastTime = timestamp;

    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (game.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * game.screenShake;
        shakeY = (Math.random() - 0.5) * game.screenShake;
        game.screenShake *= 0.9;
        if (game.screenShake < 0.5) game.screenShake = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Draw background
    if (game.bgLoaded && game.backgrounds[game.currentStage]) {
        ctx.drawImage(game.backgrounds[game.currentStage], 0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    } else {
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    }

    // Draw floor line
    const stage = CONFIG.stages[game.currentStage];
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, stage.floor);
    ctx.lineTo(CONFIG.canvas.width, stage.floor);
    ctx.stroke();

    // Update and draw game objects
    handlePlayerMovement();
    updateParticles();

    if (game.player) {
        game.player.update(deltaTime);
        game.player.draw(ctx);
    }

    if (game.enemy) {
        game.enemy.update(deltaTime);
        game.enemy.draw(ctx);
    }

    drawParticles(ctx);

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Initialize Game
function initGame() {
    console.log('🎮 Initializing Medieval Knight Fighter...');

    loadBackgrounds();

    const stage = CONFIG.stages[game.currentStage];
    game.player = new Fighter(200, stage.floor - 80, true);
    game.enemy = new Fighter(700, stage.floor - 80, false);

    document.getElementById('roundInfo').textContent = 'ROUND 1 - FIGHT!';
    document.getElementById('stageInfo').textContent = stage.name;

    // Wait for sprites to load
    setTimeout(() => {
        console.log('✓ Game initialized! Starting...');
        requestAnimationFrame(gameLoop);
    }, 500);
}

// Start game when page loads
window.addEventListener('load', initGame);

console.log('⚔️ Medieval Knight Fighter loaded!');
