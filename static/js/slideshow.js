// Two-panel slideshow: left and right images advance together on a timer.
// Click anywhere (or Space) to pause/play, arrow keys for previous/next pair.
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme') || 'general';

    const leftImg = document.getElementById('left-image');
    const rightImg = document.getElementById('right-image');
    const indicator = document.getElementById('status-indicator');
    const message = document.getElementById('message');
    const controls = document.getElementById('controls');
    const intervalInput = document.getElementById('interval-input');
    const counter = document.getElementById('counter');

    // Interval (seconds): URL param wins, then saved value, then default
    let intervalSec = parseFloat(params.get('interval')) ||
        parseFloat(localStorage.getItem('slideshowInterval')) || 5;
    intervalInput.value = intervalSec;

    let images = [];
    let deck = [];        // Shuffled images not yet shown in this cycle
    let history = [];     // Pairs shown so far, for going back
    let position = -1;    // Index into history of the pair on screen
    let paused = false;
    let timer = null;
    let indicatorTimer = null;

    fetch(`/api/images/${encodeURIComponent(theme)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Unknown theme "${theme}"`);
            }
            return response.text();
        })
        .then(text => {
            images = text.split('\n').map(url => url.trim()).filter(url => url.length > 0);
            if (images.length === 0) {
                message.textContent = `No images found for theme "${theme}"`;
                return;
            }
            showNext();
        })
        .catch(error => {
            message.textContent = error.message;
        });

    // Draw the next image, reshuffling the deck once every image has been shown
    function drawImage() {
        if (deck.length === 0) {
            deck = images.slice();
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
        }
        return deck.pop();
    }

    function makePair() {
        const left = drawImage();
        if (images.length < 2) {
            return [left, null];
        }
        let right = drawImage();
        // A reshuffle can hand back the same image; draw again to avoid a duplicate pair
        if (right === left) {
            right = drawImage();
        }
        return [left, right];
    }

    function preload(pair) {
        pair.forEach(url => {
            if (url) {
                new Image().src = url;
            }
        });
    }

    function render() {
        const [left, right] = history[position];
        leftImg.src = left;
        if (right) {
            rightImg.src = right;
        } else {
            rightImg.removeAttribute('src');
        }
        counter.textContent = `${images.length} images`;

        // Make sure the pair after this one is ready so the switch doesn't flicker
        if (position === history.length - 1) {
            history.push(makePair());
        }
        preload(history[position + 1]);
    }

    function showNext() {
        if (position + 1 >= history.length) {
            history.push(makePair());
        }
        position++;
        render();
        schedule();
    }

    function showPrevious() {
        if (position > 0) {
            position--;
            render();
            schedule();
        }
    }

    function schedule() {
        clearTimeout(timer);
        if (!paused) {
            timer = setTimeout(showNext, intervalSec * 1000);
        }
    }

    function flashIndicator(symbol) {
        indicator.textContent = symbol;
        indicator.classList.add('visible');
        clearTimeout(indicatorTimer);
        indicatorTimer = setTimeout(() => indicator.classList.remove('visible'), 700);
    }

    function togglePause() {
        if (images.length === 0) {
            return;
        }
        paused = !paused;
        flashIndicator(paused ? '⏸' : '▶');
        schedule();
    }

    document.addEventListener('click', togglePause);

    // Clicks on the controls or the back link shouldn't pause the show
    controls.addEventListener('click', event => event.stopPropagation());
    document.getElementById('back-link').addEventListener('click', event => event.stopPropagation());

    intervalInput.addEventListener('change', function() {
        const value = parseFloat(intervalInput.value);
        if (value >= 1) {
            intervalSec = value;
            localStorage.setItem('slideshowInterval', String(value));
            schedule();
        } else {
            intervalInput.value = intervalSec;
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.target === intervalInput || images.length === 0) {
            return;
        }
        if (event.key === ' ') {
            event.preventDefault();
            togglePause();
        } else if (event.key === 'ArrowRight') {
            showNext();
        } else if (event.key === 'ArrowLeft') {
            showPrevious();
        }
    });
});
