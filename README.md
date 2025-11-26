# ⚔️ Medieval Knight Fighter

A 2D side-scrolling fighting game with pixel art style, featuring knights in silver armor with full sprite animations!

![Game Preview](https://img.shields.io/badge/Status-Playable-brightgreen) ![HTML5](https://img.shields.io/badge/HTML5-Game-orange) ![JavaScript](https://img.shields.io/badge/JavaScript-Canvas-yellow)

## 🎮 Play Now

**[Click here to play the game!](https://funbun238-droid.github.io/medieval-knight-fighter/)**

> Note: You need to enable GitHub Pages first. See instructions below.

## 🎯 Features

- ✅ **Full Sprite Animations**: Idle, Walk, Attack, Block, and Dodge
- ✅ **AI-Powered Enemy**: Smart CPU opponent with combat tactics
- ✅ **Smooth Combat System**: Responsive controls and fluid animations
- ✅ **Pixel Art Style**: Retro medieval aesthetic with silver knight armor
- ✅ **Health System**: Dynamic health bars for both fighters
- ✅ **Browser-Based**: Play directly in your web browser (Windows compatible)

## 🕹️ Controls

| Action | Control |
|--------|---------|
| **Move Left** | `A` key |
| **Move Right** | `D` key |
| **Attack** | `Left Mouse Button` |
| **Block** | `Right Mouse Button` |
| **Dodge** | `Spacebar` |

## 🚀 How to Enable GitHub Pages

1. Go to your repository: https://github.com/funbun238-droid/medieval-knight-fighter
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar under "Code and automation")
4. Under **Source**, select `main` branch
5. Click **Save**
6. Wait 1-2 minutes for deployment
7. Play at: **https://funbun238-droid.github.io/medieval-knight-fighter/**

## 🎨 Sprites

All sprites are AI-generated pixel art featuring:
- Knight in silver armor
- Idle breathing animation (4 frames)
- Walk forward/backward animations (8 frames each)
- Sword attack animation (6 frames)
- Defensive block animation (5 frames)
- Dodge roll animation (6 frames)

## 🏗️ Project Structure

```
medieval-knight-fighter/
├── index.html          # Main game page
├── game.js            # Game engine and logic
├── assets/
│   └── sprites/       # All animation sprite sheets
│       ├── knight_idle.webp
│       ├── knight_walk_forward.webp
│       ├── knight_walk_backward.webp
│       ├── knight_attack.webp
│       ├── knight_block.webp
│       └── knight_dodge.webp
└── README.md
```

## 🎯 Game Mechanics

### Combat System
- **Attack**: Deal 15 damage to enemy (10 for enemy attacks)
- **Block**: Prevents damage when timed correctly
- **Dodge**: Quick evasive maneuver to avoid attacks
- **Health**: Both fighters start with 100 HP

### AI Behavior
- Pursues player when out of range
- Switches between attack, block, and dodge in combat
- Responsive to player position and actions

## 💻 Technical Details

- **Engine**: HTML5 Canvas with JavaScript
- **Animation System**: Sprite sheet frame-based animation
- **Rendering**: Pixelated rendering for retro aesthetic
- **Performance**: 60 FPS smooth gameplay

## 🛠️ Local Development

To run locally:
1. Clone the repository
2. Open `index.html` in a modern web browser
3. Start playing!

No build process or dependencies required.

## 📝 License

This project is open source and available for personal use and modification.

## 🎮 Future Enhancements

Potential features to add:
- Multiple enemy types
- Different stages/backgrounds
- Power-ups and special moves
- Multiplayer mode
- Sound effects and music
- More character customization

---

**Enjoy the medieval combat! ⚔️🛡️**
