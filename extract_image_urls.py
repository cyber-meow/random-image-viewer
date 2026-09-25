import requests
from huggingface_hub import HfApi
import os

# Initialize the Hugging Face API
api = HfApi()

# Repository and path information
repo_id = "alea31415/ai_anime_images"
repo_type = "dataset"
path_in_repo = "sacchan"

# Get all files in the specified directory
files = api.list_repo_files(repo_id=repo_id, repo_type=repo_type, revision="main")

# Filter only files in the sacchan directory that are images
sacchan_images = [
    f
    for f in files
    if f.startswith(path_in_repo)
    and (f.endswith(".png") or f.endswith(".jpg") or f.endswith(".jpeg"))
]

# Get the download URLs for each file
image_urls = []
for image_file in sacchan_images:
    # Construct the download URL using the Hugging Face format
    # This URL will work without authentication for public repositories
    url = f"https://huggingface.co/datasets/{repo_id}/resolve/main/{image_file}"
    image_urls.append(url)

# Write URLs to sacchan-images.txt
with open("sacchan-images.txt", "w") as f:
    for url in image_urls:
        f.write(url + "\n")

print(f"Extracted {len(image_urls)} image URLs to sacchan-images.txt")
