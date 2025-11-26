// Medieval Knight Fighter - Game Engine
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Sprite Animation Manager
class SpriteSheet {
    constructor(src, frameWidth, frameHeight, frameCount) {
        this.image = new Image();
        this.image.src = src;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameCount = frameCount;
        this.currentFrame = 0;
        this.loaded = false;
        this.image.onload = () => { this.loaded = true; };
    }

    draw(ctx, x, y, scale = 1) {
        if (!this.loaded) return;
        const sx = this.currentFrame * this.frameWidth;
        ctx.drawImage(
            this.image, 
            sx, 0, this.frameWidth, this.frameHeight,
            x, y, this.frameWidth * scale, this.frameHeight * scale
        );
    }

    nextFrame() {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
    }

    reset() {
        this.currentFrame = 0;
    }
}

// Knight Character Class
class Knight {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.health = 100;
        this.scale = 3;

        // Load sprite sheets
        this.sprites = {
            idle: new SpriteSheet('assets/sprites/knight_idle.webp', 64, 64, 4),
            walkForward: new SpriteSheet('assets/sprites/knight_walk_forward.webp', 64, 64, 8),
            walkBackward: new SpriteSheet('assets/sprites/knight_walk_backward.webp', 64, 64, 8),
            attack: new SpriteSheet('assets/sprites/knight_attack.webp', 64, 64, 6),
            block: new SpriteSheet('assets/sprites/knight_block.webp', 64, 64, 5),
            dodge: new SpriteSheet('assets/sprites/knight_dodge.webp', 64, 64, 6)
        };

        this.currentAnimation = 'idle';
        this.animationSpeed = 6;
        this.frameCounter = 0;
        this.isAttacking = false;
        this.isBlocking = false;
        this.isDodging = false;
        this.velocity = 3;
    }

    update(keys) {
        this.frameCounter++;

        // Animation frame update
        if (this.frameCounter % this.animationSpeed === 0) {
            this.sprites[this.currentAnimation].nextFrame();

            // Check if action animations finished
            if (this.isAttacking && this.sprites.attack.currentFrame === 0 && this.frameCounter > 10) {
                this.isAttacking = false;
                this.currentAnimation = 'idle';
            }
            if (this.isDodging && this.sprites.dodge.currentFrame === 0 && this.frameCounter > 10) {
                this.isDodging = false;
                this.currentAnimation = 'idle';
            }
        }

        // Handle movement and actions
        if (!this.isAttacking && !this.isDodging) {
            if (keys.blocking) {
                this.isBlocking = true;
                this.currentAnimation = 'block';
            } else {
                this.isBlocking = false;

                if (keys.left && this.x > 50) {
                    this.x -= this.velocity;
                    this.currentAnimation = 'walkBackward';
                } else if (keys.right && this.x < canvas.width - 250) {
                    this.x += this.velocity;
                    this.currentAnimation = 'walkForward';
                } else if (!this.isBlocking) {
                    this.currentAnimation = 'idle';
                }
            }
        }
    }

    attack() {
        if (!this.isAttacking && !this.isDodging) {
            this.isAttacking = true;
            this.currentAnimation = 'attack';
            this.sprites.attack.reset();
            this.frameCounter = 0;
        }
    }

    dodge() {
        if (!this.isDodging && !this.isAttacking) {
            this.isDodging = true;
            this.currentAnimation = 'dodge';
            this.sprites.dodge.reset();
            this.frameCounter = 0;
        }
    }

    draw(ctx) {
        this.sprites[this.currentAnimation].draw(ctx, this.x, this.y, this.scale);

        // Draw health bar
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 30, 192, 20);
        ctx.fillStyle = this.health > 50 ? '#4caf50' : this.health > 25 ? '#ff9800' : '#f44336';
        ctx.fillRect(this.x + 2, this.y - 28, (this.health / 100) * 188, 16);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(this.x, this.y - 30, 192, 20);
    }
}

// AI Enemy Class
class EnemyKnight extends Knight {
    constructor(x, y) {
        super(x, y, false);
        this.aiState = 'idle';
        this.aiTimer = 0;
        this.attackRange = 200;
    }

    updateAI(player) {
        this.aiTimer++;

        const distance = Math.abs(this.x - player.x);

        // AI Decision Making
        if (distance > this.attackRange) {
            // Move towards player
            if (this.x > player.x) {
                this.x -= this.velocity * 0.7;
                this.currentAnimation = 'walkBackward';
            } else {
                this.x += this.velocity * 0.7;
                this.currentAnimation = 'walkForward';
            }
        } else {
            // Combat range - attack or block randomly
            if (this.aiTimer % 90 === 0) {
                const action = Math.random();
                if (action < 0.4) {
                    this.attack();
                } else if (action < 0.7) {
                    this.isBlocking = true;
                    this.currentAnimation = 'block';
                } else {
                    this.dodge();
                }
            } else if (this.aiTimer % 90 > 30) {
                this.isBlocking = false;
                if (!this.isAttacking && !this.isDodging) {
                    this.currentAnimation = 'idle';
                }
            }
        }

        // Update animations
        this.frameCounter++;
        if (this.frameCounter % this.animationSpeed === 0) {
            this.sprites[this.currentAnimation].nextFrame();

            if (this.isAttacking && this.sprites.attack.currentFrame === 0 && this.frameCounter > 10) {
                this.isAttacking = false;
                // Deal damage to player if in range
                if (distance < 150 && !player.isBlocking && !player.isDodging) {
                    player.health = Math.max(0, player.health - 10);
                }
            }
            if (this.isDodging && this.sprites.dodge.currentFrame === 0 && this.frameCounter > 10) {
                this.isDodging = false;
            }
        }
    }
}

// Input Manager
const keys = {
    left: false,
    right: false,
    blocking: false
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === ' ') {
        e.preventDefault();
        player.dodge();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'd' || e.key === 'D') keys.right = false;
});

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (e.button === 0) { // Left click - Attack
        player.attack();
        // Check if hit enemy
        const distance = Math.abs(player.x - enemy.x);
        if (distance < 150 && !enemy.isBlocking && !enemy.isDodging) {
            enemy.health = Math.max(0, enemy.health - 15);
        }
    } else if (e.button === 2) { // Right click - Block
        keys.blocking = true;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
        keys.blocking = false;
    }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Initialize Game
const player = new Knight(100, 350);
const enemy = new EnemyKnight(900, 350);

// Game Loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    // Update and draw
    player.update(keys);
    enemy.updateAI(player);

    player.draw(ctx);
    enemy.draw(ctx);

    // Check win/lose conditions
    if (player.health <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DEFEAT', canvas.width / 2, canvas.height / 2);
        return;
    } else if (enemy.health <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2);
        return;
    }

    requestAnimationFrame(gameLoop);
}

// Start game when sprites loaded
setTimeout(() => {
    gameLoop();
}, 1000);