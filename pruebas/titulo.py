"""Comprueba la restauración textual sin modificar archivos.

Uso: python3 pruebas/titulo.py [--index-only]
El modo completo comprueba también Vista-previa.html tras regenerarla.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = "Calculadora Legendaria 💸"
REMOVED = [
    "CUENTAS CLARAS, BUENOS MOMENTOS",
    "Tu corte, bien repartido.",
    "Haz la cuenta. Comparte el resultado. Celebra un poquito.",
]
CONTROLS = ["valorBase", "calculateButton", "soundToggle", "previousPhoto", "nextPhoto"]


def normalize(value):
    return re.sub(r"\s+", " ", value).strip()


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current = None
        self.titles = []
        self.headings = []
        self.parts = []
        self.ids = set()
        self.all_text = []

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if "id" in attr:
            self.ids.add(attr["id"])
        if tag in ("title", "h1"):
            self.current = tag
            self.parts = []

    def handle_endtag(self, tag):
        if tag == self.current:
            destination = self.titles if tag == "title" else self.headings
            destination.append(normalize("".join(self.parts)))
            self.current = None

    def handle_data(self, data):
        self.all_text.append(data)
        if self.current:
            self.parts.append(data)


checks = []


def check(name, passed):
    checks.append({"prueba": name, "pasa": bool(passed)})


for name in ["index.html"] + ([] if "--index-only" in sys.argv else ["Vista-previa.html"]):
    page = Page()
    page.feed((ROOT / name).read_text())
    text = normalize(" ".join(page.all_text)).casefold()
    check(name + ": title exacto", page.titles == [EXPECTED])
    check(name + ": h1 exacto y único", page.headings == [EXPECTED])
    for phrase in REMOVED:
        check(name + ": frase eliminada: " + phrase, normalize(phrase).casefold() not in text)
    for control in CONTROLS:
        check(name + ": control conservado: " + control, control in page.ids)

manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
for field in ["name", "short_name"]:
    check("manifest: " + field + " exacto", manifest.get(field) == EXPECTED)

failed = sum(not item["pasa"] for item in checks)
print(json.dumps({"total": len(checks), "aprobadas": len(checks) - failed,
                  "fallidas": failed, "pruebas": checks}, ensure_ascii=False, indent=2))
raise SystemExit(1 if failed else 0)
