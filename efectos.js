/* Efectos locales: sin librerías, descargas ni peticiones externas. */
var CorteEfectos = (function () {
  'use strict';
  function crearAudio(Context) {
    var context;
    return {
      disponible: typeof Context === 'function',
      reproducir: function () {
        if (typeof Context !== 'function') return Promise.reject(new Error('Audio no disponible'));
        try {
          if (!context || context.state === 'closed') context = new Context();
          var ready = context.state === 'running' ? Promise.resolve() : context.resume();
          return Promise.resolve(ready).then(function () {
            if (context.state !== 'running') throw new Error('Audio no iniciado');
            var start = context.currentTime + 0.015;
            [1318.51, 1760, 2637.02].forEach(function (frequency, i) {
              var oscillator = context.createOscillator();
              var gain = context.createGain();
              var at = start + i * 0.055;
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(frequency, at);
              gain.gain.setValueAtTime(0, at);
              gain.gain.linearRampToValueAtTime(0.045, at + 0.006);
              gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.23);
              oscillator.connect(gain);
              gain.connect(context.destination);
              oscillator.onended = function () { oscillator.disconnect(); gain.disconnect(); };
              oscillator.start(at);
              oscillator.stop(at + 0.25);
            });
          });
        } catch (error) { return Promise.reject(error); }
      }
    };
  }
  return Object.freeze({ crearAudio: crearAudio });
}());
