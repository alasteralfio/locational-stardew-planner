// src/core/placementLogic.js
import { fetchObjectDefinition } from './assetLoader.js';
import { getCurrentLocation } from './locationManager.js';

function isInBlockedArea(gridX, gridY, footprintWidth, footprintHeight, blockedAreas) {
    if (!blockedAreas || blockedAreas.length === 0) return false;

    for (let x = 0; x < footprintWidth; x++) {
        for (let y = 0; y < footprintHeight; y++) {
            const tileX = gridX + x;
            const tileY = gridY + y;

            for (const blocked of blockedAreas) {
                if (tileX >= blocked.x && 
                    tileX < blocked.x + blocked.width &&
                    tileY >= blocked.y && 
                    tileY < blocked.y + blocked.height) {
                    return true;
                }
            }
        }
    }
    return false;
}

async function collidesWithExistingObjects(gridX, gridY, footprintWidth, footprintHeight, existingPlacements, layer, excludeId = null) {
    if (!existingPlacements) return false;

    for (const existing of existingPlacements) {
        if (existing.layer !== layer || existing.id === excludeId) continue;

        const existingDef = await fetchObjectDefinition(existing.objectKey);
        const existingWidth = existingDef ? (existingDef.footprintWidth || 1) : 1;
        const existingHeight = existingDef ? (existingDef.footprintHeight || 1) : 1;

        for (let x = 0; x < footprintWidth; x++) {
            for (let y = 0; y < footprintHeight; y++) {
                const checkX = gridX + x;
                const checkY = gridY + y;

                if (checkX >= existing.gridX && 
                    checkX < existing.gridX + existingWidth &&
                    checkY >= existing.gridY && 
                    checkY < existing.gridY + existingHeight) {
                    return true;
                }
            }
        }
    }
    return false;
}

function checkPlacementRules(objectDef, location) {
    if (!objectDef || !location) return { valid: false, reason: 'Missing object or location data' };

    if (location.indoors === true && objectDef.placeableIndoors === false) {
        return { valid: false, reason: 'Object cannot be placed indoors' };
    }

    return { valid: true };
}

async function isValidPlacement(appState, objectKey, gridX, gridY, layer, excludeId = null) {
    const currentLocation = appState.modifiedLocations.find(
        loc => loc.locationKey === appState.currentView.locationKey
    );

    if (!currentLocation) {
        return { valid: false, reason: 'No current location' };
    }

    const location = getCurrentLocation();
    if (!location) {
        return { valid: false, reason: 'Location data not loaded' };
    }

    const objectDef = await fetchObjectDefinition(objectKey);
    if (!objectDef) {
        return { valid: false, reason: 'Object definition not found' };
    }

    // Prevent wallpaper and flooring from being placed as regular objects
    if (objectDef.category === 'wallpaper') {
        return { valid: false, reason: 'Wallpaper placement coming soon' };
    }

    const footprintWidth = objectDef.footprintWidth || 1;
    const footprintHeight = objectDef.footprintHeight || 1;

    if (isInBlockedArea(gridX, gridY, footprintWidth, footprintHeight, location.blockedAreas)) {
        return { valid: false, reason: 'Placement blocked by terrain' };
    }

    const collision = await collidesWithExistingObjects(gridX, gridY, footprintWidth, footprintHeight, currentLocation.directPlacements, layer, excludeId);
    if (collision) {
        return { valid: false, reason: 'Placement overlaps existing object' };
    }

    const rulesCheck = checkPlacementRules(objectDef, location);
    if (!rulesCheck.valid) {
        return rulesCheck;
    }

    return { valid: true };
}

// Places a new object at the specified grid coordinates
export async function placeObjectAtGrid(appState, objectKey, gridX, gridY, layer) {
    const validation = await isValidPlacement(appState, objectKey, gridX, gridY, layer);
    
    if (!validation.valid) {
        console.log('Placement invalid:', validation.reason);
        return false;
    }

    const currentLocation = appState.modifiedLocations.find(
        loc => loc.locationKey === appState.currentView.locationKey
    );

    const newPlacement = {
        id: appState.generatePlacementId(),
        objectKey: objectKey,
        gridX: gridX,
        gridY: gridY,
        layer: layer
    };

    currentLocation.directPlacements.push(newPlacement);
    window.dispatchEvent(new CustomEvent('placementsUpdated'));
    console.log('Placed object:', objectKey, 'at', gridX, gridY);
    return true;
}

// Removes an object at the specified grid coordinates
export function removeObjectAtGrid(appState, gridX, gridY, layer) {
    const currentLocation = appState.modifiedLocations.find(
        loc => loc.locationKey === appState.currentView.locationKey
    );

    if (!currentLocation) return false;

    const index = currentLocation.directPlacements.findIndex(p =>
        p.gridX === gridX && p.gridY === gridY && p.layer === layer
    );

    if (index === -1) return false;

    currentLocation.directPlacements.splice(index, 1);

    // Trigger re-render
    window.dispatchEvent(new CustomEvent('placementsUpdated'));

    console.log('Removed object at', gridX, gridY);
    return true;
}

export { isInBlockedArea, collidesWithExistingObjects, checkPlacementRules, isValidPlacement };