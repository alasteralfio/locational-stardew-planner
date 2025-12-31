// src/core/interactionHandler.js
import { TILE_SIZE } from './constants.js';

let isDragging = false;
let currentPlacement = null;
let dragOffsetX = 0; // Offset from mouse to placement origin
let dragOffsetY = 0;

// Gets grid coordinates from mouse pixel position.
function getGridCoordinates(pixelX, pixelY) {
    const gridX = Math.floor(pixelX / TILE_SIZE);
    const gridY = Math.floor(pixelY / TILE_SIZE);
    return { gridX, gridY };
}


// Finds a placement at specific grid coordinates.

function findPlacementAtGrid(gridX, gridY, appState) {
    const currentLocation = appState.modifiedLocations.find(
        loc => loc.locationKey === appState.currentView.locationKey
    );
    
    if (!currentLocation) return null;
    
    // Simple hit detection
    // For Phase 1 assume all objects are 1x1
    return currentLocation.directPlacements.find(p => 
        p.gridX === gridX && p.gridY === gridY
    );
}

function handleMouseDown(event, canvas, appState) {
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Convert to grid coordinates
    const { gridX, gridY } = getGridCoordinates(mouseX, mouseY);
    console.log(`Mouse down at grid: [${gridX}, ${gridY}]`);
    
    // Find placement at this grid cell
    const placement = findPlacementAtGrid(gridX, gridY, appState);
    
    if (placement) {
        // Start dragging
        isDragging = true;
        currentPlacement = placement;
        
        // Calculate offset (mouse position within the tile)
        dragOffsetX = mouseX - (placement.gridX * TILE_SIZE);
        dragOffsetY = mouseY - (placement.gridY * TILE_SIZE);
        
        console.log(`Started dragging placement ${placement.id}`);
        canvas.style.cursor = 'grabbing';
    }
}

function handleMouseMove(event, canvas, appState) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate new grid position
    const newGridX = Math.floor((mouseX - dragOffsetX) / TILE_SIZE);
    const newGridY = Math.floor((mouseY - dragOffsetY) / TILE_SIZE);
    
    console.log(`Dragging to provisional grid: [${newGridX}, ${newGridY}]`);
    
    // TODO: Visual feedback (ghost image) would go here
}

function handleMouseUp(event, appState) {
    if (!isDragging || !currentPlacement) return;
    
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate FINAL snapped grid position
    const finalGridX = Math.floor((mouseX - dragOffsetX) / TILE_SIZE);
    const finalGridY = Math.floor((mouseY - dragOffsetY) / TILE_SIZE);
    
    console.log(`Dropped at grid: [${finalGridX}, ${finalGridY}]`);
    
    // Update the placement in appState
    currentPlacement.gridX = finalGridX;
    currentPlacement.gridY = finalGridY;
    
    // Reset dragging state
    isDragging = false;
    canvas.style.cursor = 'default';
    
    // Notify the render engine to redraw
    window.dispatchEvent(new CustomEvent('placementsUpdated'));
    
    console.log(`Updated placement ${currentPlacement.id}`);
    currentPlacement = null;
}

export function initInteractions(pathsCanvas, appState) {
    if (!pathsCanvas) {
        console.error('DEBUG: pathsCanvas is null or undefined!');
        return;
    }
    
    pathsCanvas.addEventListener('mousedown', (event) => {
        handleMouseDown(event, pathsCanvas, appState);
    });
    
    // attach move/up to the WINDOW so dragging works even outside canvas
    window.addEventListener('mousemove', (event) => {
        handleMouseMove(event, pathsCanvas, appState);
    });
    
    window.addEventListener('mouseup', (event) => {
        handleMouseUp(event, appState);
    });
    
    console.log('Interaction handlers initialized for PATHS layer.');
}