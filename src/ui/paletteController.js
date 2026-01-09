import { loadObjects } from '../core/assetLoader.js';

class PaletteController {
    constructor(appState) {
        this.appState = appState;
        this.currentCategory = null;
        this.allObjects = null;
        this.filteredObjects = [];
        
        this.init();
    }
    
    async init() {
        // Load all objects
        this.allObjects = await loadObjects();
        console.log('Palette controller initialized with', Object.keys(this.allObjects).length, 'objects');
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Category selection
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.selectCategory(category);
            });
        });
        
        // Close palette
        document.getElementById('close-palette-btn').addEventListener('click', () => {
            this.hidePalette();
        });
        
        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterObjects(e.target.value);
        });
    }
    
    selectCategory(category) {
        this.currentCategory = category;
        this.showPalette();
        this.loadCategoryObjects(category);
    }
    
    showPalette() {
        document.getElementById('palette-container').style.width = '300px';
        document.getElementById('palette-panel').style.display = 'block';
    }
    
    hidePalette() {
        document.getElementById('palette-container').style.width = '60px';
        document.getElementById('palette-panel').style.display = 'none';
        this.currentCategory = null;
    }
    
    loadCategoryObjects(category) {
        // Filter objects by category
        this.filteredObjects = Object.entries(this.allObjects)
            .filter(([key, obj]) => obj.category === category)
            .map(([key, obj]) => ({ ...obj, objectKey: key }));
        
        this.renderObjectsGrid();
    }
    
    filterObjects(searchTerm) {
        if (!searchTerm) {
            // If no search term, show current category
            this.loadCategoryObjects(this.currentCategory);
            return;
        }
        
        this.filteredObjects = Object.entries(this.allObjects)
            .filter(([key, obj]) => {
                const matchesCategory = obj.category === this.currentCategory;
                const matchesSearch = obj.name.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
            })
            .map(([key, obj]) => ({ ...obj, objectKey: key }));
        
        this.renderObjectsGrid();
    }
    
    renderObjectsGrid() {
        const grid = document.getElementById('objects-grid');
        grid.innerHTML = '';
        
        this.filteredObjects.forEach(obj => {
            const objElement = this.createObjectElement(obj);
            grid.appendChild(objElement);
        });
    }
    
    createObjectElement(obj) {
        const element = document.createElement('div');
        element.className = 'object-item';
        element.dataset.objectKey = obj.objectKey;
        element.title = obj.name;
        element.innerHTML = `
            <div style="width: 48px; height: 48px; background: #555; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; cursor: pointer; border: 1px solid #666;">
                ${obj.name.charAt(0)}
            </div>
            <div style="font-size: 10px; margin-top: 2px; text-align: center; max-width: 48px; overflow: hidden; text-overflow: ellipsis;">
                ${obj.name}
            </div>
        `;
        
        element.addEventListener('click', () => {
            this.selectObject(obj);
        });
        
        return element;
    }
    
    selectObject(obj) {
        this.appState.selectedItem = {
            objectKey: obj.objectKey,
            layer: obj.defaultLayer
        };
        
        // Update UI to show selection
        document.querySelectorAll('.object-item').forEach(el => {
            el.style.borderColor = '#666';
        });
        event.target.closest('.object-item').style.borderColor = '#00ff00';
        
        // Update status bar
        document.getElementById('selected-object').textContent = `Selected: ${obj.name}`;
        
        console.log('Selected object:', obj.objectKey);
    }
}

export { PaletteController };