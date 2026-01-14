# Three.js 3D Editor

A professional-grade 3D editor built with Three.js, featuring a clean modular architecture and optimized performance.

## Features

- **Object Manipulation**: Add, move (Z), rotate (R), and scale (S) cubes, cylinders, and triangles.
- **Scene Management**: Tree view for object organization, property panel for precise control.
- **Advanced Tools**: Undo/Redo (Ctrl+Z/Y), snapping, local/world space toggling, and camera switching (Perspective/Orthographic).
- **Import/Export**: Import custom JS functions or export your scene as a standalone HTML file.
- **Visual Aids**: ViewCube for navigation, grid helper, and shadows.

## Tech Stack

- **Three.js**: Core 3D engine.
- **Vite**: Modern frontend tooling for fast development.
- **Tailwind CSS**: Utility-first styling for the UI.
- **ES Modules**: Clean and maintainable code structure.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## Controls

- **Left Click**: Select object.
- **Shift + Click**: Multi-select.
- **Z / R / S**: Switch between Move, Rotate, and Scale modes.
- **Space / Local**: Toggle between Local and World space.
- **Delete / Backspace**: Remove selected objects.
- **Ctrl+Z / Ctrl+Y**: Undo/Redo.
- **Ctrl+D**: Duplicate selection.
- **Escape**: Deselect all.

## Architecture

The project has been refactored into modular ES components for better readability and maintainability:

- `src/main.js`: Application entry point.
- `src/editor/`: Core editor logic modules.
- `src/ui/`: UI components and panels.
- `src/styles/`: Global styles and Tailwind integration.
