import { TILE_SIZE } from "./constants.js";

let locationsData = null;
let currentLocation = null;

export async function loadLocations() {
    try {
        // Load the manifest to get list of available locations
        const manifestResponse = await fetch('data/locations-manifest.json');
        const locationKeys = await manifestResponse.json();
        
        // Load all location files in parallel
        const locationPromises = locationKeys.map(key =>
            fetch(`data/locations/${key}.json`)
                .then(r => {
                    if (!r.ok) throw new Error(`Failed to load location: ${key}`);
                    return r.json();
                })
        );
        
        const locationArrays = await Promise.all(locationPromises);
        
        // Combine into single object for backwards compatibility
        locationsData = {};
        locationKeys.forEach((key, index) => {
            locationsData[key] = locationArrays[index];
        });
        
        console.log('Locations data loaded:', Object.keys(locationsData));
        return locationsData;
    } catch (error) {
        console.error('Failed to load locations:', error);
        throw error;
    }
}

export function getLocation(key) {
    if (!locationsData) {
        throw new Error('Locations data not loaded. Call loadLocations() first.');
    }
    return locationsData[key];
}

export function getCurrentLocation() {
    return currentLocation;
}

export function setCurrentLocation(key) {
    const location = getLocation(key);
    if (location) {
        currentLocation = location;
        currentLocation.pixelWidth = location.gridWidth * TILE_SIZE;
        currentLocation.pixelHeight = location.gridHeight * TILE_SIZE;
        console.log(`Set location: ${key} (${currentLocation.pixelWidth}x${currentLocation.pixelHeight}px)`);
    }
    return currentLocation;
}

export function getAvailableLocations() {
    if (!locationsData) {
        throw new Error('Locations data not loaded. Call loadLocations() first.');
    }
    return Object.keys(locationsData).map(key => ({
        key: key,
        name: locationsData[key].name,
        gridWidth: locationsData[key].gridWidth,
        gridHeight: locationsData[key].gridHeight
    }));
}