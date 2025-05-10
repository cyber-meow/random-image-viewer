// Configuration settings for the infinite grid
const gridConfig = (function() {
    // Get the current path and URL parameters
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme');
    
    console.log("Current path:", path);
    
    // Determine theme based on path or parameter
    let theme = 'general';
    if (themeParam) {
        // Use the theme from URL parameter if provided
        theme = themeParam;
        console.log("Theme set from URL parameter:", theme);
    } else if (path.includes('this-sacchan-does-not-exist')) {
        theme = 'sacchan';
        console.log("Theme set from path (sacchan)");
    } else if (path.includes('this-machu-does-not-exist')) {
        theme = 'machu';
        console.log("Theme set from path (machu)");
    } else {
        console.log("Using default theme (general)");
    }
    
    // Map themes to image files
    const themeImageFiles = {
        'general': 'image_urls/images.txt',
        'sacchan': 'image_urls/sacchan-images.txt',
        'machu': 'image_urls/machu-images.txt'
    };
    
    // Get the selected image file
    const selectedImageFile = themeImageFiles[theme] || themeImageFiles['general'];
    
    // Log the selected file
    console.log("Selected image file:", selectedImageFile);
    
    // Create a visible debug element on the page
    setTimeout(() => {
        const debugDiv = document.createElement('div');
        debugDiv.style.position = 'fixed';
        debugDiv.style.bottom = '10px';
        debugDiv.style.left = '10px';
        debugDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugDiv.style.color = 'white';
        debugDiv.style.padding = '10px';
        debugDiv.style.borderRadius = '5px';
        debugDiv.style.zIndex = '1000';
        debugDiv.style.fontSize = '12px';
        debugDiv.style.fontFamily = 'monospace';
        debugDiv.innerHTML = `
            <strong>Debug Info:</strong><br>
            Path: ${path}<br>
            Theme: ${theme}<br>
            Image File: ${selectedImageFile}
        `;
        document.body.appendChild(debugDiv);
    }, 1000);
    
    return {
        // Grid appearance
        cellSize: 150,                 // Size of each grid cell in pixels
        gridPadding: 2,                // Padding between grid cells

        // Movement behavior
        moveSpeed: 1,                  // Base speed of grid movement
        randomWalkInterval: 600,       // Interval for changing direction (ms)
        randomWalkIntensity: 0.4,      // How much the direction changes (0-1)
        directionChangeChance: 0,      // Chance of significant direction change

        // Image handling
        imageUrlsFile: selectedImageFile,
        usedImageMemory: 200,          // Remember last N used images to avoid repetition

        // Theme
        theme: theme,

        // Fallback images (used if images.txt can't be loaded)
        fallbackUrls: [
            "https://picsum.photos/seed/img01/800/600",
            "https://picsum.photos/seed/img02/800/600",
            "https://picsum.photos/seed/img03/800/600",
            "https://picsum.photos/seed/img04/800/600",
            "https://picsum.photos/seed/img05/800/600",
            "https://picsum.photos/seed/img06/800/600",
            "https://picsum.photos/seed/img07/800/600",
            "https://picsum.photos/seed/img08/800/600",
            "https://picsum.photos/seed/img09/800/600",
            "https://picsum.photos/seed/img10/800/600"
        ]
    };
})(); 