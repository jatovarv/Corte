/* Efectos locales: grabaciones elegidas y sonido intermedio sin dependencias externas. */
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
    var recordings = {
      triste: { src: 'assets/triste-kirbydx-175409.mp3', volume: 0.37 },
      fanfarria: { src: 'assets/fanfarria-joepayne-413201.mp3', volume: 0.8 }
    };
    var buffers = {};
    var loading = {};

    function limpiar(voice) {
      if (voice.cleaned) return;
      voice.cleaned = true;
      if (voice.source) voice.source.onended = null;
      [voice.source, voice.gain].forEach(function (node) {
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
        if (voice.source) try { voice.source.stop(now); } catch (error) { /* Puede haber terminado. */ }
        limpiar(voice);
      });
    }

    function nota(frequency, at) {
      var voice = { source: null, gain: null, cleaned: false };
      voices.push(voice);
      try {
        var oscillator = voice.source = context.createOscillator();
        var gain = voice.gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, at);
        oscillator.connect(gain);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.045, at + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.23);
        gain.connect(context.destination);
        oscillator.onended = function () { limpiar(voice); };
        oscillator.start(at);
        oscillator.stop(at + 0.25);
      } catch (error) {
        limpiar(voice);
        throw error;
      }
    }

    function cargar(tipo) {
      if (buffers[tipo]) return Promise.resolve(buffers[tipo]);
      if (loading[tipo]) return loading[tipo];
      var decoder = context;
      var pending = Promise.resolve().then(function () {
        return fetch(recordings[tipo].src);
      }).then(function (response) {
        if (!response.ok) throw new Error('No se pudo abrir la grabación: ' + response.status);
        return response.arrayBuffer();
      }).then(function (data) {
        return decoder.decodeAudioData(data);
      }).then(function (buffer) {
        buffers[tipo] = buffer;
        delete loading[tipo];
        return buffer;
      }).catch(function (error) {
        delete loading[tipo];
        throw error;
      });
      loading[tipo] = pending;
      return pending;
    }

    function grabacion(tipo, buffer, at) {
      var voice = { source: null, gain: null, cleaned: false };
      voices.push(voice);
      try {
        var source = voice.source = context.createBufferSource();
        var gain = voice.gain = context.createGain();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(context.destination);
        gain.gain.setValueAtTime(recordings[tipo].volume, at);
        source.onended = function () { limpiar(voice); };
        source.start(at);
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
          var decoded = recordings[tipo] ? cargar(tipo) : Promise.resolve(null);
          return Promise.all([ready, decoded]).then(function (results) {
            if (ticket !== generation) return false;
            if (context.state !== 'running') throw new Error('Audio no iniciado');
            var start = context.currentTime + 0.015;
            if (recordings[tipo]) {
              grabacion(tipo, results[1], start);
            } else {
              [1318.51, 1760, 2637.02].forEach(function (frequency, i) { nota(frequency, start + i * 0.055); });
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
