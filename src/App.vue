<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300 py-4 px-2">
    <!-- Controls panel in top right corner -->
    <div class="controls-panel fixed top-4 right-4 bg-white/80 p-3 rounded-lg shadow-md z-10">
      <h3 class="font-medium mb-2">Controls:</h3>
      <div class="text-sm">
        <p>↑ Rotate</p>
        <p>← Move Left</p>
        <p>→ Move Right</p>
        <p>↓ Soft Drop</p>
        <p>Space Hard Drop</p>
      </div>
    </div>

    <div class="tetris-container">
      <h1 class="text-3xl font-bold text-center text-gray-800 mb-2">Tetris</h1>
      <div class="game-info">
        <div>
          <h2 class="text-xl font-semibold text-gray-700">Score: {{ score }}</h2>
          <h3 class="text-lg text-gray-600">Level: {{ level }}</h3>
        </div>
        <div>
          <h3 class="text-lg text-gray-600">Lines: {{ lines }}</h3>
        </div>
      </div>
      <div class="flex gap-4 items-start justify-center">
        <div ref="gameContainer" class="game-container"></div>
        <div class="flex flex-col">
          <div class="next-piece-container mb-4">
            <h3 class="text-lg font-medium text-gray-700 mb-2">Next:</h3>
            <div ref="nextPieceContainer" class="next-piece"></div>
          </div>
          <div class="controls">
            <button @click="startGame" v-if="!isPlaying"
              class="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-2 w-full">
              Start Game
            </button>
            <button @click="pauseGame" v-if="isPlaying && !isPaused"
              class="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-2 w-full">
              Pause
            </button>
            <button @click="resumeGame" v-if="isPlaying && isPaused"
              class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-2 w-full">
              Resume
            </button>
            <button @click="restartGame" v-if="isGameOver"
              class="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-2 w-full">
              Restart
            </button>
          </div>
        </div>
      </div>
      <div class="game-over" v-if="isGameOver">
        <h2 class="text-2xl font-bold mb-2">Game Over!</h2>
        <p class="text-xl mb-4">Your score: {{ score }}</p>
        <button @click="restartGame"
          class="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
          Play Again
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onBeforeUnmount, Ref } from 'vue'
import * as PIXI from 'pixi.js'
import { TetrisGame } from './game/TetrisGame'
import { CustomPixiApp } from './game/TetrisGame'

export default {
  name: 'App',
  setup() {
    const gameContainer = ref<HTMLDivElement | null>(null)
    const nextPieceContainer = ref<HTMLDivElement | null>(null)
    const score = ref(0)
    const level = ref(1)
    const lines = ref(0)
    const isPlaying: Ref<boolean> = ref(false)
    const isPaused: Ref<boolean> = ref(false)
    const isGameOver: Ref<boolean> = ref(false)

    let game: TetrisGame | null = null
    let app: CustomPixiApp | null = null
    let nextPieceApp: CustomPixiApp | null = null

    const startGame = () => {
      if (game) {
        game.destroy()
      }

      isPlaying.value = true
      isPaused.value = false
      isGameOver.value = false
      score.value = 0
      level.value = 1
      lines.value = 0

      initGame(true)
    }

    const pauseGame = () => {
      if (game) {
        game.pause()
        isPaused.value = true
      }
    }

    const resumeGame = () => {
      if (game) {
        game.resume()
        isPaused.value = false
      }
    }

    const restartGame = () => {
      startGame()
    }

    const initGame = async (shouldStartGame = true) => {
      if (!gameContainer.value || !nextPieceContainer.value) return

      // Calculate canvas size, maintaining 9:16 ratio and as large as possible
      const calculateGameSize = () => {
        // Constants for game grid
        const ROWS = 20;
        const COLS = 10;

        // Get available height (75% of window height)
        const availableHeight = window.innerHeight * 0.75;
        const availableWidth = window.innerWidth * 0.8;

        // Calculate the largest possible block size that fits within the available space
        // while maintaining the correct aspect ratio
        const maxBlockSizeByHeight = Math.floor(availableHeight / ROWS);
        const maxBlockSizeByWidth = Math.floor(availableWidth / COLS);

        // Choose the smaller of the two to ensure it fits both constraints
        const blockSize = Math.min(maxBlockSizeByHeight, maxBlockSizeByWidth);

        // Calculate exact game dimensions based on the block size
        const gameWidth = blockSize * COLS;
        const gameHeight = blockSize * ROWS;

        return {
          width: gameWidth,
          height: gameHeight,
          blockSize: blockSize
        }
      }

      const gameSize = calculateGameSize()
      const blockSize = gameSize.blockSize // Use the calculated block size directly

      try {
        // Initialize PIXI renderers
        const mainRenderer = await PIXI.autoDetectRenderer({
          width: gameSize.width,
          height: gameSize.height,
          backgroundColor: 0xf0f0f0,
          antialias: true
        });

        // Create the application-like object
        const mainApp: CustomPixiApp = {
          renderer: mainRenderer,
          stage: new PIXI.Container(),
          view: mainRenderer.canvas,
          ticker: new PIXI.Ticker(),
          destroy: (removeView = false) => {
            mainApp.ticker.stop();
            mainApp.ticker.destroy();
            mainApp.stage.destroy();
            if (removeView && mainApp.view.parentNode) {
              mainApp.view.parentNode.removeChild(mainApp.view);
            }
            mainRenderer.destroy();
          }
        };

        // Start the ticker
        mainApp.ticker.start();
        app = mainApp;

        // Initialize PIXI Application for next piece display
        const previewSize = blockSize * 5 // Preview window size is 5 blocks
        const previewRenderer = await PIXI.autoDetectRenderer({
          width: previewSize,
          height: previewSize,
          backgroundColor: 0xffffff,
          antialias: true
        });

        // Create the preview application-like object
        const previewApp: CustomPixiApp = {
          renderer: previewRenderer,
          stage: new PIXI.Container(),
          view: previewRenderer.canvas,
          ticker: new PIXI.Ticker(),
          destroy: (removeView = false) => {
            previewApp.ticker.stop();
            previewApp.ticker.destroy();
            previewApp.stage.destroy();
            if (removeView && previewApp.view.parentNode) {
              previewApp.view.parentNode.removeChild(previewApp.view);
            }
            previewRenderer.destroy();
          }
        };

        // Start the ticker
        previewApp.ticker.start();
        nextPieceApp = previewApp;

        console.log("PIXI Apps created:", app, nextPieceApp)

        // Add canvas to DOM
        gameContainer.value.innerHTML = ''
        // Directly use the canvas element
        if (mainRenderer.canvas) {
          gameContainer.value.appendChild(mainRenderer.canvas)
          mainRenderer.canvas.classList.add('game-canvas')
        } else {
          throw new Error("Could not access main renderer canvas")
        }

        nextPieceContainer.value.innerHTML = ''
        if (previewRenderer.canvas) {
          nextPieceContainer.value.appendChild(previewRenderer.canvas)
          previewRenderer.canvas.classList.add('game-canvas')
        } else {
          throw new Error("Could not access preview renderer canvas")
        }

        // Setup render loop
        mainApp.ticker.add(() => {
          mainApp.renderer.render(mainApp.stage);
        });

        previewApp.ticker.add(() => {
          previewApp.renderer.render(previewApp.stage);
        });

        // Pass block size to game instance
        game = new TetrisGame(mainApp, previewApp, {
          onScoreChange: (newScore: number) => {
            score.value = newScore
          },
          onLevelChange: (newLevel: number) => {
            level.value = newLevel
          },
          onLinesChange: (newLines: number) => {
            lines.value = newLines
          },
          onGameOver: () => {
            isGameOver.value = true
            isPlaying.value = false
          }
        }, blockSize)

        // Only start the game if shouldStartGame is true
        if (shouldStartGame) {
          isPlaying.value = true
          isPaused.value = false
          game.start()
        } else {
          isPlaying.value = false
          isPaused.value = false
          // Initialize the display but don't start the game
          game.reset()
        }
      } catch (error) {
        console.error("Error initializing game:", error)
      }
    }

    // Handle keyboard controls
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!game || !isPlaying.value || isPaused.value || isGameOver.value) return

      switch (event.key) {
        case 'ArrowLeft':
          game.moveLeft()
          break
        case 'ArrowRight':
          game.moveRight()
          break
        case 'ArrowDown':
          game.moveDown()
          break
        case 'ArrowUp':
          game.rotate()
          break
        case ' ':
          game.hardDrop()
          break
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown)
      // Just initialize the game display but don't start it
      initGame(false)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeyDown)
      if (game) {
        game.destroy()
      }
      if (app) {
        app.destroy(true)
      }
      if (nextPieceApp) {
        nextPieceApp.destroy(true)
      }
    })

    return {
      gameContainer,
      nextPieceContainer,
      score,
      level,
      lines,
      isPlaying,
      isPaused,
      isGameOver,
      startGame,
      pauseGame,
      resumeGame,
      restartGame
    }
  }
}
</script>

<style scoped>
.game-container,
.next-piece {
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
}

.controls-panel {
  backdrop-filter: blur(4px);
  font-size: 0.85rem;
}
</style>