import subprocess
import os
import time
from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
RAW_DIR = os.path.abspath("play-store-assets/screenshots/raw")
os.makedirs(RAW_DIR, exist_ok=True)

TABS = [
    ("1-nearby", "http://localhost:3001/?tab=nearby&screenshot=1"),
    ("2-map", "http://localhost:3001/?tab=map&screenshot=1"),
    ("3-lines", "http://localhost:3001/?tab=lines&screenshot=1"),
    ("4-planner", "http://localhost:3001/?tab=planner&screenshot=1"),
    ("5-favorites", "http://localhost:3001/?tab=favorites&screenshot=1"),
]

def capture_tabs():
    for name, url in TABS:
        out_png = os.path.join(RAW_DIR, f"{name}.png")
        cmd = [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--window-size=412,892",
            "--force-device-scale-factor=2.6",
            "--user-agent=Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
            f"--screenshot={out_png}",
            url
        ]
        print(f"Capturing {name} from {url}...")
        res = subprocess.run(cmd, capture_output=True, text=True)
        if os.path.exists(out_png):
            im = Image.open(out_png)
            print(f"  OK: {name}.png captured! Size: {im.size}, bytes: {os.path.getsize(out_png)}")
        else:
            print(f"  FAILED: {name}.png not found")

if __name__ == "__main__":
    capture_tabs()
