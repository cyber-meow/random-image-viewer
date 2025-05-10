document.addEventListener('DOMContentLoaded', function() {
    // Use the configuration from config.js (gridConfig)
    const config = gridConfig;

    // Grid and viewport elements
    const viewport = document.getElementById('viewport');
    const grid = document.getElementById('infinite-grid');
    
    // Viewport dimensions
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    
    // Grid state
    let gridPosition = { x: 0, y: 0 };
    let gridVelocity = { 
        x: (Math.random() * 2 - 1) * config.moveSpeed, 
        y: (Math.random() * 2 - 1) * config.moveSpeed 
    };
    let visibleCells = new Map(); // Map of visible cell coordinates to DOM elements
    let imageUrls = [];
    let recentlyUsedImages = []; // Track recently used images to avoid repetition
    
    // Load images from text file
    loadImagesFromFile();

    // Set up modal functionality
    setupModal();

    // Update viewport dimensions on resize
    window.addEventListener('resize', function() {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        updateVisibleGrid();
    });

    // Function to load images from text file
    function loadImagesFromFile() {
        // Try to fetch the image URLs from the text file
        fetch(config.imageUrlsFile)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load image URLs file');
                }
                return response.text();
            })
            .then(data => {
                // Split the text file by lines and filter out empty lines
                imageUrls = data.split('\n')
                    .map(url => url.trim())
                    .filter(url => url.length > 0);
                
                // Shuffle the array for initial randomness
                imageUrls = shuffleArray(imageUrls);
                
                // Initialize the grid
                initializeGrid();
            })
            .catch(error => {
                console.error('Error:', error);
                console.log('Using fallback image URLs for local development');
                
                // Use fallback URLs when running locally
                imageUrls = config.fallbackUrls;
                initializeGrid();
            });
    }

    // Shuffle array using Fisher-Yates algorithm
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // Initialize the grid
    function initializeGrid() {
        // Set initial grid position
        gridPosition = { x: 0, y: 0 };
        updateGridPosition();
        
        // Create initial visible cells
        updateVisibleGrid();
        
        // Start the random walk animation
        startRandomWalk();
        
        // Start the animation loop
        requestAnimationFrame(animateGrid);
    }

    // Start the random walk animation
    function startRandomWalk() {
        // Change direction randomly at intervals
        setInterval(function() {
            // Occasionally make a more dramatic direction change
            if (Math.random() < config.directionChangeChance) {
                // Completely new random direction
                const angle = Math.random() * Math.PI * 2;
                gridVelocity.x = Math.cos(angle) * config.moveSpeed;
                gridVelocity.y = Math.sin(angle) * config.moveSpeed;
            } else {
                // Add a random change to the velocity
                gridVelocity.x += (Math.random() * 2 - 1) * config.randomWalkIntensity;
                gridVelocity.y += (Math.random() * 2 - 1) * config.randomWalkIntensity;
                
                // Normalize the velocity to maintain consistent speed
                const speed = Math.sqrt(gridVelocity.x * gridVelocity.x + gridVelocity.y * gridVelocity.y);
                if (speed > 0) {
                    gridVelocity.x = (gridVelocity.x / speed) * config.moveSpeed;
                    gridVelocity.y = (gridVelocity.y / speed) * config.moveSpeed;
                }
            }
        }, config.randomWalkInterval);
    }

    // Animate the grid movement
    function animateGrid() {
        // Update grid position based on velocity
        gridPosition.x += gridVelocity.x;
        gridPosition.y += gridVelocity.y;
        
        // Update the grid's visual position
        updateGridPosition();
        
        // Update which cells are visible
        updateVisibleGrid();
        
        // Continue the animation loop
        requestAnimationFrame(animateGrid);
    }

    // Update the grid's position in the DOM
    function updateGridPosition() {
        grid.style.transform = `translate(${gridPosition.x}px, ${gridPosition.y}px)`;
    }

    // Update which grid cells are visible
    function updateVisibleGrid() {
        // Calculate which cells should be visible
        const cellSize = config.cellSize + config.gridPadding;
        
        // Calculate the range of visible cells
        const startCol = Math.floor((-gridPosition.x - cellSize) / cellSize);
        const endCol = Math.floor((-gridPosition.x + viewportWidth + cellSize) / cellSize);
        const startRow = Math.floor((-gridPosition.y - cellSize) / cellSize);
        const endRow = Math.floor((-gridPosition.y + viewportHeight + cellSize) / cellSize);
        
        // Track which cells we've updated
        const updatedCells = new Set();
        
        // Create or update cells that should be visible
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const cellKey = `${col},${row}`;
                updatedCells.add(cellKey);
                
                // If the cell doesn't exist yet, create it
                if (!visibleCells.has(cellKey)) {
                    createGridCell(col, row);
                }
            }
        }
        
        // Remove cells that are no longer visible
        for (const [cellKey, cellElement] of visibleCells.entries()) {
            if (!updatedCells.has(cellKey)) {
                grid.removeChild(cellElement);
                visibleCells.delete(cellKey);
            }
        }
    }

    // Get a random image URL that hasn't been used recently
    function getRandomImageUrl(cellKey) {
        // Use a seeded random number based on cell coordinates for consistency
        // But add a large prime number to avoid patterns
        const seed = hashStringToInt(cellKey) + 104729;
        
        // If we have very few images, just use the seed to pick one
        if (imageUrls.length <= 10) {
            return imageUrls[seed % imageUrls.length];
        }
        
        // Try to find an image that hasn't been used recently
        let attempts = 0;
        let selectedUrl;
        
        do {
            // Get a pseudo-random index based on the seed and attempt number
            const randomIndex = (seed + attempts * 31) % imageUrls.length;
            selectedUrl = imageUrls[randomIndex];
            attempts++;
            
            // If we've tried too many times, just use this one
            if (attempts > 10) break;
            
        } while (recentlyUsedImages.includes(selectedUrl));
        
        // Add to recently used images and maintain the list size
        recentlyUsedImages.push(selectedUrl);
        if (recentlyUsedImages.length > config.usedImageMemory) {
            recentlyUsedImages.shift();
        }
        
        return selectedUrl;
    }

    // Simple hash function for strings
    function hashStringToInt(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // Create a new grid cell
    function createGridCell(col, row) {
        const cellKey = `${col},${row}`;
        const cellSize = config.cellSize;
        const cellPadding = config.gridPadding;
        
        // Create the cell element
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        // Position the cell
        const x = col * (cellSize + cellPadding);
        const y = row * (cellSize + cellPadding);
        cell.style.left = `${x}px`;
        cell.style.top = `${y}px`;
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        
        // Get a random image that hasn't been used recently
        const imageUrl = getRandomImageUrl(cellKey);
        
        // Create and add the image
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Grid Image';
        img.loading = 'lazy';
        
        // Add click event to open the modal
        cell.addEventListener('click', function() {
            openModal(imageUrl);
        });
        
        cell.appendChild(img);
        grid.appendChild(cell);
        
        // Store the cell in our map
        visibleCells.set(cellKey, cell);
    }

    // Set up the modal functionality
    function setupModal() {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('modal-image');
        const closeButton = document.querySelector('.close-button');
        
        // Close the modal when clicking the close button
        closeButton.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Close the modal when clicking outside the image
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Close the modal with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }

    // Open the modal with the selected image
    function openModal(imageUrl) {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('modal-image');
        
        modalImg.src = imageUrl;
        modal.style.display = 'block';
    }
}); 