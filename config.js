// Configuration settings for the infinite grid
const gridConfig = {
    // Grid appearance
    cellSize: 150,                 // Size of each grid cell in pixels
    gridPadding: 2,                // Padding between grid cells

    // Movement behavior
    moveSpeed: 1,                  // Base speed of grid movement
    randomWalkInterval: 600,       // Interval for changing direction (ms)
    randomWalkIntensity: 0.4,      // How much the direction changes (0-1)
    directionChangeChance: 0,    // Chance of significant direction change

    // Image handling
    imageUrlsFile: 'images.txt',   // Path to the text file with image URLs
    usedImageMemory: 200,          // Remember last N used images to avoid repetition

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