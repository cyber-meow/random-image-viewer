from flask import Flask, render_template, send_from_directory, abort, url_for, redirect, request, Response
import argparse
import os
import socket

app = Flask(__name__)

VALID_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')

# Built-in themes, backed by folders under static/images
IMAGE_DIRS = {
    'general': 'general',
    'this-sacchan-does-not-exist': 'sacchan',
    'this-machu-does-not-exist': 'machu'
}

# Theme name -> absolute folder path. Extra folders are added via --dir.
THEME_FOLDERS = {
    theme: os.path.join(app.static_folder, 'images', dir_name)
    for theme, dir_name in IMAGE_DIRS.items()
}


def add_folder_theme(folder):
    """Register a local folder as a theme named after the folder, returning the theme name."""
    folder = os.path.abspath(os.path.expanduser(folder))
    if not os.path.isdir(folder):
        raise SystemExit(f'Not a directory: {folder}')

    base = os.path.basename(folder.rstrip(os.sep)) or 'folder'
    theme, n = base, 2
    while theme in THEME_FOLDERS:
        theme, n = f'{base}-{n}', n + 1
    THEME_FOLDERS[theme] = folder
    return theme


# Recursively list image files in a folder, as paths relative to it
def get_images_from_folder(folder):
    image_paths = []
    for root, dirs, files in os.walk(folder):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if file.lower().endswith(VALID_EXTENSIONS) and not file.startswith('.'):
                rel = os.path.relpath(os.path.join(root, file), folder)
                image_paths.append(rel.replace(os.sep, '/'))
    return sorted(image_paths)


@app.route('/')
def index():
    # Old grid links were /?theme=...; send them to the grid
    if 'theme' in request.args:
        return redirect(url_for('grid', theme=request.args['theme']))

    themes = []
    for theme, folder in THEME_FOLDERS.items():
        images = get_images_from_folder(folder)
        themes.append({
            'name': theme,
            'folder': folder,
            'count': len(images),
            'thumbnail': url_for('local_image', theme=theme, filename=images[0]) if images else None,
        })
    return render_template('themes.html', themes=themes)


@app.route('/grid')
def grid():
    return render_template('grid.html')


@app.route('/slideshow')
def slideshow():
    return render_template('slideshow.html')


@app.route('/api/images/<theme>')
def list_images(theme):
    """Plain-text list of image URLs for a theme, one per line (the format script.js expects)."""
    folder = THEME_FOLDERS.get(theme)
    if folder is None:
        abort(404)
    urls = [url_for('local_image', theme=theme, filename=rel)
            for rel in get_images_from_folder(folder)]
    return Response('\n'.join(urls) + '\n', mimetype='text/plain')


@app.route('/local/<theme>/<path:filename>')
def local_image(theme, filename):
    folder = THEME_FOLDERS.get(theme)
    if folder is None:
        abort(404)
    # send_from_directory rejects paths that escape the folder
    return send_from_directory(folder, filename)


@app.route('/static/data/<path:filename>')
def serve_data(filename):
    return send_from_directory(os.path.join(app.static_folder, 'data'), filename)


def lan_address():
    """Best-guess LAN IP of this machine, for printing reachable URLs."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        try:
            # UDP connect sends no packets; it just picks the outbound interface
            sock.connect(('10.255.255.255', 1))
            return sock.getsockname()[0]
        except OSError:
            return '127.0.0.1'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Random image viewer')
    parser.add_argument('--dir', action='append', default=[], metavar='FOLDER',
                        help='Local image folder to add as a theme (repeatable)')
    parser.add_argument('--host', default='127.0.0.1',
                        help='Address to bind; use 0.0.0.0 to allow other devices on the network')
    parser.add_argument('--port', type=int, default=5050)
    parser.add_argument('--debug', action='store_true',
                        help='Force debug mode (on by default only for localhost)')
    args = parser.parse_args()

    # The Werkzeug debugger allows running code from the browser, so keep it
    # off when the server is reachable from other machines unless asked for
    local_only = args.host in ('127.0.0.1', 'localhost', '::1')
    debug = args.debug or local_only

    base_url = f'http://{lan_address() if args.host == "0.0.0.0" else args.host}:{args.port}'

    # Debug mode re-runs this block in a reloader child; only print once
    announce = os.environ.get('WERKZEUG_RUN_MAIN') != 'true'
    for folder in args.dir:
        theme = add_folder_theme(folder)
        if not announce:
            continue
        print(f' * Theme "{theme}" -> {THEME_FOLDERS[theme]}')
        print(f'     grid:      {base_url}/grid?theme={theme}')
        print(f'     slideshow: {base_url}/slideshow?theme={theme}')

    if announce:
        print(f' * Themes: {base_url}/')
        if not local_only and debug:
            print(' * WARNING: debug mode is on while reachable from the network')
    app.run(host=args.host, port=args.port, debug=debug)
