// WORKING Sprite Animation System
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Crisp pixels

const game = {
    player: null,
    enemy: null,
    playerHP: 100,
    enemyHP: 100,
    over: false,
    keys: {}
};

// ACTUAL WORKING SPRITE ANIMATION
class SpriteAnim {
    constructor(img, frameCount) {
        this.img = img;
        this.frameCount = frameCount;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameDelay = 100; // milliseconds per frame
    }

    update(dt) {
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDelay) {
            this.frameTimer = 0;
            this.frameIndex++;
            if (this.frameIndex >= this.frameCount) {
                this.frameIndex = 0; // Loop back to start
            }
        }
    }

    draw(ctx, x, y, w, h, flip) {
        if (!this.img || !this.img.complete) return;

        const frameW = this.img.width / this.frameCount;
        const frameH = this.img.height;
        const sx = this.frameIndex * frameW;

        ctx.save();
        if (flip) {
            ctx.translate(x + w, y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, sx, 0, frameW, frameH, 0, 0, w, h);
        } else {
            ctx.drawImage(this.img, sx, 0, frameW, frameH, x, y, w, h);
        }
        ctx.restore();
    }

    reset() {
        this.frameIndex = 0;
        this.frameTimer = 0;
    }
}

// Fighter with WORKING animations
class Fighter {
    constructor(x, y, isPlayer) {
        this.x = x;
        this.y = y;
        this.w = 150;
        this.h = 150;
        this.isPlayer = isPlayer;
        this.vx = 0;
        this.speed = 4;

        this.state = 'idle';
        this.locked = false;
        this.attacking = false;
        this.blocking = false;
        this.attackCD = 0;

        this.anims = {};
        this.currentAnim = null;

        if (!isPlayer) {
            this.aiTimer = 0;
        }
    }

    setAnims(idle, walk, attack) {
        this.anims = {
            idle: new SpriteAnim(idle, 4),
            walk: new SpriteAnim(walk, 8),
            attack: new SpriteAnim(attack, 6)
        };
        this.currentAnim = this.anims.idle;
    }

    setState(name, lock = false) {
        if (this.locked && name !== 'idle') return;
        if (this.state !== name && this.anims[name]) {
            this.state = name;
            this.currentAnim = this.anims[name];
            this.currentAnim.reset();
            this.locked = lock;
        }
    }

    update(dt, other) {
        this.attackCD = Math.max(0, this.attackCD - dt);

        if (this.currentAnim) {
            this.currentAnim.update(dt);

            // Unlock when attack animation completes
            if (this.locked && this.currentAnim.frameIndex === 0 && this.currentAnim.frameTimer > 10) {
                this.locked = false;
                this.attacking = false;
                this.setState('idle');
            }
        }

        // Simple AI
        if (!this.isPlayer && other && !this.locked) {
            this.aiTimer += dt;
            if (this.aiTimer > 1000) {
                this.aiTimer = 0;
                const dist = Math.abs(other.x - this.x);
                if (dist < 180 && Math.random() > 0.4) {
                    this.attack(other);
                } else if (dist > 200) {
                    this.vx = (other.x > this.x) ? 2 : -2;
                }
            }
        }

        this.x += this.vx;
        this.vx *= 0.85;
        this.x = Math.max(50, Math.min(canvas.width - this.w - 50, this.x));

        if (!this.locked && Math.abs(this.vx) > 0.5) {
            this.setState('walk');
        } else if (!this.locked && Math.abs(this.vx) <= 0.5) {
            this.setState('idle');
        }
    }

    attack(other) {
        if (this.attackCD > 0 || this.locked) return;
        this.attacking = true;
        this.setState('attack', true);
        this.attackCD = 800;

        setTimeout(() => {
            if (other && !other.blocking) {
                const dist = Math.abs(this.x - other.x);
                if (dist < 180) {
                    const dmg = 8 + Math.random() * 8;
                    if (this.isPlayer) {
                        game.enemyHP = Math.max(0, game.enemyHP - dmg);
                        updateHP('enemy', game.enemyHP);
                    } else {
                        game.playerHP = Math.max(0, game.playerHP - dmg);
                        updateHP('player', game.playerHP);
                    }
                }
            }
        }, 300);
    }

    block() {
        if (this.locked) return;
        this.blocking = true;
        this.setState('idle', true);
        setTimeout(() => {
            this.blocking = false;
            this.locked = false;
        }, 500);
    }

    draw(ctx) {
        if (this.currentAnim) {
            this.currentAnim.draw(ctx, this.x, this.y, this.w, this.h, !this.isPlayer);
        }

        // Show state for debugging
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(this.state + ' F:' + (this.currentAnim ? this.currentAnim.frameIndex : 0), this.x, this.y - 10);
    }
}

// Input
document.addEventListener('keydown', e => {
    game.keys[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup', e => {
    game.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && game.player) game.player.attack(game.enemy);
    else if (e.button === 2 && game.player) game.player.block();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// UI
function updateHP(who, hp) {
    const bar = document.getElementById(`${who}Health`);
    if (bar) bar.style.width = `${hp}%`;

    if (hp <= 0 && !game.over) {
        game.over = true;
        setTimeout(() => {
            alert(who === 'enemy' ? 'YOU WIN!' : 'YOU LOSE!');
            location.reload();
        }, 800);
    }
}

// Load and Start
async function init() {
    console.log('Loading sprites...');
    document.getElementById('loading').innerHTML = 'LOADING SPRITES...';

    const idleImg = new Image();
    const walkImg = new Image();
    const attackImg = new Image();
    const bgImg = new Image();

    let loaded = 0;
    const onLoad = () => {
        loaded++;
        document.getElementById('loading').innerHTML = `LOADING... ${loaded}/4`;
        if (loaded === 4) startGame();
    };

    idleImg.onload = walkImg.onload = attackImg.onload = bgImg.onload = onLoad;

    idleImg.src = 'assets/sprites/knight_idle_NEW.webp';
    walkImg.src = 'assets/sprites/knight_walk_NEW.webp';
    attackImg.src = 'assets/sprites/knight_attack_NEW.webp';
    bgImg.src = 'assets/stages/stage1_castle.webp';

    window.bgImg = bgImg;
    window.spriteImgs = { idle: idleImg, walk: walkImg, attack: attackImg };
}

function startGame() {
    document.getElementById('loading').style.display = 'none';
    console.log('Starting game!');

    game.player = new Fighter(200, 400, true);
    game.enemy = new Fighter(900, 400, false);

    game.player.setAnims(window.spriteImgs.idle, window.spriteImgs.walk, window.spriteImgs.attack);
    game.enemy.setAnims(window.spriteImgs.idle, window.spriteImgs.walk, window.spriteImgs.attack);

    gameLoop();
}

// Game Loop
let last = 0;
function gameLoop(time = 0) {
    const dt = time - last;
    last = time;

    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background
    if (window.bgImg && window.bgImg.complete) {
        ctx.drawImage(window.bgImg, 0, 0, canvas.width, canvas.height);
    }

    // Ground
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 550, canvas.width, 50);

    if (!game.over) {
        // Player controls
        if (!game.player.locked) {
            if (game.keys.a) game.player.vx = -game.player.speed;
            else if (game.keys.d) game.player.vx = game.player.speed;
        }

        game.player.update(dt, game.enemy);
        game.enemy.update(dt, game.player);
    }

    game.player.draw(ctx);
    game.enemy.draw(ctx);

    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);
