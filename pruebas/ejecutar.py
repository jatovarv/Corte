#!/usr/bin/env python3
"""Ejecuta pruebas locales y guarda sus resultados. Requiere macOS y Python 3.
No instala software, usa la red, abre servicios ni cambia archivos de la app.
"""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "pruebas"
summary = []

for script, output in [
    ("calculo.js", "resultados-calculo.json"),
    ("audio.js", "resultados-audio.json"),
    ("interfaz.js", "resultados-interfaz.json"),
]:
    target = RESULTS / output
    target.unlink(missing_ok=True)
    process = subprocess.run(
        ["osascript", "-l", "JavaScript", str(RESULTS / script), str(ROOT)],
        cwd=ROOT, capture_output=True, text=True, timeout=30,
    )
    if process.returncode:
        raise SystemExit(script + " falló:\n" + process.stdout + process.stderr)
    if script == "calculo.js":
        target.write_text(json.dumps(json.loads(process.stdout), indent=2, ensure_ascii=False))
    if not target.is_file():
        raise SystemExit(script + " no produjo resultado nuevo:\n" + process.stdout + process.stderr)
    report = json.loads(target.read_text())
    if report["fallidas"]:
        raise SystemExit(script + " produjo pruebas fallidas. Consultar " + str(target))
    summary.append({"suite": script, "aprobadas": report["aprobadas"], "total": report["total"]})

process = subprocess.run(["python3", str(RESULTS / "auditoria.py")], cwd=ROOT, capture_output=True, text=True, timeout=30)
report = json.loads(process.stdout)
(RESULTS / "resultados-auditoria.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
if process.returncode or report["fallidas"]:
    raise SystemExit("Auditoría falló:\n" + process.stdout + process.stderr)
summary.append({"suite": "auditoria.py", "aprobadas": report["aprobadas"], "total": report["total"]})
result = {
    "fechaUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "total": sum(s["total"] for s in summary),
    "aprobadas": sum(s["aprobadas"] for s in summary),
    "suites": summary,
    "sha256": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in ["core.js", "efectos.js", "app.js", "styles.css", "sw.js", "index.html", "manifest.webmanifest"]},
    "limites": ["AudioContext, DOM y matchMedia simulados en pruebas JS", "Auditoría de caché declarada, no instalación ni carga offline de navegador", "Sin iPhone real ni prueba audible física"],
}
(RESULTS / "resultados-resumen.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
print(json.dumps({"total": result["total"], "aprobadas": result["aprobadas"], "suites": summary}, indent=2, ensure_ascii=False))
