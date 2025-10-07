import React, { useState, useCallback, useEffect } from 'react';
import './index.css';

// Mouse types with their points and display characters
const MOUSE_TYPES = {
  baby: { points: 1, char: '🐭', name: 'Baby Mouse' },
  child: { points: 2, char: '🐹', name: 'Child Mouse' },
  adult: { points: 3, char: '🐁', name: 'Adult Mouse' },
  grand: { points: 4, char: '🐀', name: 'Grand Mouse' }
};

const CAT_CHAR = '🐱';

// Level configurations
const LEVELS = {
  1: {
    name: "Beginner Hunt",
    miceToWin: 15,
    maxMice: 10,
    mouseSpeed: 2000, // milliseconds
    autoSpawnRate: 0.6,
    obstacles: [],
    description: "Learn the basics! Catch 15 mice to advance."
  },
  2: {
    name: "Speed Challenge",
    miceToWin: 20,
    maxMice: 12,
    mouseSpeed: 1500,
    autoSpawnRate: 0.7,
    obstacles: [
      {row: 4, col: 4}, {row: 4, col: 5}, {row: 5, col: 4}, {row: 5, col: 5}
    ],
    description: "Faster mice with a central obstacle! Catch 20 mice."
  },
  3: {
    name: "Maze Runner",
    miceToWin: 25,
    maxMice: 15,
    mouseSpeed: 1200,
    autoSpawnRate: 0.8,
    obstacles: [
      {row: 2, col: 2}, {row: 2, col: 3}, {row: 2, col: 6}, {row: 2, col: 7},
      {row: 5, col: 1}, {row: 5, col: 2}, {row: 5, col: 7}, {row: 5, col: 8},
      {row: 7, col: 4}, {row: 7, col: 5}, {row: 8, col: 4}, {row: 8, col: 5}
    ],
    description: "Navigate complex mazes! Catch 25 mice."
  },
  4: {
    name: "Chaos Mode",
    miceToWin: 30,
    maxMice: 18,
    mouseSpeed: 1000,
    autoSpawnRate: 0.9,
    obstacles: [
      {row: 1, col: 4}, {row: 1, col: 5}, {row: 3, col: 2}, {row: 3, col: 7},
      {row: 4, col: 1}, {row: 4, col: 8}, {row: 6, col: 2}, {row: 6, col: 7},
      {row: 8, col: 4}, {row: 8, col: 5}
    ],
    description: "Fast mice everywhere! Catch 30 mice."
  },
  5: {
    name: "Master Hunter",
    miceToWin: 40,
    maxMice: 20,
    mouseSpeed: 800,
    autoSpawnRate: 1.0,
    obstacles: [
      {row: 1, col: 1}, {row: 1, col: 8}, {row: 2, col: 4}, {row: 2, col: 5},
      {row: 3, col: 2}, {row: 3, col: 7}, {row: 4, col: 0}, {row: 4, col: 9},
      {row: 5, col: 0}, {row: 5, col: 9}, {row: 6, col: 2}, {row: 6, col: 7},
      {row: 7, col: 4}, {row: 7, col: 5}, {row: 8, col: 1}, {row: 8, col: 8}
    ],
    description: "Ultimate challenge! Lightning-fast mice, complex maze. Catch 40 mice!"
  }
};

function App() {
  const [grid, setGrid] = useState(() => {
    // Initialize 10x10 grid
    return Array(10).fill().map(() => Array(10).fill(null));
  });
  
  const [catPosition, setCatPosition] = useState({ row: 0, col: 0 });
  const [mice, setMice] = useState([]); // Array of {id, row, col, type}
  const [catScore, setCatScore] = useState(0);
  const [miceScore, setMiceScore] = useState(0);
  const [gameLog, setGameLog] = useState([]);
  const [mouseIdCounter, setMouseIdCounter] = useState(1);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [totalMiceCaught, setTotalMiceCaught] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [boomAnimations, setBoomAnimations] = useState([]); // Array of {id, row, col, timestamp}
  const [obstacles, setObstacles] = useState([]); // Array of {row, col}
  const [isPlacingObstacles, setIsPlacingObstacles] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelComplete, setLevelComplete] = useState(false);

  // Add log message
  const addLog = useCallback((message) => {
    setGameLog(prev => [message, ...prev.slice(0, 9)]); // Keep last 10 messages
  }, []);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  }, [audioContext]);

  // Play a tone with specified frequency and duration
  const playTone = useCallback((frequency, duration, type = 'sine') => {
    const ctx = initAudio();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [initAudio]);

  // Sound effects
  const playMouseCatchSound = useCallback(() => {
    // Explosive boom sound for catching a mouse
    playTone(150, 0.1, 'square'); // Low boom
    setTimeout(() => playTone(300, 0.1, 'square'), 50); // Mid boom
    setTimeout(() => playTone(600, 0.1, 'triangle'), 100); // High crack
    setTimeout(() => playTone(440, 0.2, 'sine'), 150); // Victory tone
  }, [playTone]);

  const playMouseEscapeSound = useCallback(() => {
    // Descending tones for mouse escaping
    playTone(800, 0.1, 'triangle');
    setTimeout(() => playTone(600, 0.1, 'triangle'), 100);
    setTimeout(() => playTone(400, 0.2, 'triangle'), 200);
  }, [playTone]);

  const playMouseSpawnSound = useCallback(() => {
    // Quick chirp for mouse spawning
    playTone(1000, 0.05, 'sine');
    setTimeout(() => playTone(1200, 0.05, 'sine'), 50);
  }, [playTone]);

  const playCatMoveSound = useCallback(() => {
    // Subtle low tone for cat movement
    playTone(200, 0.1, 'sawtooth');
  }, [playTone]);

  // Background music
  const playBackgroundMusic = useCallback(() => {
    if (!isMusicPlaying) return;
    
    const melody = [
      { freq: 523, duration: 0.5 }, // C5
      { freq: 587, duration: 0.5 }, // D5
      { freq: 659, duration: 0.5 }, // E5
      { freq: 698, duration: 0.5 }, // F5
      { freq: 784, duration: 0.5 }, // G5
      { freq: 659, duration: 0.5 }, // E5
      { freq: 523, duration: 1.0 }, // C5
    ];

    let delay = 0;
    melody.forEach((note, index) => {
      setTimeout(() => {
        if (isMusicPlaying) {
          playTone(note.freq, note.duration, 'sine');
        }
      }, delay * 1000);
      delay += note.duration;
    });

    // Loop the music
    if (isMusicPlaying) {
      setTimeout(() => playBackgroundMusic(), delay * 1000);
    }
  }, [isMusicPlaying, playTone]);

  // Toggle background music
  const toggleMusic = useCallback(() => {
    setIsMusicPlaying(prev => {
      const newState = !prev;
      if (newState) {
        initAudio();
        setTimeout(() => playBackgroundMusic(), 100);
      }
      return newState;
    });
  }, [initAudio, playBackgroundMusic]);

  // Create confetti animation
  const createConfetti = useCallback(() => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
      '#ff9f43', '#10ac84', '#ee5a24', '#0984e3'
    ];
    
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    confettiContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 10000;
      overflow: hidden;
    `;

    // Create 150 confetti pieces for full screen effect
    for (let i = 0; i < 150; i++) {
      const confetti = document.createElement('div');
      const size = Math.random() * 10 + 5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const animationDuration = Math.random() * 2 + 2;
      const delay = Math.random() * 2;
      
      confetti.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        left: ${left}%;
        top: -10px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        animation: confetti-fall ${animationDuration}s linear ${delay}s infinite;
        transform: rotate(${Math.random() * 360}deg);
      `;
      
      confettiContainer.appendChild(confetti);
    }

    return confettiContainer;
  }, []);

  // Trigger confetti celebration
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    
    const confettiContainer = createConfetti();
    document.body.appendChild(confettiContainer);
    
    // Play celebration sound
    setTimeout(() => {
      playTone(523, 0.2, 'sine'); // C
      setTimeout(() => playTone(659, 0.2, 'sine'), 150); // E
      setTimeout(() => playTone(784, 0.2, 'sine'), 300); // G
      setTimeout(() => playTone(1047, 0.4, 'sine'), 450); // C high
    }, 100);
    
    // Remove confetti after 4 seconds
    setTimeout(() => {
      setShowConfetti(false);
      if (document.body.contains(confettiContainer)) {
        document.body.removeChild(confettiContainer);
      }
    }, 4000);
  }, [createConfetti, playTone]);

  // Create boom animation at specific position
  const triggerBoomAnimation = useCallback((row, col) => {
    const boomId = Date.now() + Math.random();
    setBoomAnimations(prev => [...prev, { id: boomId, row, col, timestamp: Date.now() }]);
    
    // Remove boom animation after 1 second
    setTimeout(() => {
      setBoomAnimations(prev => prev.filter(boom => boom.id !== boomId));
    }, 1000);
  }, []);

  // Toggle obstacle placement mode
  const toggleObstacleMode = useCallback(() => {
    setIsPlacingObstacles(prev => !prev);
  }, []);

  // Place or remove obstacle at position
  const toggleObstacle = useCallback((row, col) => {
    // Cannot place obstacle on cat position
    if (row === catPosition.row && col === catPosition.col) {
      addLog('Cannot place obstacle on cat position! 🐱');
      return;
    }

    // Cannot place obstacle on mouse position
    const mouseAtPosition = mice.some(mouse => mouse.row === row && mouse.col === col);
    if (mouseAtPosition) {
      addLog('Cannot place obstacle on mouse position! 🐭');
      return;
    }

    setObstacles(prev => {
      const existingObstacle = prev.find(obs => obs.row === row && obs.col === col);
      if (existingObstacle) {
        // Remove obstacle
        addLog(`Removed obstacle at (${row}, ${col}) 🧱`);
        return prev.filter(obs => !(obs.row === row && obs.col === col));
      } else {
        // Add obstacle
        addLog(`Placed obstacle at (${row}, ${col}) 🧱`);
        return [...prev, { row, col }];
      }
    });
  }, [catPosition, mice, addLog]);

  // Clear all obstacles
  const clearAllObstacles = useCallback(() => {
    setObstacles([]);
    addLog('Cleared all obstacles! 🧹');
  }, [addLog]);

  // Initialize level
  const initializeLevel = useCallback((level) => {
    const levelConfig = LEVELS[level];
    setObstacles(levelConfig.obstacles);
    setMice([]);
    setCatPosition({ row: 0, col: 0 });
    setTotalMiceCaught(0);
    setBoomAnimations([]);
    setShowConfetti(false);
    setLevelComplete(false);
    setIsPlacingObstacles(false);
    addLog(`🎮 Level ${level}: ${levelConfig.name} - ${levelConfig.description}`);
  }, [addLog]);

  // Check level completion
  useEffect(() => {
    const levelConfig = LEVELS[currentLevel];
    if (totalMiceCaught >= levelConfig.miceToWin && !levelComplete) {
      setLevelComplete(true);
      setTimeout(() => {
        triggerConfetti();
        addLog(`🎉 LEVEL ${currentLevel} COMPLETE! 🎉`);
        if (currentLevel < 5) {
          addLog(`Ready for Level ${currentLevel + 1}?`);
        } else {
          addLog(`🏆 CONGRATULATIONS! You've mastered all levels! 🏆`);
        }
      }, 500);
    }
  }, [totalMiceCaught, currentLevel, levelComplete, triggerConfetti, addLog]);

  // Advance to next level
  const nextLevel = useCallback(() => {
    if (currentLevel < 5) {
      const newLevel = currentLevel + 1;
      setCurrentLevel(newLevel);
      initializeLevel(newLevel);
    }
  }, [currentLevel, initializeLevel]);

  // Go to previous level
  const previousLevel = useCallback(() => {
    if (currentLevel > 1) {
      const newLevel = currentLevel - 1;
      setCurrentLevel(newLevel);
      initializeLevel(newLevel);
    }
  }, [currentLevel, initializeLevel]);

  // Initialize first level on component mount
  useEffect(() => {
    initializeLevel(1);
  }, [initializeLevel]);

  // Update grid based on current positions
  useEffect(() => {
    const newGrid = Array(10).fill().map(() => Array(10).fill(null));
    
    // Place obstacles first
    obstacles.forEach(obstacle => {
      newGrid[obstacle.row][obstacle.col] = { type: 'obstacle', char: '🧱' };
    });
    
    // Place mice
    mice.forEach(mouse => {
      if (mouse.row >= 0 && mouse.row < 10 && mouse.col >= 0 && mouse.col < 10) {
        // Don't place mouse if there's an obstacle
        if (!obstacles.some(obs => obs.row === mouse.row && obs.col === mouse.col)) {
          newGrid[mouse.row][mouse.col] = { 
            type: 'mouse', 
            char: MOUSE_TYPES[mouse.type].char,
            mouseType: mouse.type,
            points: MOUSE_TYPES[mouse.type].points
          };
        }
      }
    });
    
    // Place cat on top (this will override any mouse at the same position for display)
    // But cat cannot be placed on obstacles
    if (!obstacles.some(obs => obs.row === catPosition.row && obs.col === catPosition.col)) {
      newGrid[catPosition.row][catPosition.col] = { type: 'cat', char: CAT_CHAR };
    }
    
    setGrid(newGrid);
  }, [catPosition, mice, obstacles]);

  // Get valid moves for a position (avoiding obstacles)
  const getValidMoves = useCallback((row, col) => {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue; // Skip current position
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
          // Check if destination is not blocked by obstacle
          const hasObstacle = obstacles.some(obs => obs.row === newRow && obs.col === newCol);
          if (!hasObstacle) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
    }
    return moves;
  }, [obstacles]);

  // Move cat in direction
  const moveCat = useCallback((direction) => {
    const directions = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 }
    };

    const delta = directions[direction];
    if (!delta) return;

    const newRow = catPosition.row + delta.row;
    const newCol = catPosition.col + delta.col;

    // Check if move is within bounds and not blocked by obstacle
    if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
      // Check if destination has an obstacle
      const hasObstacle = obstacles.some(obs => obs.row === newRow && obs.col === newCol);
      
      if (!hasObstacle) {
        // Check if there's a mouse at the new position
        const caughtMouse = mice.find(mouse => mouse.row === newRow && mouse.col === newCol);
        
        if (caughtMouse) {
          // Cat catches mouse
          const points = MOUSE_TYPES[caughtMouse.type].points;
          setCatScore(prev => prev + points);
          setMiceScore(prev => prev - 1); // Mice player loses 1 point
          setMice(prev => prev.filter(mouse => mouse.id !== caughtMouse.id));
          
          // Trigger boom animation at mouse position
          triggerBoomAnimation(caughtMouse.row, caughtMouse.col);
          
          // Track total mice caught and trigger confetti every 5 mice
          setTotalMiceCaught(prev => {
            const newTotal = prev + 1;
            if (newTotal % 5 === 0) {
              setTimeout(() => {
                triggerConfetti();
                addLog(`🎉 AMAZING! Cat caught ${newTotal} mice! CONFETTI CELEBRATION! 🎉`);
              }, 100);
            }
            return newTotal;
          });
          
          addLog(`Cat caught ${MOUSE_TYPES[caughtMouse.type].name}! Cat +${points}, Mice -1`);
          playMouseCatchSound(); // Play catch sound
        }
        
        setCatPosition({ row: newRow, col: newCol });
        playCatMoveSound(); // Play movement sound
      } else {
        addLog('Cat cannot move through obstacles! 🧱');
      }
    }
  }, [catPosition, mice, obstacles, addLog, playMouseCatchSound, playCatMoveSound, triggerConfetti, triggerBoomAnimation]);

    // Spawn a random mouse
  const spawnMouse = useCallback(() => {
    const levelConfig = LEVELS[currentLevel];
    // Check if we already have max mice for this level
    if (mice.length >= levelConfig.maxMice) {
      addLog(`Maximum ${levelConfig.maxMice} mice allowed on Level ${currentLevel}!`);
      return;
    }

    const mouseTypes = Object.keys(MOUSE_TYPES);
    const randomType = mouseTypes[Math.floor(Math.random() * mouseTypes.length)];
    
    // Find empty cells (excluding cat position and obstacles)
    const emptyCells = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        // Check if cell is not occupied by cat, other mice, or obstacles
        const isOccupiedByCat = (row === catPosition.row && col === catPosition.col);
        const isOccupiedByMouse = mice.some(mouse => mouse.row === row && mouse.col === col);
        const hasObstacle = obstacles.some(obs => obs.row === row && obs.col === col);
        
        if (!isOccupiedByCat && !isOccupiedByMouse && !hasObstacle) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const newMouse = {
        id: mouseIdCounter,
        row: randomCell.row,
        col: randomCell.col,
        type: randomType
      };
      
      setMice(prev => [...prev, newMouse]);
      setMouseIdCounter(prev => prev + 1);
      addLog(`Spawned ${MOUSE_TYPES[randomType].name} at (${randomCell.row}, ${randomCell.col})`);
      playMouseSpawnSound(); // Play spawn sound
    } else {
      addLog('No empty cells to spawn mouse!');
    }
  }, [mice, catPosition, obstacles, mouseIdCounter, currentLevel, addLog, playMouseSpawnSound]);

  // Move a specific mouse
  const moveMouse = useCallback((mouseId) => {
    setMice(prev => prev.map(mouse => {
      if (mouse.id !== mouseId) return mouse;
      
      const validMoves = getValidMoves(mouse.row, mouse.col);
      if (validMoves.length === 0) return mouse;
      
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      const newRow = randomMove.row;
      const newCol = randomMove.col;
      
      // Check if mouse escapes (goes off grid)
      if (newRow < 0 || newRow >= 10 || newCol < 0 || newCol >= 10) {
        setMiceScore(prev => prev + 5);
        addLog(`${MOUSE_TYPES[mouse.type].name} escaped! Mice +5 points`);
        playMouseEscapeSound(); // Play escape sound
        return null; // Remove mouse
      }
      
      return { ...mouse, row: newRow, col: newCol };
    }).filter(Boolean));
  }, [getValidMoves, addLog, playMouseEscapeSound]);

    // Auto-move all mice based on current level speed
  useEffect(() => {
    const levelConfig = LEVELS[currentLevel];
    const interval = setInterval(() => {
      if (mice.length > 0) {
        mice.forEach(mouse => {
          if (Math.random() < 0.9) { // 90% chance to move
            moveMouse(mouse.id);
          }
        });
      }
    }, levelConfig.mouseSpeed);

    return () => clearInterval(interval);
  }, [mice, moveMouse, currentLevel]);

  // Auto-spawn mice when there are fewer than level maximum
  useEffect(() => {
    const levelConfig = LEVELS[currentLevel];
    const spawnInterval = setInterval(() => {
      if (mice.length < levelConfig.maxMice) {
        // Use level-specific spawn rate
        if (Math.random() < levelConfig.autoSpawnRate) {
          spawnMouse();
        }
      }
    }, 1500);

    return () => clearInterval(spawnInterval);
  }, [mice.length, spawnMouse, currentLevel]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch(e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          moveCat('up');
          break;
        case 'arrowdown':
        case 's':
          moveCat('down');
          break;
        case 'arrowleft':
        case 'a':
          moveCat('left');
          break;
        case 'arrowright':
        case 'd':
          moveCat('right');
          break;
        case ' ':
          e.preventDefault();
          spawnMouse();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [moveCat, spawnMouse]);

  // Reset game
  const resetGame = useCallback(() => {
    initializeLevel(currentLevel); // Reset current level
    setCatScore(0);
    setMiceScore(0);
    setGameLog([]);
    setMouseIdCounter(1);
    addLog(`Game reset! Level ${currentLevel} restarted.`);
  }, [currentLevel, initializeLevel, addLog]);

  return (
    <div className="game-container">
      <h1 className="game-title">🐱 Catching Mice Game 🐭</h1>
      
      {/* Level Display and Controls */}
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        marginBottom: '20px',
        background: 'linear-gradient(45deg, #3498db, #9b59b6)',
        padding: '15px 30px',
        borderRadius: '15px',
        color: 'white',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
      }}>
        <button 
          className="spawn-btn" 
          onClick={previousLevel}
          disabled={currentLevel === 1}
          style={{backgroundColor: currentLevel === 1 ? '#bdc3c7' : '#e74c3c'}}
        >
          ← Previous
        </button>
        
        <div style={{textAlign: 'center', flex: '1'}}>
          <h2 style={{margin: '0 0 5px 0', fontSize: '24px'}}>
            Level {currentLevel}: {LEVELS[currentLevel].name}
          </h2>
          <div style={{fontSize: '14px', opacity: '0.9'}}>
            {LEVELS[currentLevel].description}
          </div>
          <div style={{fontSize: '12px', marginTop: '5px'}}>
            Progress: {totalMiceCaught}/{LEVELS[currentLevel].miceToWin} mice caught
            {levelComplete && <span style={{color: '#2ecc71', fontWeight: 'bold'}}> ✅ COMPLETE!</span>}
          </div>
        </div>
        
        <button 
          className="spawn-btn" 
          onClick={nextLevel}
          disabled={!levelComplete || currentLevel === 5}
          style={{
            backgroundColor: (!levelComplete || currentLevel === 5) ? '#bdc3c7' : '#27ae60'
          }}
        >
          {currentLevel === 5 ? '🏆 Final' : 'Next →'}
        </button>
      </div>
      
      <div style={{marginBottom: '20px'}}>
        <button 
          className="spawn-btn" 
          onClick={toggleMusic}
          style={{
            backgroundColor: isMusicPlaying ? '#e74c3c' : '#27ae60',
            marginRight: '10px'
          }}
        >
          {isMusicPlaying ? '🔇 Stop Music' : '🎵 Play Music'}
        </button>
      </div>
      
      <div className="game-content">
        <div className="game-board">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              // Check if there's a boom animation at this position
              const boom = boomAnimations.find(b => b.row === rowIndex && b.col === colIndex);
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`cell ${cell?.type || ''} ${isPlacingObstacles ? 'placing-obstacles' : ''}`}
                  onClick={() => {
                    if (isPlacingObstacles) {
                      // Place or remove obstacle
                      toggleObstacle(rowIndex, colIndex);
                    } else {
                      // Allow manual mouse movement by clicking
                      const mouse = mice.find(m => m.row === rowIndex && m.col === colIndex);
                      if (mouse) {
                        moveMouse(mouse.id);
                      }
                    }
                  }}
                  style={{ position: 'relative' }}
                >
                  {cell?.char || ''}
                  {boom && (
                    <>
                      <div className="boom-animation">
                        💥 BOOM!
                      </div>
                      {/* Create explosion particles */}
                      {[...Array(8)].map((_, i) => {
                        const angle = (i * 45) * Math.PI / 180;
                        const distance = 30;
                        const dx = Math.cos(angle) * distance;
                        const dy = Math.sin(angle) * distance;
                        return (
                          <div
                            key={i}
                            className="boom-particles"
                            style={{
                              '--dx': `${dx}px`,
                              '--dy': `${dy}px`,
                              animationDelay: `${i * 0.05}s`
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="controls">
          <div className="player-section">
            <h3>🐱 Cat Player</h3>
            <div className="score cat-score">Score: {catScore}</div>
            <div style={{fontSize: '14px', color: '#7f8c8d', marginBottom: '10px'}}>
              Mice Caught: {totalMiceCaught} 
              {totalMiceCaught > 0 && totalMiceCaught % 5 === 0 && <span style={{color: '#e74c3c', fontWeight: 'bold'}}> 🎉</span>}
            </div>
            <div style={{fontSize: '12px', color: '#95a5a6', marginBottom: '10px'}}>
              Next celebration at {Math.ceil(totalMiceCaught / 5) * 5} mice!
            </div>
            <div className="direction-controls">
              <div></div>
              <button className="direction-btn" onClick={() => moveCat('up')}>↑</button>
              <div></div>
              <button className="direction-btn" onClick={() => moveCat('left')}>←</button>
              <div></div>
              <button className="direction-btn" onClick={() => moveCat('right')}>→</button>
              <div></div>
              <button className="direction-btn" onClick={() => moveCat('down')}>↓</button>
              <div></div>
            </div>
            <div style={{fontSize: '12px', textAlign: 'center'}}>
              Use arrow keys or WASD
            </div>
          </div>

          <div className="player-section">
            <h3>🐭 Mice Player</h3>
            <div className="score mice-score">Score: {miceScore}</div>
            <button className="spawn-btn" onClick={spawnMouse}>
              Spawn Random Mouse
            </button>
            <div style={{fontSize: '12px', textAlign: 'center', marginBottom: '10px'}}>
              Press SPACE to spawn ({mice.length}/{LEVELS[currentLevel].maxMice})
            </div>
            
            <div className="mouse-legend">
              <div className="legend-item">
                <span className="legend-icon">🐭</span>
                <span>Baby (1pt)</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon">🐹</span>
                <span>Child (2pts)</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon">🐁</span>
                <span>Adult (3pts)</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon">🐀</span>
                <span>Grand (4pts)</span>
              </div>
            </div>
            
            <div className="mouse-info">
              Active Mice: {mice.length}/{LEVELS[currentLevel].maxMice}
              <br />
              Goal: {LEVELS[currentLevel].miceToWin} mice
              <br />
              Speed: {LEVELS[currentLevel].mouseSpeed}ms
              <br />
              Escape = +5 pts
              <br />
              Caught = -1 pt
            </div>
          </div>

          <div className="player-section">
            <h3>🧱 Obstacles</h3>
            <button 
              className="spawn-btn" 
              onClick={toggleObstacleMode}
              style={{
                backgroundColor: isPlacingObstacles ? '#e74c3c' : '#9b59b6',
                marginBottom: '10px'
              }}
            >
              {isPlacingObstacles ? '🚫 Stop Placing' : '🧱 Place Obstacles'}
            </button>
            
            <div style={{fontSize: '12px', textAlign: 'center', marginBottom: '10px'}}>
              {isPlacingObstacles ? 'Click grid to add/remove' : 'Click to start placing'}
            </div>
            
            <div style={{fontSize: '12px', color: '#95a5a6', marginBottom: '10px'}}>
              Active Obstacles: {obstacles.length}
            </div>
            
            <button 
              className="spawn-btn" 
              onClick={clearAllObstacles}
              style={{backgroundColor: '#e67e22', fontSize: '14px'}}
              disabled={obstacles.length === 0}
            >
              🧹 Clear All
            </button>
            
            <div className="mouse-info" style={{marginTop: '10px'}}>
              Blocks movement
              <br />
              for cats & mice
              <br />
              🧱 = Wall
            </div>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', gap: '20px', margin: '20px 0'}}>
        <button className="spawn-btn" onClick={resetGame} style={{backgroundColor: '#e74c3c'}}>
          Reset Game
        </button>
      </div>

      {showConfetti && (
        <div className="celebration-overlay">
          🎉 FANTASTIC! 🎉
          <br />
          Cat caught {Math.floor(totalMiceCaught / 5) * 5} mice!
          <br />
          🎊 CONFETTI TIME! 🎊
        </div>
      )}

      <div className="player-section" style={{width: '600px', maxWidth: '90vw'}}>
        <h3>Game Log</h3>
        <div className="game-log">
          {gameLog.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>

      <div className="player-section" style={{fontSize: '14px', maxWidth: '600px'}}>
        <h3>How to Play</h3>
        <ul style={{textAlign: 'left', margin: 0}}>
          <li><strong>🎮 Levels:</strong> Complete 5 levels with increasing difficulty and unique challenges</li>
          <li><strong>Cat Player:</strong> Use arrow keys or WASD to move the cat and catch mice</li>
          <li><strong>Mice Player:</strong> Press SPACE or click "Spawn Random Mouse" to add mice</li>
          <li><strong>🧱 Obstacles:</strong> Click "Place Obstacles" then click grid to add/remove walls</li>
          <li><strong>Scoring:</strong> Cat gets points equal to mouse value when catching, Mice get 5 points when escaping</li>
          <li><strong>Level Goals:</strong> Catch the required number of mice to unlock next level</li>
          <li><strong>Movement:</strong> All pieces can move to any adjacent cell (including diagonally)</li>
          <li><strong>Blocking:</strong> Neither cats nor mice can pass through obstacles</li>
          <li><strong>Auto-movement:</strong> Mice speed increases with each level</li>
          <li><strong>🎉 Celebration:</strong> Full-screen confetti animation every 5 mice caught!</li>
          <li><strong>Click mice:</strong> Click on a mouse to make it move immediately</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
