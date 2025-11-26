// Medieval Knight Fighter - FINAL VERSION
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Crisp pixel art

// Load images
const images = {};
let loadCount = 0;
const imagesToLoad = {
    'bg': 'assets/stages/stage1_castle.webp',
    'playerIdle': 'assets/sprites/player_idle_new.webp',
    'playerWalk': 'assets/sprites/player_walk_new.webp',
    'playerAttack': 'assets/sprites/player_attack_new.webp',
    'enemyIdle': 'assets/sprites/enemy_idle_new.webp',
    'enemyAttack': 'assets/sprites/enemy_attack_new.webp'
};

function loadImages(callback) {
    const total = Object.keys(imagesToLoad).length;
    Object.entries(imagesToLoad).forEach(([key, path]) => {
        const img = new Image();
        img.onload = () => {
            images[key] = img;
            loadCount++;
            document.getElementById('loading').textContent = `LOADING ${loadCount}/${total}`;
            if (loadCount === total) callback();
        };
        img.onerror = () => {
            loadCount++;
            if (loadCount === total) callback();
        };
        img.src = path;
    });
}

// Animation class
class Anim {
    constructor(img, frames, speed = 100) {
        this.img = img;
        this.frames = frames;
        this.index = 0;
        this.timer = 0;
        this.speed = speed;
        this.done = false;
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.speed) {
            this.timer = 0;
            this.index++;
            if (this.index >= this.frames) {
                this.index = 0;
                this.done = true;
            }
        }
    }

    draw(x, y, w, h, flip = false) {
        if (!this.img) return;
        const fw = this.img.width / this.frames;
        const fh = this.img.height;

        ctx.save();
        if (flip) {
            ctx.translate(x + w, y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, this.index * fw, 0, fw, fh, 0, 0, w, h);
        } else {
            ctx.drawImage(this.img, this.index * fw, 0, fw, fh, x, y, w, h);
        }
        ctx.restore();
    }

    reset() {
        this.index = 0;
        this.timer = 0;
        this.done = false;
    }
}

// Fighter
class Fighter {
    constructor(x, y, isPlayer) {
        this.x = x;
        this.y = y;
        this.w = 120;
        this.h = 120;
        this.isPlayer = isPlayer;
        this.health = 100;

        this.vx = 0;
        this.speed = 3.5;

        this.state = 'idle';
        this.attacking = false;
        this.blocking = false;
        this.canHit = false;
        this.attackCD = 0;

        this.anims = {};
        this.current = null;
        this.loadAnims();

        if (!isPlayer) {
            this.aiTime = 0;
        }
    }

    loadAnims() {
        if (this.isPlayer) {
            this.anims.idle = new Anim(images.playerIdle, 4, 150);
            this.anims.walk = new Anim(images.playerWalk, 6, 100);
            this.anims.attack = new Anim(images.playerAttack, 6, 80);
        } else {
            this.anims.idle = new Anim(images.enemyIdle, 4, 150);
            this.anims.attack = new Anim(images.enemyAttack, 6, 80);
        }
        this.current = this.anims.idle;
    }

    setState(name) {
        if (this.state === name) return;
        this.state = name;
        if (this.anims[name]) {
            this.current = this.anims[name];
            this.current.reset();
        }
    }

    update(dt, other) {
        this.attackCD = Math.max(0, this.attackCD - dt);

        if (this.current) {
            this.current.update(dt);

            // Attack hit detection on frame 3
            if (this.attacking && this.current.index === 3 && this.canHit && other) {
                const dist = Math.abs(this.x - other.x);
                if (dist < 150 && !other.blocking) {
                    other.takeDamage(15);
                    this.canHit = false;
                }
            }

            // End attack
            if (this.attacking && this.current.done) {
                this.attacking = false;
                this.canHit = false;
                this.setState('idle');
            }
        }

        // AI
        if (!this.isPlayer && other && !this.attacking) {
            this.aiTime += dt;
            if (this.aiTime > 1000) {
                this.aiTime = 0;
                const dist = Math.abs(other.x - this.x);
                if (dist < 200 && Math.random() > 0.4) {
                    this.attack();
                } else if (dist > 250) {
                    this.vx = other.x > this.x ? 1.5 : -1.5;
                }
            }
        }

        this.x += this.vx;
        this.vx *= 0.85;
        this.x = Math.max(50, Math.min(canvas.width - this.w - 50, this.x));
    }

    attack() {
        if (this.attackCD > 0) return;
        this.attacking = true;
        this.canHit = true;
        this.attackCD = 800;
        this.setState('attack');
    }

    block() {
        this.blocking = true;
        setTimeout(() => this.blocking = false, 600);
    }

    takeDamage(dmg) {
        this.health = Math.max(0, this.health - dmg);
        updateHP(this.isPlayer ? 'player' : 'enemy', this.health);
    }

    draw(other) {
        if (!this.current) return;
        const flip = other && other.x < this.x;
        this.current.draw(this.x, this.y, this.w, this.h, flip);

        // Flash when hit
        if (this.health < 100 && Date.now() % 200 < 100) {
            ctx.fillStyle = 'rgba(255,0,0,0.2)';
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
}

// Input
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        // Could add dodge here
    }
});

document.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && player) player.attack();
    if (e.button === 2 && player) player.block();
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

// UI
function updateHP(who, hp) {
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

// Game
let player, enemy, gameOver = false;

function gameLoop(time) {
    const dt = time - lastTime;
    lastTime = time;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background
    if (images.bg) {
        ctx.drawImage(images.bg, 0, 0, canvas.width, canvas.height);
    }

    if (!gameOver) {
        // Player input
        if (keys.a && !player.attacking) {
            player.vx = -player.speed;
            if (player.anims.walk) player.setState('walk');
        } else if (keys.d && !player.attacking) {
            player.vx = player.speed;
            if (player.anims.walk) player.setState('walk');
        } else if (!player.attacking && Math.abs(player.vx) < 0.3) {
            player.setState('idle');
        }

        player.update(dt, enemy);
        enemy.update(dt, player);
    }

    player.draw(enemy);
    enemy.draw(player);

    requestAnimationFrame(gameLoop);
}

let lastTime = 0;

// Start
loadImages(() => {
    document.getElementById('loading').style.display = 'none';
    player = new Fighter(200, 430, true);
    enemy = new Fighter(900, 430, false);
    gameLoop(0);
});
