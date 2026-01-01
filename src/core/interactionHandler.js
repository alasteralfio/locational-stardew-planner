// src/core/interactionHandler.js
import { TILE_SIZE } from './constants.js';
import { loadLocations, setCurrentLocation, getCurrentLocation } from './locationManager.js';

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
    return currentLocation.directPlacements.find(p => 
        p.gridX === gridX && p.gridY === gridY
    );
}

function handleMouseDown(event, canvas, appState) {
    // Safety: Cancel any previous drag operation
    if (isDragging) {
        console.log("Cancelling previous drag operation");
        isDragging = false;
        canvas.style.cursor = 'default';
        
        // Clear any ghost visuals from overlay
        const overlayCanvas = document.getElementById('layer-4');
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        // Redraw grid
        const currentLocation = getCurrentLocation();
        if (currentLocation) {
            overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            overlayCtx.lineWidth = 1;
            overlayCtx.beginPath();
            
            for (let x = 0; x <= currentLocation.pixelWidth; x += TILE_SIZE) {
                overlayCtx.moveTo(x + 0.5, 0);
                overlayCtx.lineTo(x + 0.5, currentLocation.pixelHeight);
            }
            for (let y = 0; y <= currentLocation.pixelHeight; y += TILE_SIZE) {
                overlayCtx.moveTo(0, y + 0.5);
                overlayCtx.lineTo(currentLocation.pixelWidth, y + 0.5);
            }
            overlayCtx.stroke();
        }
    }
    
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
        
        // Calculate offset correctly - store the offset from click position to tile corner
        // This is the correct way: offset from the tile's top-left corner to where we clicked
        const tilePixelX = placement.gridX * TILE_SIZE;
        const tilePixelY = placement.gridY * TILE_SIZE;
        dragOffsetX = mouseX - tilePixelX;
        dragOffsetY = mouseY - tilePixelY;
        
        console.log(`Started dragging placement ${placement.id}, offset: [${dragOffsetX}, ${dragOffsetY}]`);
        canvas.style.cursor = 'grabbing';
    }
}

function handleMouseMove(event, canvas, appState) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate new grid position using the stored offset
    const newPixelX = mouseX - dragOffsetX;
    const newPixelY = mouseY - dragOffsetY;
    
    const newGridX = Math.floor(newPixelX / TILE_SIZE);
    const newGridY = Math.floor(newPixelY / TILE_SIZE);
    
    // Optional: Remove this log after testing
    // console.log(`Dragging to provisional grid: [${newGridX}, ${newGridY}]`);
    
    // Get overlay context for visual feedback
    const overlayCanvas = document.getElementById('layer-4');
    const overlayCtx = overlayCanvas.getContext('2d');
    
    // Clear previous ghost rectangle only (not the entire grid)
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Redraw the grid lines
    overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    overlayCtx.lineWidth = 1;
    overlayCtx.beginPath();

    const currentLocation = getCurrentLocation();
    if (currentLocation) {
        for (let x = 0; x <= currentLocation.pixelWidth; x += TILE_SIZE) {
            overlayCtx.moveTo(x + 0.5, 0);
            overlayCtx.lineTo(x + 0.5, currentLocation.pixelHeight);
        }
        for (let y = 0; y <= currentLocation.pixelHeight; y += TILE_SIZE) {
            overlayCtx.moveTo(0, y + 0.5);
            overlayCtx.lineTo(currentLocation.pixelWidth, y + 0.5);
        }
        overlayCtx.stroke();
    }
    
    // Calculate pixel position for the ghost
    const ghostPixelX = newGridX * TILE_SIZE;
    const ghostPixelY = newGridY * TILE_SIZE;
    
    // Determine if placement is valid (check for existing objects)
    const currentLocationData = appState.modifiedLocations.find(
        loc => loc.locationKey === appState.currentView.locationKey
    );
    
    const isOccupied = currentLocationData.directPlacements.some(p => 
        p.gridX === newGridX && p.gridY === newGridY && p.id !== currentPlacement.id
    );
    
    // Draw ghost rectangle
    overlayCtx.fillStyle = isOccupied ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)';
    overlayCtx.strokeStyle = isOccupied ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
    overlayCtx.lineWidth = 2;
    
    overlayCtx.fillRect(ghostPixelX, ghostPixelY, TILE_SIZE, TILE_SIZE);
    overlayCtx.strokeRect(ghostPixelX, ghostPixelY, TILE_SIZE, TILE_SIZE);
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

    // Clear the ghost rectangle from overlay layer
    const overlayCanvas = document.getElementById('layer-4');
    const overlayCtx = overlayCanvas.getContext('2d');
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Redraw the grid since we cleared everything
    const currentLocation = getCurrentLocation();
    if (currentLocation) {
        overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        overlayCtx.lineWidth = 1;
        overlayCtx.beginPath();

        for (let x = 0; x <= currentLocation.pixelWidth; x += TILE_SIZE) {
            overlayCtx.moveTo(x + 0.5, 0);
            overlayCtx.lineTo(x + 0.5, currentLocation.pixelHeight);
        }
        for (let y = 0; y <= currentLocation.pixelHeight; y += TILE_SIZE) {
            overlayCtx.moveTo(0, y + 0.5);
            overlayCtx.lineTo(currentLocation.pixelWidth, y + 0.5);
        }
        overlayCtx.stroke();
    }

    console.log("handleMouseUp - About to dispatch placementsUpdated event");

    // Notify the render engine to redraw properly
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