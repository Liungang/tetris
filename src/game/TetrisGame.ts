import * as PIXI from 'pixi.js';
import {
  Tetromino,
  TetrominoType,
  BlockMatrix,
  PIECE_COLORS,
} from './Tetromino';

// Game constants
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30; // default block size

// Type definitions
interface GameCallbacks {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onLinesChange: (lines: number) => void;
  onGameOver: () => void;
}

interface GhostPiece {
  blocks: BlockMatrix;
  x: number;
  y: number;
  color: number;
}

// Custom application interface to match our PIXI renderer setup
export interface CustomPixiApp {
  renderer: PIXI.Renderer; // Use any for now to avoid type issues with PIXI.js v8
  stage: PIXI.Container;
  view: HTMLCanvasElement;
  ticker: PIXI.Ticker;
  destroy: (removeView?: boolean) => void;
}

export class TetrisGame {
  app: CustomPixiApp;
  nextPieceApp: CustomPixiApp;
  callbacks: GameCallbacks;
  board: number[][];
  score: number;
  level: number;
  lines: number;
  isRunning: boolean;
  isPaused: boolean;
  gameOver: boolean;
  boardContainer: PIXI.Container;
  ghostContainer: PIXI.Container;
  activeContainer: PIXI.Container;
  nextPieceContainer: PIXI.Container;
  currentPiece: Tetromino | null;
  nextPiece: Tetromino | null;
  ghostPiece: GhostPiece | null;
  dropInterval: number;
  dropCounter: number;
  lastTime: number;
  blockSize: number;

  constructor(
    app: CustomPixiApp,
    nextPieceApp: CustomPixiApp,
    callbacks: GameCallbacks,
    blockSize?: number
  ) {
    this.app = app;
    this.nextPieceApp = nextPieceApp;
    this.callbacks = callbacks;
    this.blockSize = blockSize || BLOCK_SIZE; // use provided block size or default value

    // Create game board
    this.board = Array(ROWS)
      .fill(0)
      .map(() => Array(COLS).fill(0));

    // Game state
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isRunning = false;
    this.isPaused = true;
    this.gameOver = false;

    // Graphics containers
    this.boardContainer = new PIXI.Container();
    this.ghostContainer = new PIXI.Container();
    this.activeContainer = new PIXI.Container();
    this.nextPieceContainer = new PIXI.Container();

    this.app.stage.addChild(this.boardContainer);
    this.app.stage.addChild(this.ghostContainer);
    this.app.stage.addChild(this.activeContainer);
    this.nextPieceApp.stage.addChild(this.nextPieceContainer);

    // Create grid lines
    this.createGrid();

    // Current and next piece
    this.currentPiece = null;
    this.nextPiece = null;

    // Ghost piece (piece shadow)
    this.ghostPiece = null;

    // Drop speed (milliseconds)
    this.dropInterval = 1000;
    this.dropCounter = 0;
    this.lastTime = 0;
  }

  createGrid(): void {
    const grid = new PIXI.Graphics();

    // Draw horizontal lines
    for (let row = 0; row <= ROWS; row++) {
      grid.stroke({ width: 1, color: 0xcccccc, alpha: 0.5 });
      grid.moveTo(0, row * this.blockSize);
      grid.lineTo(COLS * this.blockSize, row * this.blockSize);
    }

    // Draw vertical lines
    for (let col = 0; col <= COLS; col++) {
      grid.stroke({ width: 1, color: 0xcccccc, alpha: 0.5 });
      grid.moveTo(col * this.blockSize, 0);
      grid.lineTo(col * this.blockSize, ROWS * this.blockSize);
    }

    // Get renderer dimensions and center the grid
    const rendererWidth = this.app.renderer.width || 0;
    const rendererHeight = this.app.renderer.height || 0;

    grid.x = (rendererWidth - COLS * this.blockSize) / 2;
    grid.y = (rendererHeight - ROWS * this.blockSize) / 2;

    this.app.stage.addChild(grid);

    // Also apply the same positioning to all game containers
    this.boardContainer.x = grid.x;
    this.boardContainer.y = grid.y;
    this.activeContainer.x = grid.x;
    this.activeContainer.y = grid.y;
    this.ghostContainer.x = grid.x;
    this.ghostContainer.y = grid.y;
  }

  start(): void {
    if (this.isRunning) return;

    this.reset();
    this.generatePiece();
    this.isRunning = true;
    this.gameLoop(0);
  }

  reset(): void {
    // Clear board
    this.board = Array(ROWS)
      .fill(0)
      .map(() => Array(COLS).fill(0));

    // Reset state
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.gameOver = false;

    // Clear graphics
    this.boardContainer.removeChildren();
    this.activeContainer.removeChildren();
    this.ghostContainer.removeChildren();
    this.nextPieceContainer.removeChildren();

    // Update UI
    this.updateScore();
    this.updateLevel();
    this.updateLines();
  }

  generatePiece(): void {
    // Generate the next piece if there is none
    if (!this.nextPiece) {
      const type = this.getRandomPieceType();
      const color = PIECE_COLORS[type];
      this.nextPiece = new Tetromino(type, color);
    }

    // Set current piece
    this.currentPiece = this.nextPiece;

    // Generate new next piece
    const nextType = this.getRandomPieceType();
    const nextColor = PIECE_COLORS[nextType];
    this.nextPiece = new Tetromino(nextType, nextColor);

    // Position the current piece at the top center
    if (this.currentPiece) {
      this.currentPiece.x =
        Math.floor(COLS / 2) -
        Math.floor(this.currentPiece.blocks[0].length / 2);
      this.currentPiece.y = 0;
    }

    // Draw pieces
    this.drawPiece();
    this.drawNextPiece();

    // Check for collision immediately after spawning
    if (this.checkCollision()) {
      this.gameOver = true;
      this.isRunning = false;
      this.callbacks.onGameOver();
    }

    // Create ghost piece
    this.updateGhostPiece();
  }

  getRandomPieceType(): TetrominoType {
    const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    return types[Math.floor(Math.random() * types.length)];
  }

  // Common method to draw a single block
  drawBlock(
    container: PIXI.Container,
    color: number,
    x: number,
    y: number,
    alpha: number = 1
  ): PIXI.Graphics {
    // Create a new graphics object
    const block = new PIXI.Graphics();
    
    // Draw block shape
    block.rect(0, 0, this.blockSize, this.blockSize);
    
    // Add border
    block.stroke({ width: 2, color: 0x000000, alpha });
    
    // Fill with color
    block.fill({ color: color, alpha });
    
    // Set position
    block.x = x;
    block.y = y;
    
    // Add to container
    container.addChild(block);
    
    return block;
  }

  drawPiece(): void {
    // Clear previous active piece
    this.activeContainer.removeChildren();
    
    // Draw the current piece
    if (this.currentPiece) {
      for (let row = 0; row < this.currentPiece.blocks.length; row++) {
        for (let col = 0; col < this.currentPiece.blocks[row].length; col++) {
          if (this.currentPiece.blocks[row][col]) {
            // Calculate position
            const x = (this.currentPiece.x + col) * this.blockSize;
            const y = (this.currentPiece.y + row) * this.blockSize;
            
            // Use common method to draw the block
            this.drawBlock(
              this.activeContainer,
              this.currentPiece.color,
              x,
              y
            );
          }
        }
      }
    }
  }

  drawNextPiece(): void {
    // Clear previous next piece
    this.nextPieceContainer.removeChildren();
    
    if (this.nextPiece) {
      // Get renderer dimensions
      const rendererWidth = this.nextPieceApp.renderer.width;
      const rendererHeight = this.nextPieceApp.renderer.height;
      
      // Center the next piece in the preview area
      const offsetX =
        (rendererWidth - this.nextPiece.blocks[0].length * this.blockSize) / 2;
      const offsetY =
        (rendererHeight - this.nextPiece.blocks.length * this.blockSize) / 2;
      
      for (let row = 0; row < this.nextPiece.blocks.length; row++) {
        for (let col = 0; col < this.nextPiece.blocks[row].length; col++) {
          if (this.nextPiece.blocks[row][col]) {
            // Calculate position
            const x = offsetX + col * this.blockSize;
            const y = offsetY + row * this.blockSize;
            
            // Use common method to draw the block
            this.drawBlock(
              this.nextPieceContainer,
              this.nextPiece.color,
              x,
              y
            );
          }
        }
      }
    }
  }

  updateGhostPiece(): void {
    // Clear previous ghost piece
    this.ghostContainer.removeChildren();
    
    if (this.currentPiece) {
      // Create a deep copy of the current piece
      this.ghostPiece = {
        blocks: JSON.parse(JSON.stringify(this.currentPiece.blocks)),
        x: this.currentPiece.x,
        y: this.currentPiece.y,
        color: this.currentPiece.color,
      };
      
      // Drop the ghost piece as far as it can go
      while (
        !this.checkCollision(
          this.ghostPiece.blocks,
          this.ghostPiece.x,
          this.ghostPiece.y + 1
        )
      ) {
        this.ghostPiece.y++;
      }
      
      // Only draw ghost piece if it's in a different position
      if (this.ghostPiece.y !== this.currentPiece.y) {
        for (let row = 0; row < this.ghostPiece.blocks.length; row++) {
          for (let col = 0; col < this.ghostPiece.blocks[row].length; col++) {
            if (this.ghostPiece.blocks[row][col]) {
              // Calculate position
              const x = (this.ghostPiece.x + col) * this.blockSize;
              const y = (this.ghostPiece.y + row) * this.blockSize;
              
              // Use common method to draw the block with transparency
              this.drawBlock(
                this.ghostContainer,
                this.ghostPiece.color,
                x,
                y,
                0.3
              );
            }
          }
        }
      }
    }
  }

  drawBoard(): void {
    // Clear the board container
    this.boardContainer.removeChildren();
    
    // Draw the board background
    const boardGraphics = new PIXI.Graphics();
    boardGraphics.fill({ color: 0x000000, alpha: 0.5 });
    boardGraphics.rect(0, 0, COLS * this.blockSize, ROWS * this.blockSize);
    this.boardContainer.addChild(boardGraphics);
    
    // Draw filled blocks
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.board[row][col] !== 0) {
          const blockColor = this.board[row][col];
          
          // Calculate position
          const x = col * this.blockSize;
          const y = row * this.blockSize;
          
          // Use common method to draw the block
          this.drawBlock(
            this.boardContainer,
            blockColor,
            x,
            y
          );
        }
      }
    }
  }

  checkCollision(
    blocks: BlockMatrix = this.currentPiece?.blocks || [],
    x: number = this.currentPiece?.x || 0,
    y: number = this.currentPiece?.y || 0
  ): boolean {
    for (let row = 0; row < blocks.length; row++) {
      for (let col = 0; col < blocks[row].length; col++) {
        if (blocks[row][col]) {
          const boardRow = y + row;
          const boardCol = x + col;

          // Check if out of bounds
          if (
            boardCol < 0 ||
            boardCol >= COLS ||
            boardRow >= ROWS ||
            // Check collision with static blocks
            (boardRow >= 0 && this.board[boardRow][boardCol])
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  moveLeft(): void {
    if (!this.isRunning || this.isPaused || this.gameOver || !this.currentPiece)
      return;

    const newX = this.currentPiece.x - 1;
    if (
      !this.checkCollision(this.currentPiece.blocks, newX, this.currentPiece.y)
    ) {
      this.currentPiece.x = newX;
      this.updateGhostPiece();
      this.drawPiece();
    }
  }

  moveRight(): void {
    if (!this.isRunning || this.isPaused || this.gameOver || !this.currentPiece)
      return;

    const newX = this.currentPiece.x + 1;
    if (
      !this.checkCollision(this.currentPiece.blocks, newX, this.currentPiece.y)
    ) {
      this.currentPiece.x = newX;
      this.updateGhostPiece();
      this.drawPiece();
    }
  }

  moveDown(): boolean {
    if (!this.isRunning || this.isPaused || this.gameOver || !this.currentPiece)
      return false;

    const newY = this.currentPiece.y + 1;
    if (
      !this.checkCollision(this.currentPiece.blocks, this.currentPiece.x, newY)
    ) {
      this.currentPiece.y = newY;
      this.drawPiece();
      return true;
    } else {
      this.lockPiece();
      return false;
    }
  }

  hardDrop(): void {
    if (!this.isRunning || this.isPaused || this.gameOver) return;

    while (this.moveDown()) {
      // Move down until collision
    }
  }

  rotate(): void {
    if (!this.isRunning || this.isPaused || this.gameOver || !this.currentPiece)
      return;

    const rotatedBlocks = this.rotateMatrix(this.currentPiece.blocks);

    // Try rotation with wall kicks
    const wallKickOffsets = [
      { x: 0, y: 0 }, // No offset
      { x: 1, y: 0 }, // Right
      { x: -1, y: 0 }, // Left
      { x: 0, y: -1 }, // Up
      { x: 2, y: 0 }, // 2 blocks right
      { x: -2, y: 0 }, // 2 blocks left
    ];

    for (const offset of wallKickOffsets) {
      const testX = this.currentPiece.x + offset.x;
      const testY = this.currentPiece.y + offset.y;

      if (!this.checkCollision(rotatedBlocks, testX, testY)) {
        this.currentPiece.blocks = rotatedBlocks;
        this.currentPiece.x = testX;
        this.currentPiece.y = testY;
        this.updateGhostPiece();
        this.drawPiece();
        break;
      }
    }
  }

  rotateMatrix(matrix: BlockMatrix): BlockMatrix {
    const N = matrix.length;
    const result: BlockMatrix = Array(N)
      .fill(0)
      .map(() => Array(N).fill(0));

    // Transpose matrix
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        result[col][N - 1 - row] = matrix[row][col];
      }
    }

    return result;
  }

  lockPiece(): void {
    if (!this.currentPiece) return;

    // Add the current piece to the board
    for (let row = 0; row < this.currentPiece.blocks.length; row++) {
      for (let col = 0; col < this.currentPiece.blocks[row].length; col++) {
        if (this.currentPiece.blocks[row][col]) {
          const boardRow = this.currentPiece.y + row;
          const boardCol = this.currentPiece.x + col;

          // Only add blocks within bounds
          if (
            boardRow >= 0 &&
            boardRow < ROWS &&
            boardCol >= 0 &&
            boardCol < COLS
          ) {
            // Store the color value directly in the board
            this.board[boardRow][boardCol] = this.currentPiece.color;
          }
        }
      }
    }

    // Check for line clears
    this.checkLines();

    // Update the board display
    this.drawBoard();

    // Generate a new piece
    this.generatePiece();
  }

  checkLines(): void {
    let linesCleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
      // Check if the row is full
      if (this.board[row].every((cell) => cell !== 0)) {
        // Remove the row
        this.board.splice(row, 1);

        // Add an empty row at the top
        this.board.unshift(Array(COLS).fill(0));

        linesCleared++;

        // Check the same row again (because we've shifted everything down)
        row++;
      }
    }

    if (linesCleared > 0) {
      // Update score
      this.updateScore(linesCleared);

      // Update lines
      this.lines += linesCleared;
      this.updateLines();

      // Check for level up
      if (this.lines >= this.level * 10) {
        this.level++;
        this.updateLevel();

        // Increase speed
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
      }
    }
  }

  updateScore(linesCleared: number = 0): void {
    // Scoring system:
    // 1 line = 100 * level
    // 2 lines = 300 * level
    // 3 lines = 500 * level
    // 4 lines = 800 * level (Tetris)
    const points = [0, 100, 300, 500, 800];
    this.score += points[linesCleared] * this.level;
    this.callbacks.onScoreChange(this.score);
  }

  updateLevel(): void {
    this.callbacks.onLevelChange(this.level);
  }

  updateLines(): void {
    this.callbacks.onLinesChange(this.lines);
  }

  pause(): void {
    if (this.isRunning && !this.gameOver) {
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isRunning && !this.gameOver) {
      this.isPaused = false;
      this.lastTime = 0;
    }
  }

  gameLoop(timestamp: number): void {
    if (!this.lastTime) this.lastTime = timestamp;
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (this.isRunning && !this.isPaused && !this.gameOver) {
      this.dropCounter += deltaTime;

      if (this.dropCounter > this.dropInterval) {
        this.moveDown();
        this.dropCounter = 0;
      }
    }

    // Continue game loop
    if (this.isRunning) {
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  destroy(): void {
    this.isRunning = false;

    // Clean up graphics
    this.boardContainer.removeChildren();
    this.activeContainer.removeChildren();
    this.ghostContainer.removeChildren();
    this.nextPieceContainer.removeChildren();
  }
}
