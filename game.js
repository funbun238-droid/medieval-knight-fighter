// Medieval Knight Fighter - Optimized with Loading
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Asset Loader with Progress
class AssetLoader {
    constructor() {
        this.assets = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async loadImage(key, path) {
        this.totalAssets++;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets[key] = img;
                this.loadedAssets++;
                this.updateProgress();
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load: ${path}`);
                this.loadedAssets++;
                this.updateProgress();
                resolve(null);
            };
            img.src = path;
        });
    }

    updateProgress() {
        const percent = (this.loadedAssets / this.totalAssets) * 100;
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `LOADING... ${Math.floor(percent)}%`;
        }
    }

    get(key) {
        return this.assets[key];
    }
}

const loader = new AssetLoader();

// Game State
const game = {
    currentStage: 0,
    playerHealth: 100,
    enemyHealth: 100,
    particles: [],
    gameOver: false,
    paused: false
};

// Simplified Sprite Animation
class Sprite {
    constructor(img, frames, fps = 12) {
        this.img = img;
        this.frames = frames;
        this.current = 0;
        this.timer = 0;
        this.delay = 1000 / fps;
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.delay) {
            this.timer = 0;
            this.current = (this.current + 1) % this.frames;
        }
    }

    draw(ctx, x, y, w, h, flip = false) {
        if (!this.img) return;
        const fw = this.img.width / this.frames;
        const fh = this.img.height;

        ctx.save();
        if (flip) {
            ctx.translate(x + w, y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, this.current * fw, 0, fw, fh, 0, 0, w, h);
        } else {
            ctx.drawImage(this.img, this.current * fw, 0, fw, fh, x, y, w, h);
        }
        ctx.restore();
    }

    reset() {
        this.current = 0;
        this.timer = 0;
    }
}

// Fighter
class Fighter {
    constructor(x, y, isPlayer) {
        this.x = x;
        this.y = y;
        this.w = 180;
        this.h = 180;
        this.isPlayer = isPlayer;
        this.vx = 0;
        this.speed = 5;

        this.state = 'idle';
        this.locked = false;
        this.attacking = false;
        this.blocking = false;
        this.invincible = false;
        this.attackCD = 0;
        this.dodgeCD = 0;

        this.sprites = {};
        this.loadSprites();

        if (!isPlayer) {
            this.aiTimer = 0;
        }
    }

    loadSprites() {
        const pre = this.isPlayer ? 'knight' : 'enemy';
        this.sprites = {
            idle: new Sprite(loader.get(`${pre}_idle`), 4, 8),
            walk: new Sprite(loader.get('knight_walk_forward'), 8, 12),
            attack: new Sprite(loader.get(`${pre}_attack`), 6, 15),
            block: new Sprite(loader.get(`${pre}_block`), 4, 8),
            dodge: new Sprite(loader.get('knight_dodge'), 6, 18)
        };
        this.current = this.sprites.idle;
    }

    setState(name, lock = false) {
        if (this.locked && name !== 'idle') return;
        if (this.state !== name) {
            this.state = name;
            this.current = this.sprites[name] || this.sprites.idle;
            this.current.reset();
            this.locked = lock;
        }
    }

    update(dt, other) {
        this.attackCD = Math.max(0, this.attackCD - dt);
        this.dodgeCD = Math.max(0, this.dodgeCD - dt);

        if (this.current) {
            this.current.update(dt);

            // Unlock when animation loops
            if (this.locked && this.current.current === 0 && this.current.timer > 10) {
                this.locked = false;
                this.attacking = false;
                this.invincible = false;
                this.setState('idle');
            }
        }

        // AI
        if (!this.isPlayer && other && !this.locked) {
            this.aiTimer += dt;
            if (this.aiTimer > 800) {
                this.aiTimer = 0;
                const dist = Math.abs(other.x - this.x);
                if (dist < 200) {
                    if (Math.random() > 0.5) this.attack(other);
                    else this.block();
                } else {
                    this.vx = (other.x > this.x) ? 2 : -2;
                }
            }
        }

        this.x += this.vx;
        this.vx *= 0.8;
        this.x = Math.max(50, Math.min(canvas.width - this.w - 50, this.x));

        if (!this.locked && Math.abs(this.vx) < 0.5) {
            this.setState('idle');
        }
    }

    attack(other) {
        if (this.attackCD > 0 || this.locked) return;
        this.attacking = true;
        this.setState('attack', true);
        this.attackCD = 700;

        setTimeout(() => {
            if (!other.blocking && !other.invincible) {
                const dist = Math.abs(this.x - other.x);
                if (dist < 200) {
                    const dmg = 10 + Math.random() * 8;
                    if (this.isPlayer) {
                        game.enemyHealth = Math.max(0, game.enemyHealth - dmg);
                        updateHP('enemy', game.enemyHealth);
                    } else {
                        game.playerHealth = Math.max(0, game.playerHealth - dmg);
                        updateHP('player', game.playerHealth);
                    }
                    particles(other.x + other.w/2, other.y + other.h/2);
                }
            }
        }, 250);
    }

    block() {
        if (this.locked) return;
        this.blocking = true;
        this.setState('block', true);
        setTimeout(() => this.blocking = false, 500);
    }

    dodge() {
        if (this.dodgeCD > 0 || this.locked) return;
        this.invincible = true;
        this.setState('dodge', true);
        this.dodgeCD = 1200;
        this.vx = (keys.a ? -1 : 1) * 12;
    }

    draw(ctx) {
        if (this.current) {
            this.current.draw(ctx, this.x, this.y, this.w, this.h, !this.isPlayer);
        }
    }
}

// Particles
function particles(x, y) {
    for (let i = 0; i < 10; i++) {
        game.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 20,
            color: `hsl(${Math.random() * 60 + 10}, 100%, 60%)`
        });
    }
}

function updateParticles() {
    game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.fillRect(p.x, p.y, 5, 5);
        ctx.globalAlpha = 1;
        return p.life > 0;
    });
}

// Input
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (player) player.dodge();
    }
});
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && player) player.attack(enemy);
    else if (e.button === 2 && player) player.block();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// UI
function updateHP(who, hp) {
    const bar = document.getElementById(`${who}Health`);
    if (bar) bar.style.width = `${hp}%`;

    if (hp <= 0 && !game.gameOver) {
        game.gameOver = true;
        setTimeout(() => {
            const div = document.getElementById('gameOver');
            const txt = document.getElementById('winnerText');
            if (who === 'enemy') {
                txt.textContent = 'VICTORY!';
                txt.style.color = '#0f0';
            } else {
                txt.textContent = 'DEFEAT!';
                txt.style.color = '#f00';
                document.querySelector('#gameOver button').textContent = 'RETRY';
            }
            div.style.display = 'block';
        }, 800);
    }
}

function nextStage() {
    location.reload();
}

// Game objects
let player, enemy, bg;

// Init
async function init() {
    console.log('Loading assets...');

    // Load only essential assets
    await Promise.all([
        loader.loadImage('stage1', 'assets/stages/stage1_castle.webp'),
        loader.loadImage('knight_idle', 'assets/sprites/knight_idle.webp'),
        loader.loadImage('knight_walk_forward', 'assets/sprites/knight_walk_forward.webp'),
        loader.loadImage('knight_attack', 'assets/sprites/knight_attack.webp'),
        loader.loadImage('knight_block', 'assets/sprites/knight_block.webp'),
        loader.loadImage('knight_dodge', 'assets/sprites/knight_dodge.webp'),
        loader.loadImage('enemy_idle', 'assets/sprites/enemy_idle.webp'),
        loader.loadImage('enemy_attack', 'assets/sprites/enemy_attack.webp'),
        loader.loadImage('enemy_block', 'assets/sprites/enemy_block.webp')
    ]);

    bg = loader.get('stage1');
    player = new Fighter(200, 370, true);
    enemy = new Fighter(850, 370, false);

    document.getElementById('loading').style.display = 'none';
    console.log('Game ready!');

    gameLoop();
}

// Game loop
let last = 0;
function gameLoop(time = 0) {
    const dt = time - last;
    last = time;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bg) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 550, canvas.width, 50);

    if (!game.gameOver) {
        // Player control
        if (!player.locked) {
            if (keys.a) {
                player.vx = -player.speed;
                if (!player.attacking) player.setState('walk');
            } else if (keys.d) {
                player.vx = player.speed;
                if (!player.attacking) player.setState('walk');
            }
        }

        player.update(dt, enemy);
        enemy.update(dt, player);
    }

    player.draw(ctx);
    enemy.draw(ctx);
    updateParticles();

    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);
