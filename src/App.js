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
    // Quick ascending notes for catching a mouse
    playTone(440, 0.1, 'square');
    setTimeout(() => playTone(660, 0.1, 'square'), 100);
    setTimeout(() => playTone(880, 0.2, 'square'), 200);
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

  // Update grid based on current positions
  useEffect(() => {
    const newGrid = Array(10).fill().map(() => Array(10).fill(null));
    
    // Place mice first
    mice.forEach(mouse => {
      if (mouse.row >= 0 && mouse.row < 10 && mouse.col >= 0 && mouse.col < 10) {
        newGrid[mouse.row][mouse.col] = { 
          type: 'mouse', 
          char: MOUSE_TYPES[mouse.type].char,
          mouseType: mouse.type,
          points: MOUSE_TYPES[mouse.type].points
        };
      }
    });
    
    // Place cat on top (this will override any mouse at the same position for display)
    newGrid[catPosition.row][catPosition.col] = { type: 'cat', char: CAT_CHAR };
    
    setGrid(newGrid);
  }, [catPosition, mice]);

  // Get valid moves for a position
  const getValidMoves = useCallback((row, col) => {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue; // Skip current position
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }
    return moves;
  }, []);

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

    // Check if move is within bounds
    if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
      // Check if there's a mouse at the new position
      const caughtMouse = mice.find(mouse => mouse.row === newRow && mouse.col === newCol);
      
      if (caughtMouse) {
        // Cat catches mouse
        const points = MOUSE_TYPES[caughtMouse.type].points;
        setCatScore(prev => prev + points);
        setMiceScore(prev => prev - 1); // Mice player loses 1 point
        setMice(prev => prev.filter(mouse => mouse.id !== caughtMouse.id));
        addLog(`Cat caught ${MOUSE_TYPES[caughtMouse.type].name}! Cat +${points}, Mice -1`);
        playMouseCatchSound(); // Play catch sound
      }
      
      setCatPosition({ row: newRow, col: newCol });
      playCatMoveSound(); // Play movement sound
    }
  }, [catPosition, mice, addLog, playMouseCatchSound, playCatMoveSound]);

  // Spawn a random mouse
  const spawnMouse = useCallback(() => {
    // Check if we already have 10 mice
    if (mice.length >= 10) {
      addLog('Maximum 10 mice allowed on the grid!');
      return;
    }

    const mouseTypes = Object.keys(MOUSE_TYPES);
    const randomType = mouseTypes[Math.floor(Math.random() * mouseTypes.length)];
    
    // Find empty cells (excluding cat position)
    const emptyCells = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        // Check if cell is not occupied by cat or other mice
        const isOccupiedByCat = (row === catPosition.row && col === catPosition.col);
        const isOccupiedByMouse = mice.some(mouse => mouse.row === row && mouse.col === col);
        
        if (!isOccupiedByCat && !isOccupiedByMouse) {
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
  }, [mice, catPosition, mouseIdCounter, addLog, playMouseSpawnSound]);

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

  // Auto-move all mice every 1.5 seconds (faster movement)
  useEffect(() => {
    const interval = setInterval(() => {
      if (mice.length > 0) {
        mice.forEach(mouse => {
          if (Math.random() < 0.8) { // 80% chance to move (increased from 70%)
            moveMouse(mouse.id);
          }
        });
      }
    }, 1500); // Reduced from 3000ms to 1500ms for faster movement

    return () => clearInterval(interval);
  }, [mice, moveMouse]);

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
    setCatPosition({ row: 0, col: 0 });
    setMice([]);
    setCatScore(0);
    setMiceScore(0);
    setGameLog([]);
    setMouseIdCounter(1);
    addLog('Game reset!');
  }, [addLog]);

  return (
    <div className="game-container">
      <h1 className="game-title">🐱 Catching Mice Game 🐭</h1>
      
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
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${cell?.type || ''}`}
                onClick={() => {
                  // Allow manual mouse movement by clicking
                  const mouse = mice.find(m => m.row === rowIndex && m.col === colIndex);
                  if (mouse) {
                    moveMouse(mouse.id);
                  }
                }}
              >
                {cell?.char || ''}
              </div>
            ))
          )}
        </div>

        <div className="controls">
          <div className="player-section">
            <h3>🐱 Cat Player</h3>
            <div className="score cat-score">Score: {catScore}</div>
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
              Press SPACE to spawn ({mice.length}/10)
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
              Active Mice: {mice.length}/10
              <br />
              Escape = +5 pts
              <br />
              Caught = -1 pt
            </div>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', gap: '20px', margin: '20px 0'}}>
        <button className="spawn-btn" onClick={resetGame} style={{backgroundColor: '#e74c3c'}}>
          Reset Game
        </button>
      </div>

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
          <li><strong>Cat Player:</strong> Use arrow keys or WASD to move the cat and catch mice</li>
          <li><strong>Mice Player:</strong> Press SPACE or click "Spawn Random Mouse" to add mice</li>
          <li><strong>Scoring:</strong> Cat gets points equal to mouse value when catching, Mice get 5 points when escaping</li>
          <li><strong>Movement:</strong> All pieces can move to any adjacent cell (including diagonally)</li>
          <li><strong>Auto-movement:</strong> Mice move automatically every 1.5 seconds</li>
          <li><strong>Click mice:</strong> Click on a mouse to make it move immediately</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
