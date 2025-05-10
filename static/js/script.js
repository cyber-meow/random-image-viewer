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
    
    // Keyboard control state
    let keyboardControls = {
        isActive: false,
        keysPressed: {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        },
        panSpeed: 3 // Pixels per frame when using keyboard
    };
    
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
    
    // Set up keyboard controls
    setupKeyboardControls();

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
            .then(async data => {
                // Split the text file by lines
                const lines = data.split('\n').map(url => url.trim()).filter(url => url.length > 0);
                
                // Process each line, checking for Hugging Face URLs
                let processedUrls = [];
                
                for (const line of lines) {
                    // Check if this is a Hugging Face directory URL
                    if (line.startsWith('hf:')) {
                        const hfUrl = line.substring(3).trim();
                        console.log(`Detected Hugging Face directory: ${hfUrl}`);
                        
                        try {
                            // Extract repository info from the URL
                            const urlParts = hfUrl.split('/');
                            const repoIndex = urlParts.indexOf('datasets') + 1;
                            
                            if (repoIndex > 0 && repoIndex < urlParts.length) {
                                const repoOwner = urlParts[repoIndex];
                                const repoName = urlParts[repoIndex + 1];
                                const repoId = `${repoOwner}/${repoName}`;
                                
                                // Extract path within the repository
                                const treePath = urlParts.indexOf('tree');
                                let pathInRepo = '';
                                
                                if (treePath > 0 && treePath + 2 < urlParts.length) {
                                    // Skip 'tree/main' and get the rest of the path
                                    pathInRepo = urlParts.slice(treePath + 2).join('/');
                                }
                                
                                // Create a cache key for this specific repository and path
                                const cacheKey = `hf_images_${repoId}_${pathInRepo}`.replace(/[^a-zA-Z0-9_]/g, '_');
                                
                                // Check if we have cached data and it's not too old (24 hours)
                                const cachedData = localStorage.getItem(cacheKey);
                                const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
                                const cacheAge = cacheTimestamp ? (Date.now() - parseInt(cacheTimestamp)) : Infinity;
                                const cacheValid = cacheAge < 24 * 60 * 60 * 1000; // 24 hours
                                
                                let hfImageUrls = [];
                                
                                if (cachedData && cacheValid) {
                                    // Use cached data
                                    console.log(`Using cached image list for ${repoId}/${pathInRepo}`);
                                    hfImageUrls = JSON.parse(cachedData);
                                } else {
                                    // Fetch the file list from the Hugging Face API
                                    console.log(`Fetching images from repo: ${repoId}, path: ${pathInRepo}`);
                                    const apiUrl = `https://huggingface.co/api/datasets/${repoId}/tree/main/${pathInRepo}`;
                                    
                                    // Add a small delay to avoid rate limiting
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    const response = await fetch(apiUrl);
                                    
                                    if (!response.ok) {
                                        throw new Error(`Failed to fetch directory listing: ${response.status}`);
                                    }
                                    
                                    const fileList = await response.json();
                                    
                                    // Extract image files and construct URLs
                                    hfImageUrls = fileList
                                        .filter(file => file.type === "file" && 
                                            (file.path.endsWith(".png") || 
                                             file.path.endsWith(".jpg") || 
                                             file.path.endsWith(".jpeg") || 
                                             file.path.endsWith(".gif")))
                                        .map(file => `https://huggingface.co/datasets/${repoId}/resolve/main/${file.path}`);
                                    
                                    // Cache the results
                                    try {
                                        localStorage.setItem(cacheKey, JSON.stringify(hfImageUrls));
                                        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
                                    } catch (e) {
                                        console.warn("Could not cache image list (storage may be full):", e);
                                    }
                                }
                                
                                console.log(`Found ${hfImageUrls.length} images in Hugging Face directory`);
                                processedUrls = processedUrls.concat(hfImageUrls);
                            } else {
                                console.error("Could not parse Hugging Face repository from URL:", hfUrl);
                            }
                        } catch (error) {
                            console.error("Error processing Hugging Face directory:", error);
                            
                            // If we have a fallback cached version, use it even if it's old
                            const cacheKey = `hf_images_fallback_${hfUrl.replace(/[^a-zA-Z0-9_]/g, '_')}`;
                            const cachedData = localStorage.getItem(cacheKey);
                            
                            if (cachedData) {
                                console.log("Using fallback cached data due to error");
                                const fallbackUrls = JSON.parse(cachedData);
                                processedUrls = processedUrls.concat(fallbackUrls);
                            }
                        }
                    } else {
                        // Regular image URL
                        processedUrls.push(line);
                    }
                }
                
                // Use the processed URLs
                imageUrls = processedUrls;
                
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

    // Set up keyboard controls
    function setupKeyboardControls() {
        // Add keyboard event listeners
        document.addEventListener('keydown', function(event) {
            // Check if the key is one of our control keys
            if (Object.keys(keyboardControls.keysPressed).includes(event.key)) {
                // Prevent default behavior (like scrolling)
                event.preventDefault();
                
                // Mark this key as pressed
                keyboardControls.keysPressed[event.key] = true;
                
                // Activate keyboard control mode
                if (!keyboardControls.isActive) {
                    keyboardControls.isActive = true;
                    
                    // Show a visual indicator that keyboard mode is active
                    const indicator = document.createElement('div');
                    indicator.id = 'keyboard-control-indicator';
                    indicator.textContent = 'Keyboard Control Active';
                    indicator.style.position = 'fixed';
                    indicator.style.bottom = '20px';
                    indicator.style.left = '50%';
                    indicator.style.transform = 'translateX(-50%)';
                    indicator.style.background = 'rgba(0, 0, 0, 0.5)';
                    indicator.style.color = 'white';
                    indicator.style.padding = '8px 16px';
                    indicator.style.borderRadius = '4px';
                    indicator.style.zIndex = '1000';
                    document.body.appendChild(indicator);
                    
                    // Pause the random walk
                    gridVelocity.x = 0;
                    gridVelocity.y = 0;
                }
            }
        });
        
        document.addEventListener('keyup', function(event) {
            // Check if the key is one of our control keys
            if (Object.keys(keyboardControls.keysPressed).includes(event.key)) {
                // Mark this key as released
                keyboardControls.keysPressed[event.key] = false;
                
                // Check if all keys are released
                const allKeysReleased = Object.values(keyboardControls.keysPressed).every(pressed => !pressed);
                
                if (allKeysReleased && keyboardControls.isActive) {
                    // Deactivate keyboard control mode after a short delay
                    setTimeout(function() {
                        // Double-check that all keys are still released
                        if (Object.values(keyboardControls.keysPressed).every(pressed => !pressed)) {
                            keyboardControls.isActive = false;
                            
                            // Remove the visual indicator
                            const indicator = document.getElementById('keyboard-control-indicator');
                            if (indicator) {
                                document.body.removeChild(indicator);
                            }
                            
                            // Resume random walk with a new random direction
                            const angle = Math.random() * Math.PI * 2;
                            gridVelocity.x = Math.cos(angle) * config.moveSpeed;
                            gridVelocity.y = Math.sin(angle) * config.moveSpeed;
                        }
                    }, 3000); // Resume random walk after 3 seconds of inactivity
                }
            }
        });
    }

    // Start the random walk animation
    function startRandomWalk() {
        // Change direction randomly at intervals
        setInterval(function() {
            // Only change direction if keyboard control is not active
            if (!keyboardControls.isActive) {
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
            }
        }, config.randomWalkInterval);
    }

    // Animate the grid movement
    function animateGrid() {
        // Handle keyboard controls
        if (keyboardControls.isActive) {
            // Calculate movement based on pressed keys
            let dx = 0;
            let dy = 0;
            
            if (keyboardControls.keysPressed.ArrowLeft) dx += keyboardControls.panSpeed;
            if (keyboardControls.keysPressed.ArrowRight) dx -= keyboardControls.panSpeed;
            if (keyboardControls.keysPressed.ArrowUp) dy += keyboardControls.panSpeed;
            if (keyboardControls.keysPressed.ArrowDown) dy -= keyboardControls.panSpeed;
            
            // Update grid position directly
            gridPosition.x += dx;
            gridPosition.y += dy;
        } else {
            // Update grid position based on velocity
            gridPosition.x += gridVelocity.x;
            gridPosition.y += gridVelocity.y;
        }
        
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
                grid.removeChild(cellElement.element);
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
        const baseCellSize = config.cellSize;
        const cellPadding = config.gridPadding;
        
        // Create the cell element
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        // Calculate cell dimensions based on aspect ratio
        let cellWidth = baseCellSize;
        let cellHeight = baseCellSize;
        
        if (config.aspectRatio) {
            const { width, height } = config.aspectRatio;
            const ratio = width / height;
            
            // Adjust dimensions to maintain aspect ratio
            // We'll keep the area approximately the same as a square cell
            if (ratio >= 1) {
                // Landscape or square orientation
                cellWidth = baseCellSize * Math.sqrt(ratio);
                cellHeight = cellWidth / ratio;
            } else {
                // Portrait orientation
                cellHeight = baseCellSize / Math.sqrt(ratio);
                cellWidth = cellHeight * ratio;
            }
        }
        
        // Position the cell using the calculated dimensions
        const x = col * (cellWidth + cellPadding);
        const y = row * (cellHeight + cellPadding);
        
        cell.style.left = `${x}px`;
        cell.style.top = `${y}px`;
        cell.style.width = `${cellWidth}px`;
        cell.style.height = `${cellHeight}px`;
        
        // Get a random image that hasn't been used recently
        const imageUrl = getRandomImageUrl(cellKey);
        
        // Create and add the image
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Grid Image';
        img.loading = 'lazy';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        
        // Add click event to open the modal
        cell.addEventListener('click', function() {
            openModal(imageUrl);
        });
        
        cell.appendChild(img);
        grid.appendChild(cell);
        
        // Store the cell in our map with its dimensions
        visibleCells.set(cellKey, {
            element: cell,
            width: cellWidth,
            height: cellHeight
        });
        
        return { width: cellWidth, height: cellHeight };
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
        
        // Apply aspect ratio to modal image if configured
        if (config.aspectRatio) {
            const { width, height } = config.aspectRatio;
            
            // Calculate the aspect ratio
            const ratio = width / height;
            
            // Get viewport dimensions
            const viewportWidth = window.innerWidth * 0.8;
            const viewportHeight = window.innerHeight * 0.8;
            
            // Calculate the maximum size that fits in the viewport while maintaining aspect ratio
            let imgWidth, imgHeight;
            
            if (viewportWidth / ratio <= viewportHeight) {
                // Width is the limiting factor
                imgWidth = viewportWidth;
                imgHeight = imgWidth / ratio;
            } else {
                // Height is the limiting factor
                imgHeight = viewportHeight;
                imgWidth = imgHeight * ratio;
            }
            
            // Apply the calculated dimensions
            modalImg.style.width = `${imgWidth}px`;
            modalImg.style.height = `${imgHeight}px`;
        } else {
            // No aspect ratio specified, use default constraints
            modalImg.style.maxWidth = '80vw';
            modalImg.style.maxHeight = '80vh';
            modalImg.style.width = 'auto';
            modalImg.style.height = 'auto';
        }
        
        modal.style.display = 'block';
    }
}); 