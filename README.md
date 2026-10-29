# Calculadora Legendaria 💸

Aplicación estática. La interfaz y los recursos corresponden a la candidata aprobada.

## Publicación

GitHub Pages debe usar la rama `main` y la carpeta `/`. `_config.yml` excluye del sitio las pruebas, documentos técnicos y fotografías originales sin optimizar. Los originales permanecen en el repositorio; la aplicación utiliza las cinco copias de `assets/`.

El service worker precarga el HTML, estilos, scripts, manifiesto, iconos, fotografías e ilustración. Al cambiar recursos de la aplicación, actualizar también `VERSION` en `sw.js`.

## Verificación

En macOS, con Python 3 y JavaScriptCore:

```sh
python3 pruebas/ejecutar.py
python3 pruebas/titulo.py --index-only
```

Las pruebas comparan los cinco importes con la función original, conservan su redondeo y cubren errores de audio, entradas inválidas, repetición, reducción de movimiento y recursos locales. Para un depósito de `53600`, la participación mostrada es `$22,410.34`.

La fórmula conserva esta secuencia: extraer la base mediante `X / 1.16`, descontar el 3% de esa base y dividir el subtotal entre dos. No se aplica un ajuste adicional de centavos.

El workflow de validación ejecuta estas pruebas en cada PR y cambio de `main`. La publicación de Pages se comprueba por separado mediante su build, commit publicado y comparación HTTP de los archivos.
