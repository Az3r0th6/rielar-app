import subprocess
import os
from PIL import Image

def generate():
    chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    bin_path = chrome if os.path.exists(chrome) else edge

    html_path = os.path.abspath("play-store-assets/banner.html")
    out_png = os.path.abspath("play-store-assets/feature-graphic-1024x500.png")
    out_jpg = os.path.abspath("play-store-assets/feature-graphic-1024x500.jpg")
    url = "file:///" + html_path.replace("\\", "/")

    cmd = [
        bin_path,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--window-size=1024,500",
        "--force-device-scale-factor=1",
        f"--screenshot={out_png}",
        url
    ]

    print("Running browser render...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Process return code:", res.returncode)

    if not os.path.exists(out_png):
        print("ERROR: File not created")
        return

    # Verify and post-process with PIL
    im = Image.open(out_png)
    print(f"Captured size: {im.size}, mode: {im.mode}")

    # Ensure EXACT (1024, 500)
    if im.size != (1024, 500):
        print(f"Resizing from {im.size} to (1024, 500)...")
        im = im.crop((0, 0, 1024, 500)) if im.size[0] >= 1024 and im.size[1] >= 500 else im.resize((1024, 500), Image.Resampling.LANCZOS)
        im.save(out_png, "PNG", optimize=True)

    # Convert to RGB (no alpha channel, as recommended by Google Play for feature graphics)
    rgb_im = im.convert("RGB")
    rgb_im.save(out_png, "PNG", optimize=True)
    rgb_im.save(out_jpg, "JPEG", quality=95, optimize=True)

    png_size = os.path.getsize(out_png)
    jpg_size = os.path.getsize(out_jpg)
    print(f"Feature Graphic PNG: {out_png}")
    print(f"Dimensions: {im.size} (1024x500 px)")
    print(f"PNG Size: {png_size} bytes ({png_size / (1024*1024):.2f} MB)")
    print(f"JPG Size: {jpg_size} bytes ({jpg_size / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    generate()
