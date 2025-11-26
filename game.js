// Medieval Knight Fighter - PROPER SPRITE ANIMATIONS
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Simple image loader
const images = {};
let loaded = 0;
const toLoad = [
    'assets/sprites/knight_idle.webp',
    'assets/sprites/knight_walk_forward.webp',
    'assets/sprites/knight_walk_backward.webp',
    'assets/sprites/knight_attack.webp',
    'assets/sprites/knight_block.webp',
    'assets/sprites/knight_dodge.webp',
    'assets/sprites/enemy_idle.webp',
    'assets/sprites/enemy_attack.webp',
    'assets/sprites/enemy_block.webp'
];

function loadAssets(callback) {
    toLoad.forEach(path => {
        const img = new Image();
        img.onload = () => {
            images[path] = img;
            loaded++;
            document.getElementById('loading').textContent = `LOADING ${loaded}/${toLoad.length}`;
            if (loaded === toLoad.length) callback();
        };
        img.onerror = () => {
            loaded++;
            if (loaded === toLoad.length) callback();
        };
        img.src = path;
    });
}

// PROPER Animation class - renders actual sprite frames
class Animation {
    constructor(imgPath, frameCount) {
        this.img = images[imgPath];
        this.frameCount = frameCount;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameDelay = 100; // ms between frames
        this.playing = true;
        this.loop = true;
    }

    update(dt) {
        if (!this.playing) return;

        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDelay) {
            this.frameTimer = 0;
            this.frameIndex++;

            if (this.frameIndex >= this.frameCount) {
                if (this.loop) {
                    this.frameIndex = 0;
                } else {
                    this.frameIndex = this.frameCount - 1;
                    this.playing = false;
                }
            }
        }
    }

    draw(x, y, width, height, flipX = false) {
        if (!this.img) return;

        const frameWidth = this.img.width / this.frameCount;
        const frameHeight = this.img.height;
        const sx = this.frameIndex * frameWidth;

        ctx.save();
        if (flipX) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, sx, 0, frameWidth, frameHeight, 0, 0, width, height);
        } else {
            ctx.drawImage(this.img, sx, 0, frameWidth, frameHeight, x, y, width, height);
        }
        ctx.restore();
    }

    reset() {
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.playing = true;
    }

    isFinished() {
        return !this.playing && !this.loop;
    }
}

// Fighter with REAL animations
class Fighter {
    constructor(x, y, isPlayer) {
        this.x = x;
        this.y = y;
        this.width = 150;
        this.height = 150;
        this.isPlayer = isPlayer;

        // Movement
        this.velocityX = 0;
        this.speed = 4;
        this.facingRight = isPlayer;

        // Combat state
        this.health = 100;
        this.state = 'idle';
        this.attacking = false;
        this.blocking = false;
        this.dodging = false;
        this.invulnerable = false;

        // Cooldowns
        this.attackCooldown = 0;
        this.dodgeCooldown = 0;

        // Sword hitbox
        this.swordHitbox = { x: 0, y: 0, width: 80, height: 20, active: false };

        // Load animations
        this.animations = this.loadAnimations();
        this.currentAnim = this.animations.idle;

        // AI
        if (!isPlayer) {
            this.aiTimer = 0;
            this.aiState = 'idle';
        }
    }

    loadAnimations() {
        const prefix = this.isPlayer ? 'knight' : 'enemy';
        return {
            idle: new Animation(`assets/sprites/${prefix}_idle.webp`, 4),
            walkForward: new Animation('assets/sprites/knight_walk_forward.webp', 8),
            walkBackward: new Animation('assets/sprites/knight_walk_backward.webp', 8),
            attack: new Animation(`assets/sprites/${prefix}_attack.webp`, 6),
            block: new Animation(`assets/sprites/${prefix}_block.webp`, 4),
            dodge: new Animation('assets/sprites/knight_dodge.webp', 6)
        };
    }

    changeState(newState, oneShot = false) {
        if (this.state === newState) return;

        this.state = newState;
        this.currentAnim = this.animations[newState] || this.animations.idle;
        this.currentAnim.loop = !oneShot;
        this.currentAnim.reset();
    }

    update(dt, opponent) {
        // Update cooldowns
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

        // Update current animation
        this.currentAnim.update(dt);

        // Check if one-shot animation finished
        if (this.currentAnim.isFinished()) {
            this.attacking = false;
            this.blocking = false;
            this.dodging = false;
            this.invulnerable = false;
            this.swordHitbox.active = false;
            this.changeState('idle');
        }

        // Update sword hitbox position
        if (this.attacking) {
            const offsetX = this.facingRight ? this.width : -80;
            this.swordHitbox.x = this.x + offsetX;
            this.swordHitbox.y = this.y + this.height / 2;
            this.swordHitbox.active = this.currentAnim.frameIndex >= 2 && this.currentAnim.frameIndex <= 4;

            // Check collision with opponent
            if (this.swordHitbox.active && opponent && !opponent.blocking && !opponent.invulnerable) {
                if (this.checkCollision(this.swordHitbox, opponent)) {
                    opponent.takeDamage(15);
                    this.swordHitbox.active = false; // Hit once per attack
                }
            }
        }

        // AI behavior
        if (!this.isPlayer && opponent) {
            this.updateAI(dt, opponent);
        }

        // Apply movement
        this.x += this.velocityX;
        this.velocityX *= 0.85; // Friction

        // Boundaries
        this.x = Math.max(50, Math.min(canvas.width - this.width - 50, this.x));

        // Update facing direction
        if (opponent) {
            this.facingRight = opponent.x > this.x;
        }
    }

    updateAI(dt, player) {
        this.aiTimer += dt;

        if (this.attacking || this.blocking || this.dodging) return;

        const distance = Math.abs(player.x - this.x);

        if (this.aiTimer > 1200) {
            this.aiTimer = 0;

            if (distance < 180) {
                // Combat range
                const rand = Math.random();
                if (rand > 0.6) {
                    this.performAttack();
                } else if (rand > 0.3) {
                    this.performBlock();
                } else {
                    // Back off
                    this.velocityX = player.x > this.x ? -3 : 3;
                }
            } else if (distance < 400) {
                // Approach
                this.velocityX = player.x > this.x ? 2 : -2;
                this.changeState('idle');
            }
        }
    }

    performAttack() {
        if (this.attackCooldown > 0) return;

        this.attacking = true;
        this.changeState('attack', true);
        this.attackCooldown = 1000;
    }

    performBlock() {
        if (this.blocking) return;

        this.blocking = true;
        this.changeState('block', true);
        setTimeout(() => {
            this.blocking = false;
        }, 800);
    }

    performDodge() {
        if (this.dodgeCooldown > 0) return;

        this.dodging = true;
        this.invulnerable = true;
        this.changeState('dodge', true);
        this.dodgeCooldown = 2000;

        // Quick dash
        this.velocityX = this.facingRight ? 15 : -15;
    }

    takeDamage(amount) {
        if (this.invulnerable) return;

        this.health = Math.max(0, this.health - amount);

        // Update UI
        if (this.isPlayer) {
            updateHealth('player', this.health);
        } else {
            updateHealth('enemy', this.health);
        }

        // Flash effect
        this.invulnerable = true;
        setTimeout(() => {
            this.invulnerable = false;
        }, 300);
    }

    checkCollision(box, target) {
        return box.x < target.x + target.width &&
               box.x + box.width > target.x &&
               box.y < target.y + target.height &&
               box.y + box.height > target.y;
    }

    draw() {
        // Draw character
        this.currentAnim.draw(this.x, this.y, this.width, this.height, !this.facingRight);

        // Draw sword hitbox when active (debug)
        if (this.swordHitbox.active) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(this.swordHitbox.x, this.swordHitbox.y, this.swordHitbox.width, this.swordHitbox.height);

            // Draw sword visual
            ctx.strokeStyle = '#silver';
            ctx.lineWidth = 4;
            ctx.beginPath();
            const startX = this.facingRight ? this.x + this.width * 0.6 : this.x + this.width * 0.4;
            const endX = this.facingRight ? startX + 60 : startX - 60;
            ctx.moveTo(startX, this.y + this.height / 2);
            ctx.lineTo(endX, this.y + this.height / 2);
            ctx.stroke();
        }

        // Flash when invulnerable
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// Input
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (player && !gameOver) player.performDodge();
    }
});

document.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', e => {
    if (gameOver) return;

    if (e.button === 0) {
        if (player) player.performAttack();
    } else if (e.button === 2) {
        if (player) player.performBlock();
    }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

// UI
function updateHealth(who, hp) {
    const bar = document.getElementById(`${who}Health`);
    if (bar) bar.style.width = `${hp}%`;

    if (hp <= 0 && !gameOver) {
        gameOver = true;
        setTimeout(() => {
            const div = document.getElementById('gameOver');
            const txt = document.getElementById('winnerText');
            if (who === 'enemy') {
                txt.textContent = 'VICTORY!';
                txt.style.color = '#0f0';
            } else {
                txt.textContent = 'DEFEAT!';
                txt.style.color = '#f00';
            }
            div.style.display = 'block';
        }, 1000);
    }
}

function nextStage() {
    location.reload();
}

// Game state
let player, enemy;
let gameOver = false;

// Game loop
let lastTime = 0;
function gameLoop(time) {
    const dt = time - lastTime;
    lastTime = time;

    // Clear
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 530, canvas.width, 70);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 530, canvas.width, 70);

    if (!gameOver) {
        // Player input
        if (keys.a && !player.attacking && !player.dodging) {
            player.velocityX = -player.speed;
            if (!player.attacking) player.changeState('walkBackward');
        } else if (keys.d && !player.attacking && !player.dodging) {
            player.velocityX = player.speed;
            if (!player.attacking) player.changeState('walkForward');
        } else if (!player.attacking && !player.blocking && !player.dodging && Math.abs(player.velocityX) < 0.5) {
            player.changeState('idle');
        }

        // Update
        player.update(dt, enemy);
        enemy.update(dt, player);
    }

    // Draw
    player.draw();
    enemy.draw();

    requestAnimationFrame(gameLoop);
}

// Start
loadAssets(() => {
    document.getElementById('loading').style.display = 'none';

    player = new Fighter(200, 380, true);
    enemy = new Fighter(900, 380, false);

    gameLoop(0);
});
