// Tetromino types
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type BlockMatrix = number[][];

// Tetromino shapes
const SHAPES: Record<TetrominoType, BlockMatrix> = {
  'I': [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  'J': [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  'L': [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  'O': [
    [1, 1],
    [1, 1]
  ],
  'S': [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  'T': [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  'Z': [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ]
}

export class Tetromino {
  type: TetrominoType;
  blocks: BlockMatrix;
  color: number;
  x: number;
  y: number;

  constructor(type: TetrominoType, color: number) {
    this.type = type;
    this.blocks = JSON.parse(JSON.stringify(SHAPES[type])); // Deep copy of shape
    this.color = color;
    this.x = 0;
    this.y = 0;
  }
} 