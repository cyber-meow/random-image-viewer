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
    }
    
    // Map themes to image files
    const themeImageFiles = {
        'general': 'image_urls/images.txt',
        'this-sacchan-does-not-exist': 'image_urls/sacchan-images.txt',
        'this-machu-does-not-exist': 'image_urls/machu-images.txt'
    };
    
    // Map themes to aspect ratios (width:height)
    const themeAspectRatios = {
        'general': { width: 1, height: 1 },           // 1:1 square (default)
        'this-sacchan-does-not-exist': { width: 1, height: 1 }, // 920:1152 for sacchan
        'this-machu-does-not-exist': { width: 4, height: 3 }              // 4:3 for machu
    };
    
    // Get the selected image file and aspect ratio
    const selectedImageFile = themeImageFiles[theme] || themeImageFiles['general'];
    const aspectRatio = themeAspectRatios[theme] || themeAspectRatios['general'];
    
    // Log the selected file
    console.log("Selected image file:", selectedImageFile);
    
    return {
        // Grid appearance
        cellSize: 150,                 // Size of each grid cell in pixels
        gridPadding: 2,                // Padding between grid cells

        // Movement behavior
        moveSpeed: 0.5,                  // Base speed of grid movement
        randomWalkInterval: 600,       // Interval for changing direction (ms)
        randomWalkIntensity: 0.4,      // How much the direction changes (0-1)
        directionChangeChance: 0,      // Chance of significant direction change

        // Image handling
        imageUrlsFile: selectedImageFile,
        usedImageMemory: 200,          // Remember last N used images to avoid repetition
        
        // Aspect ratio configuration
        aspectRatio: aspectRatio,      // Width:height ratio for images

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