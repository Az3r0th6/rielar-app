import subprocess
import os
import urllib.parse
from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = os.path.abspath("play-store-assets/screenshots")
os.makedirs(OUT_DIR, exist_ok=True)
TEMPLATE_PATH = os.path.abspath("play-store-assets/screenshot-template.html")

SCREENSHOTS = [
    {
        "id": "1-arribos",
        "badge": "⚡ TIEMPO REAL • EN VIVO",
        "title": "Horarios y Arribos <span class=\"highlight\">en Vivo</span>",
        "sub": "Próximos trenes, andenes y cálculo de cercanía en minutos",
        "img": "screenshots/raw/1-nearby.png"
    },
    {
        "id": "2-mapa",
        "badge": "🗺️ MAPA FERROVIARIO AMBA",
        "title": "Mapa Interactivo <span class=\"highlight\">de Ramales</span>",
        "sub": "Trazados, estaciones y trenes circulando en directo",
        "img": "screenshots/raw/2-map.png"
    },
    {
        "id": "3-estado",
        "badge": "🚨 ESTADO OFICIAL • SOFSE",
        "title": "Alertas de Servicio <span class=\"highlight\">al Instante</span>",
        "sub": "Demoras, cancelaciones y reportes de las 7 líneas metropolitanas",
        "img": "screenshots/raw/3-lines.png"
    },
    {
        "id": "4-planificador",
        "badge": "🧭 PLANIFICADOR INTELIGENTE",
        "title": "Horarios de Origen <span class=\"highlight\">y Destino</span>",
        "sub": "Cronogramas completos, combinaciones y frecuencias",
        "img": "screenshots/raw/4-planner.png"
    },
    {
        "id": "5-favoritos",
        "badge": "⭐ ACCESO PERSONALIZADO",
        "title": "Tus Estaciones <span class=\"highlight\">Favoritas</span>",
        "sub": "Tus viajes diarios guardados para consultar con un solo toque",
        "img": "screenshots/raw/5-favorites.png"
    }
]

def generate():
    for item in SCREENSHOTS:
        params = {
            "badge": item["badge"],
            "title": item["title"],
            "sub": item["sub"],
            "img": item["img"]
        }
        qs = urllib.parse.urlencode(params)
        file_url = "file:///" + TEMPLATE_PATH.replace("\\", "/") + "?" + qs
        out_png = os.path.join(OUT_DIR, f"screenshot-{item['id']}-1080x1920.png")
        out_jpg = os.path.join(OUT_DIR, f"screenshot-{item['id']}-1080x1920.jpg")

        cmd = [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--window-size=1080,1920",
            "--force-device-scale-factor=1",
            f"--screenshot={out_png}",
            file_url
        ]
        print(f"Rendering screenshot {item['id']}...")
        res = subprocess.run(cmd, capture_output=True, text=True)

        if not os.path.exists(out_png):
            print(f"  FAILED to render {item['id']}")
            continue

        im = Image.open(out_png)
        # Ensure exact 1080x1920
        if im.size != (1080, 1920):
            print(f"  Cropping/Resizing from {im.size} to (1080, 1920)...")
            im = im.crop((0, 0, 1080, 1920)) if im.size[0] >= 1080 and im.size[1] >= 1920 else im.resize((1080, 1920), Image.Resampling.LANCZOS)
            im.save(out_png, "PNG", optimize=True)

        rgb_im = im.convert("RGB")
        rgb_im.save(out_png, "PNG", optimize=True)
        rgb_im.save(out_jpg, "JPEG", quality=95, optimize=True)

        png_size = os.path.getsize(out_png)
        jpg_size = os.path.getsize(out_jpg)
        print(f"  OK: {out_png}")
        print(f"      Dimensions: {im.size} | PNG: {png_size/(1024*1024):.2f} MB | JPG: {jpg_size/(1024*1024):.2f} MB")

if __name__ == "__main__":
    generate()
