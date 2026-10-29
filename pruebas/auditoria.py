#!/usr/bin/env python3
"""Auditoría estática reproducible: recursos locales, manifiesto y caché declarada.
No instala paquetes, abre puertos ni modifica archivos de la app.
No sustituye la prueba offline real de navegador.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import ast
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def check(name, passed, detail=None):
    checks.append({"prueba": name, "pasa": bool(passed), "detalle": detail})


def local_path(reference):
    parts = urlsplit(reference)
    if parts.scheme or parts.netloc:
        return None
    raw = unquote(parts.path)
    if not raw:
        return ROOT / "index.html"
    return (ROOT / raw).resolve()


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self.ids = []
        self.labels = []

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if attr.get("id"):
            self.ids.append(attr["id"])
        if tag == "label" and attr.get("for"):
            self.labels.append(attr["for"])
        if tag in ("script", "img", "source") and attr.get("src"):
            self.items.append(attr["src"])
        if tag == "link" and attr.get("href"):
            self.items.append(attr["href"])


html = (ROOT / "index.html").read_text()
parser = Resources()
parser.feed(html)
check("HTML sin ids duplicados", len(parser.ids) == len(set(parser.ids)))
check("Etiquetas enlazadas a controles existentes", all(i in parser.ids for i in parser.labels), parser.labels)
refs = set(parser.items)
css = (ROOT / "styles.css").read_text()
for ref in re.findall(r"url\(\s*['\"]?([^)'\"]+)", css):
    if not ref.startswith("data:"):
        refs.add(ref)
app = (ROOT / "app.js").read_text()
effects = (ROOT / "efectos.js").read_text()
for ref in re.findall(r"['\"]([^'\"]*assets/[^'\"]+\.(?:jpg|jpeg|png|svg|webp|mp3|wav|ogg))['\"]", app + effects):
    refs.add(ref)
manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
for icon in manifest.get("icons", []):
    refs.add(icon["src"])
check("Manifiesto usa inicio y alcance relativos", manifest.get("start_url") == "./" and manifest.get("scope") == "./")
check("Manifiesto standalone", manifest.get("display") == "standalone")
sizes = {i.get("sizes") for i in manifest.get("icons", [])}
check("Iconos de instalación 192 y 512", {"192x192", "512x512"}.issubset(sizes), sorted(sizes))

required = set()
for ref in sorted(refs):
    path = local_path(ref)
    safe = path is not None and path.is_relative_to(ROOT)
    check("Recurso local existente: " + ref, safe and path.is_file())
    if safe:
        required.add(path.relative_to(ROOT).as_posix())
check("Sin dependencias de red en app.js", re.search(r"['\"]https?://[^'\"]+['\"]", app) is None)
check("Sin dependencias externas en efectos.js", re.search(r"['\"]https?://[^'\"]+['\"]", effects) is None)

sw = (ROOT / "sw.js").read_text()
cache_items = set()
for match in re.finditer(r"(?:const|let|var)\s+\w+\s*=\s*(\[[\s\S]*?\])", sw):
    try:
        value = ast.literal_eval(match.group(1))
    except (SyntaxError, ValueError):
        continue
    if isinstance(value, list):
        for entry in value:
            if isinstance(entry, str):
                path = local_path(entry)
                if path is not None and path.is_relative_to(ROOT):
                    cache_items.add(path.relative_to(ROOT).as_posix())
required.update({"index.html", "core.js", "app.js", "styles.css", "manifest.webmanifest"})
required.update(p.relative_to(ROOT).as_posix() for p in (ROOT / "assets").glob("foto*.jpg"))
missing_cache = sorted(required - cache_items)
check("Caché declarada cubre todos los recursos necesarios", not missing_cache, {"faltan": missing_cache, "declarados": sorted(cache_items)})
check("Service worker declara install, activate y fetch", all(re.search(r"addEventListener\(\s*['\"]" + e + r"['\"]", sw) for e in ["install", "activate", "fetch"]))
check("Reducción de movimiento declarada en CSS y JS", "prefers-reduced-motion" in css and "prefers-reduced-motion" in app)
check("Modelo de caja border-box", "box-sizing" in css and "border-box" in css)
check("Cinco fotos locales", len(list((ROOT / "assets").glob("foto*.jpg"))) == 5)
for name, expected in {
    "fanfarria-joepayne-413201.mp3": "2dd2a48d189bb3057ab859461574dcbd73dab1445b5da7b934174f440083192b",
    "triste-kirbydx-175409.mp3": "de4a029a0537dbecaf49b4936b0969919f5b7b54083d3859d584b5c4cc7dee3d",
}.items():
    path = ROOT / "assets" / name
    check("Grabación elegida intacta: " + name, path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == expected)

reference = ROOT / "pruebas/referencia-original.html"
check("Referencia original intacta", hashlib.sha256(reference.read_bytes()).hexdigest() == "4c4aef070ec78f8a3913a6e206cb652f0d21420113c0cec5ab29d5503e4b27ad")
failed = [c for c in checks if not c["pasa"]]
print(json.dumps({"tipo": "Auditoría estática; no es prueba de instalación ni de caché real", "total": len(checks), "aprobadas": len(checks) - len(failed), "fallidas": len(failed), "pruebas": checks}, indent=2, ensure_ascii=False))
sys.exit(1 if failed else 0)
