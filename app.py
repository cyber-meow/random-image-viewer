from flask import Flask, render_template, send_from_directory, jsonify
import os
import random

app = Flask(__name__)

# Configuration
IMAGE_DIRS = {
    'general': 'general',
    'this-sacchan-does-not-exist': 'sacchan',
    'this-machu-does-not-exist': 'machu'
}

# Function to get all image paths from a directory
def get_images_from_directory(directory):
    image_paths = []
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    
    full_path = os.path.join(app.static_folder, 'images', directory)
    
    if os.path.exists(full_path):
        for file in os.listdir(full_path):
            if any(file.lower().endswith(ext) for ext in valid_extensions):
                # Create URL for the static file
                image_url = f'/static/images/{directory}/{file}'
                image_paths.append(image_url)
    
    return image_paths

# Generate txt files with local image URLs
def generate_txt_files():
    for theme_key, dir_name in IMAGE_DIRS.items():
        images = get_images_from_directory(dir_name)
        
        # Create the data directory if it doesn't exist
        data_dir = os.path.join(app.static_folder, 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        # Write the image URLs to a txt file
        file_name = 'general.txt' if theme_key == 'general' else f'{theme_key}.txt'
        with open(os.path.join(data_dir, file_name), 'w') as f:
            for img_url in images:
                f.write(f'{img_url}\n')

@app.route('/')
def index():
    # Generate txt files with local image URLs
    generate_txt_files()
    return render_template('index.html')

@app.route('/static/data/<path:filename>')
def serve_data(filename):
    return send_from_directory(os.path.join(app.static_folder, 'data'), filename)

if __name__ == '__main__':
    app.run(debug=True) 