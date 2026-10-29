/* Efectos locales: sin librerías, descargas ni peticiones externas. */
var CorteEfectos = (function () {
  'use strict';
  function sonidoParaDeposito(deposito) {
    if (typeof deposito !== 'number' || !Number.isFinite(deposito) || deposito < 0) return null;
    if (deposito > 100000) return 'fanfarria';
    if (deposito < 60000) return 'triste';
    return 'actual';
  }

  function crearAudio(Context) {
    var context;
    var voices = [];
    var generation = 0;

    function limpiar(voice) {
      if (voice.cleaned) return;
      voice.cleaned = true;
      if (voice.oscillator) voice.oscillator.onended = null;
      [voice.oscillator, voice.filter, voice.gain].forEach(function (node) {
        if (node) try { node.disconnect(); } catch (error) { /* Nodo ya desconectado. */ }
      });
      voices = voices.filter(function (item) { return item !== voice; });
    }

    function detener() {
      generation++;
      var pending = voices;
      voices = [];
      var now = context ? context.currentTime : 0;
      pending.forEach(function (voice) {
        try {
          if (voice.gain) {
            voice.gain.gain.cancelScheduledValues(now);
            voice.gain.gain.setValueAtTime(0, now);
          }
        } catch (error) { /* La desconexión también silencia un contexto cerrado. */ }
        if (voice.oscillator) try { voice.oscillator.stop(now); } catch (error) { /* Puede haber terminado. */ }
        limpiar(voice);
      });
    }

    function nota(frequency, at, duration, volume, brass, slideTo) {
      var voice = { oscillator: null, gain: null, filter: null, cleaned: false };
      voices.push(voice);
      try {
        var oscillator = voice.oscillator = context.createOscillator();
        var gain = voice.gain = context.createGain();
        oscillator.type = brass ? 'sawtooth' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, at);
        if (slideTo) {
          oscillator.frequency.setValueAtTime(frequency, at + 0.1);
          oscillator.frequency.linearRampToValueAtTime(slideTo, at + duration * 0.85);
        }
        if (brass) {
          var filter = voice.filter = context.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.value = 0.65;
          filter.frequency.setValueAtTime(Math.min(2400, frequency * 2.2), at);
          filter.frequency.linearRampToValueAtTime(Math.min(2400, frequency * 4.5), at + 0.05);
          filter.frequency.linearRampToValueAtTime(Math.min(2400, frequency * 2.2), at + duration);
          oscillator.connect(filter);
          filter.connect(gain);
        } else oscillator.connect(gain);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(volume, at + (brass ? 0.025 : 0.006));
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        gain.connect(context.destination);
        oscillator.onended = function () { limpiar(voice); };
        oscillator.start(at);
        oscillator.stop(at + duration + 0.02);
      } catch (error) {
        limpiar(voice);
        throw error;
      }
    }

    return {
      disponible: typeof Context === 'function',
      detener: detener,
      reproducir: function (tipo) {
        detener();
        if (tipo === undefined) tipo = 'actual';
        if (['actual', 'triste', 'fanfarria'].indexOf(tipo) === -1) return Promise.resolve(false);
        var ticket = generation;
        if (typeof Context !== 'function') return Promise.reject(new Error('Audio no disponible'));
        try {
          if (!context || context.state === 'closed') context = new Context();
          var ready = context.state === 'running' ? Promise.resolve() : context.resume();
          return Promise.resolve(ready).then(function () {
            if (ticket !== generation) return false;
            if (context.state !== 'running') throw new Error('Audio no iniciado');
            var start = context.currentTime + 0.015;
            if (tipo === 'triste') {
              [233.08, 220, 207.65, 196].forEach(function (frequency, i) {
                nota(frequency, start + i * 0.31, i === 3 ? 0.72 : 0.26, 0.065, true, i === 3 ? 146.83 : null);
              });
            } else if (tipo === 'fanfarria') {
              [0, 0.15, 0.30].forEach(function (offset) { nota(523.25, start + offset, 0.12, 0.05, true); });
              nota(783.99, start + 0.48, 0.16, 0.05, true);
              nota(1046.50, start + 0.70, 0.50, 0.035, true);
              [523.25, 659.25, 783.99].forEach(function (frequency) { nota(frequency, start + 0.70, 0.50, 0.018, true); });
            } else {
              [1318.51, 1760, 2637.02].forEach(function (frequency, i) { nota(frequency, start + i * 0.055, 0.23, 0.045, false); });
            }
            return true;
          }).catch(function (error) {
            if (ticket !== generation) return false;
            detener();
            throw error;
          });
        } catch (error) {
          detener();
          return Promise.reject(error);
        }
      }
    };
  }
  return Object.freeze({ crearAudio: crearAudio, sonidoParaDeposito: sonidoParaDeposito });
}());
