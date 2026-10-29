# Grabaciones elegidas

Verificación: 29 de octubre de 2026. Archivo técnico excluido de GitHub Pages por `pruebas/` en `_config.yml`.

Se usan las preescuchas MP3 de alta calidad que las propias fichas públicas enlazan mediante `data-static-file-url`. No se necesitó iniciar sesión ni descargar el original protegido por inicio de sesión. Se conservan sus bytes, sin recodificar, recortar ni modificar el tono.

| Uso | Grabación y autor | Ficha | Preview HQ oficial | Archivo local |
|---|---|---|---|---|
| Depósito mayor de 100000 | Clean Trumpet Fanfare .mp3 — joepayne | https://freesound.org/people/joepayne/sounds/413201/ | https://cdn.freesound.org/previews/413/413201_2559515-hq.mp3 | `assets/fanfarria-joepayne-413201.mp3` |
| Depósito menor de 60000 | wah wah sad trombone.wav — kirbydx | https://freesound.org/people/kirbydx/sounds/175409/ | https://cdn.freesound.org/previews/175/175409_1326576-hq.mp3 | `assets/triste-kirbydx-175409.mp3` |

Ambas fichas identifican la licencia **Creative Commons 0 (CC0 1.0)** y enlazan a https://creativecommons.org/publicdomain/zero/1.0/. Permite copiar, modificar y distribuir, incluido uso comercial. Esta referencia conserva la procedencia aunque CC0 no exige atribución.

Descarga HTTP 200 y MIME `audio/mpeg` para ambas; MP3 estéreo a 44100 Hz.

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| fanfarria | 108599 | `2dd2a48d189bb3057ab859461574dcbd73dab1445b5da7b934174f440083192b` |
| triste | 120891 | `de4a029a0537dbecaf49b4936b0969919f5b7b54083d3859d584b5c4cc7dee3d` |

Decodificación completa a PCM mediante FFmpeg: fanfarria 201071 fotogramas / 44100 Hz (4.55943 s); triste 229550 / 44100 Hz (5.20522 s). Las duraciones de contenedor MP3 incluyen relleno y son ligeramente mayores.

Análisis con `ffmpeg -af volumedetect`: media/pico originales −25.7/−5.5 dBFS (fanfarria) y −19.0/−3.2 dBFS (triste). Ganancia de reproducción: 0.8 y 0.37 respectivamente; iguala aproximadamente la media a −27.6 dBFS con margen antes de clipping. No hay reproducción simultánea: una solicitud nueva detiene y desconecta las fuentes previas.

El rango inclusivo 60000–100000 conserva las tres notas del sonido anterior. No se cambian cálculo, redondeo ni interfaz. Los MP3 se incluyen en la caché offline v7; no se pide ningún audio a Freesound durante el uso de la app.

Reproducir pruebas: `python3 pruebas/ejecutar.py` y `python3 pruebas/titulo.py --index-only`. Las pruebas automatizadas usan Web Audio/DOM simulados; la escucha física y un iPhone real requieren comprobación aparte.
