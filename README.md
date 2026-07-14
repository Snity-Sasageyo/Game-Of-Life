# Game of Life

It is a cellular automation sandbox. Uses a sparse coordinate Map for state management and the canvas API for extending infinitely.

## Mechanics

* Infinite Canvas
* Heat Map: Cells change color based on how many generations they have survived(bleu for newborn, yellow for middle aged and orange for ancient)
* Motion Trails: Fading gray tails show where the cells died
* Population graph: A graph in your toolbar which shows graph of cells alive

## Controls

### Mouse
* Left Click: Pan
* Right Click/Shift+Drag: Erase Cells
* Scroll Wheel: Zoom in and out

### Keyboard

* Space: Play/Pause
* N or Right arrow: Move one generation ahead
* C: Clear board
* `R`: Random Seed
* `F`: Move camera to center
* `[` / `]`: Increase/Decrease brush size

<img width="800" height="372" alt="ezgif-41d11403839ba876" src="https://github.com/user-attachments/assets/caa6ede2-b990-44e3-afdc-d418f441bc55" />


The project follows an endless theme because the grid has no edges nor there is any win or loss state. You can pan millions of pixels in any direction and it won't crash. And there is no "Game Over" screen, no final score and no objectives to complete. 
