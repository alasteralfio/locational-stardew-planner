// Simple in-memory sprite cache
const spriteCache = new Map();

// loads and caches imgs
export async function loadSprite(src) {
    if (spriteCache.has(src)) {
        const cached = spriteCache.get(src);
        if (cached.complete) {
            return Promise.resolve(cached.cloneNode());
        }
        spriteCache.delete(src);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            spriteCache.set(src, img);
            resolve(img.cloneNode());
        };
        img.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
        img.src = src;
    });
}

// Loads objects.json data

let objectsData = null;
export async function loadObjects() {
    if (objectsData) return objectsData;
    
    // Load all object category files
    const [buildings, crops, decor, machines, wallpaper] = await Promise.all([
        fetch('./data/objects/buildings.json').then(r => r.json()).catch(() => ({})),
        fetch('./data/objects/crops.json').then(r => r.json()).catch(() => ({})),
        fetch('./data/objects/decor.json').then(r => r.json()).catch(() => ({})),
        fetch('./data/objects/machines.json').then(r => r.json()).catch(() => ({})),
        fetch('./data/objects/wallpaper.json').then(r => r.json()).catch(() => ({}))
    ]);
    
    // Merge into single object for easy lookup
    objectsData = {
        ...buildings,
        ...crops,
        ...decor,
        ...machines,
        ...wallpaper
    };
    
    // Normalize sprite property - convert arrays to single strings (use first sprite for now)
    for (const [key, obj] of Object.entries(objectsData)) {
        if (Array.isArray(obj.sprite)) {
            // For now, use the first sprite (spring/normal)
            objectsData[key].sprite = obj.sprite[0];
        }
    }
    
    console.log('Objects data loaded:', Object.keys(objectsData).length, 'objects');
    return objectsData;
}

//Gets object definition by key
export async function fetchObjectDefinition(objectKey) {
    const data = await loadObjects();
    const def = data[objectKey];
    if (!def) {
        console.warn(`Object definition not found: ${objectKey}`);
        return null;
    }
    return def;
}