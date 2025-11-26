# ⚔️ Medieval Knight Fighter

A **professional 2D side-scrolling fighting game** with pixel art graphics, advanced combat mechanics, and multiple stages!

## 🎮 **[PLAY NOW →](https://funbun238-droid.github.io/medieval-knight-fighter/)**

---

## ✨ Features

### 🎨 Visual Polish
- **3 Unique Stages** with pixel art backgrounds:
  - 🏰 Castle Arena
  - ⛓️ Dark Dungeon  
  - 🌅 Royal Courtyard
- **Fully Animated Sprites** - Every action has smooth frame-by-frame animation
- **Particle Effects** - Hit sparks, blood effects
- **Screen Shake** - Dynamic camera shake on heavy hits
- **Health & Stamina Bars** - Real-time visual feedback

### ⚔️ Combat System
- **Combo System** - Chain attacks for combo multipliers
- **Stamina Management** - Attacks and dodges cost stamina
- **Block Mechanic** - Reduces incoming damage by 70%
- **Dodge Roll** - Invincibility frames during roll
- **Smart AI Enemy** - Adapts to your playstyle, blocks attacks, counters

### 🎯 Game Mechanics
- **3 Rounds** - Defeat enemies across all stages
- **Stage Progression** - New background for each round
- **Smooth Physics** - Gravity, friction, momentum
- **Collision Detection** - Precise hitboxes
- **Attack Cooldowns** - Balanced combat pacing

---

## 🎮 Controls

| Control | Action |
|---------|--------|
| **A** | Move Left (Backward) |
| **D** | Move Right (Forward) |
| **LEFT CLICK** | Sword Attack (Costs 20 stamina) |
| **RIGHT CLICK** | Block (Hold to defend) |
| **SPACEBAR** | Dodge Roll (Costs 30 stamina) |
| **R** | Restart Game |

---

## 🛠️ Technical Details

- **Engine**: HTML5 Canvas + Vanilla JavaScript
- **Resolution**: 1024x600 (pixel-perfect rendering)
- **Animation System**: Custom sprite sheet renderer
- **AI**: State machine with decision-making algorithms
- **Physics**: Custom 2D physics engine
- **Performance**: Smooth 60 FPS gameplay

### File Structure
```
medieval-knight-fighter/
├── index.html          # Game UI and layout
├── game.js             # Complete game engine (655 lines)
├── assets/
│   ├── sprites/        # Character animations (9 sprite sheets)
│   │   ├── knight_*.webp      # Player animations
│   │   └── enemy_*.webp       # Enemy animations
│   └── backgrounds/    # Stage backgrounds (3 images)
│       └── stage*.webp
└── README.md
```

---

## 🎯 Game Features Breakdown

### Player Abilities
- ✅ **Idle** - Breathing animation while standing
- ✅ **Walk** - 8-frame walking animation
- ✅ **Attack** - 6-frame sword slash with damage detection
- ✅ **Block** - Defensive stance reducing damage
- ✅ **Dodge** - 6-frame roll with invincibility

### Enemy AI Behaviors
- 🤖 **Aggression System** - Gets more aggressive when losing
- 🤖 **Distance Management** - Advances, retreats based on range
- 🤖 **Block Prediction** - Blocks player attacks
- 🤖 **Counter Attacks** - Strikes when player is vulnerable
- 🤖 **Adaptive Combat** - Learns from player patterns

---

## 🏆 Win Condition
Defeat the enemy across **3 rounds** on different stages to achieve victory!

---

## 🚀 Future Enhancements (Planned)
- 🔊 Sound effects and music
- 💥 Special moves and power-ups
- 🏅 Score system and leaderboard
- 🎭 More character skins
- 🌐 Multiplayer mode

---

**Made with ⚔️ by funbun238-droid**

*Powered by HTML5 Canvas, Pixel Art, and Pure JavaScript*
