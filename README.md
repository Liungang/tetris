# Tetris Game

A web-based Tetris game built with Vue 3 and PixiJS.

## Play Online

You can play the game online at:

- [GitHub Pages Demo](https://liungang.github.io/tetris/)

## Features

- Classic Tetris gameplay
- Increasing difficulty as levels progress
- Score tracking
- Next piece preview
- Ghost piece to assist with placement
- Pause and resume functionality

## Controls

- **Arrow Left**: Move piece left
- **Arrow Right**: Move piece right
- **Arrow Down**: Move piece down (soft drop)
- **Arrow Up**: Rotate piece
- **Spacebar**: Hard drop

## Development

### Setup

```
npm install
```

### Run Development Server

```
npm run dev
```

### Build for Production

```
npm run build
```

### Preview Production Build

```
npm run preview
```

## Deployment

The game is automatically deployed to GitHub Pages when changes are pushed to the main branch.

### Deploy Your Own Copy

1. Fork this repository
2. Enable GitHub Pages in repository settings (Settings > Pages)
3. The GitHub Action workflow will automatically build and deploy the game

You can also deploy to:

- **Netlify**: Connect your repo, set build command to `npm run build` and publish directory to `dist`
- **Vercel**: Import your repo and Vercel will automatically detect the correct settings
- **Render**: Create a new Static Site, connect your repo, set build command to `npm run build` and publish directory to `dist`

## Technologies Used

- Vue 3 - JavaScript framework
- PixiJS - 2D rendering library
- Vite - Build tool 