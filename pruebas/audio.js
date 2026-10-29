/* Ejecutar desde Corte-prueba: osascript -l JavaScript pruebas/audio.js .
   Prueba el código real de efectos con un AudioContext simulado y promesas reales.
   No emite sonido ni controla aplicaciones. No demuestra salida audible física. */
ObjC.import('Foundation');

function run(argv) {
  var root = argv[0] || $.NSFileManager.defaultManager.currentDirectoryPath.js;
  var read = function(path) { return $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js; };
  var effects = new Function(read(root + '/efectos.js') + '\nreturn CorteEfectos;')();
  var core = new Function(read(root + '/core.js') + '\nreturn CorteCore;')();
  var checks = [];
  function check(name, pass, detail) { checks.push({ prueba:name, pasa:!!pass, detalle:detail || null }); }
  function fixture(initial, resumeMode, failNodes) {
    var log = { contexts:0, resume:0, starts:[], stops:[], disconnected:0 };
    var instances = [];
    function Context() {
      log.contexts++;
      this.state = initial;
      this.currentTime = 10;
      this.destination = {};
      instances.push(this);
    }
    Context.prototype.resume = function() {
      log.resume++;
      if (resumeMode === 'reject') return Promise.reject(new Error('Resume rechazado'));
      if (resumeMode === 'pending') return new Promise(function(){});
      if (resumeMode !== 'suspended') this.state = 'running';
      return Promise.resolve();
    };
    Context.prototype.createOscillator = function() {
      if (failNodes) throw new Error('Nodo no disponible');
      var oscillator = {
        frequency:{ setValueAtTime:function(){} },
        connect:function(){},
        disconnect:function(){log.disconnected++;},
        start:function(at){log.starts.push(at);},
        stop:function(at){log.stops.push(at); if (oscillator.onended) oscillator.onended();}
      };
      return oscillator;
    };
    Context.prototype.createGain = function() {
      return { gain:{ setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }, connect:function(){}, disconnect:function(){log.disconnected++;} };
    };
    return { Context:Context, log:log, instances:instances };
  }
  var cases = [];
  var running = fixture('running');
  var player = effects.crearAudio(running.Context);
  check('Audio disponible declarado', player.disponible);
  cases.push(player.reproducir().then(function() {
    check('Audio disponible programa efecto completo', running.log.starts.length === 3 && running.log.stops.length === 3);
    check('Los nodos se desconectan al terminar', running.log.disconnected === 6);
    return player.reproducir();
  }).then(function() {
    check('Audio repetido reutiliza contexto', running.log.contexts === 1 && running.log.starts.length === 6);
    running.instances[0].state = 'closed';
    return player.reproducir();
  }).then(function() {
    check('Contexto cerrado se recupera', running.log.contexts === 2 && running.log.starts.length === 9);
  }));

  var suspended = fixture('suspended', 'resolve');
  cases.push(effects.crearAudio(suspended.Context).reproducir().then(function() {
    check('Contexto suspendido se reanuda', suspended.log.resume === 1 && suspended.log.starts.length === 3);
  }));

  function expectRejection(name, testPlayer, log) {
    return testPlayer.reproducir().then(function() { check(name, false, 'Se resolvió inesperadamente'); }, function(error) {
      check(name, error instanceof Error && (!log || log.starts.length === 0));
      check(name + ': cálculo independiente', core.calcularImporte(116).porSocio === 48.5);
    });
  }
  var missing = effects.crearAudio(undefined);
  check('Audio ausente declarado', missing.disponible === false);
  cases.push(expectRejection('Sin API de audio: error recuperable', missing));
  cases.push(expectRejection('Constructor de audio falla: error recuperable', effects.crearAudio(function(){throw new Error('Constructor rechazado');})));
  var rejected = fixture('suspended', 'reject');
  cases.push(expectRejection('Resume rechazado: no se programan nodos', effects.crearAudio(rejected.Context), rejected.log));
  var stillSuspended = fixture('suspended', 'suspended');
  cases.push(expectRejection('Resume sin activación: no se programan nodos', effects.crearAudio(stillSuspended.Context), stillSuspended.log));
  var brokenNodes = fixture('running', 'resolve', true);
  cases.push(expectRejection('Fallo al crear nodo: error recuperable', effects.crearAudio(brokenNodes.Context), brokenNodes.log));

  var pending = fixture('suspended', 'pending');
  var pendingPromise = effects.crearAudio(pending.Context).reproducir();
  check('Audio pendiente devuelve promesa sin bloquear cálculo', typeof pendingPromise.then === 'function' && core.calcularImporte(116).porSocio === 48.5 && pending.log.starts.length === 0);
  check('Sintaxis JS de app y service worker válida', !!new Function(read(root + '/app.js')) && !!new Function(read(root + '/sw.js')));

  Promise.all(cases).then(function() {
    var failed = checks.filter(function(test){return !test.pasa;});
    var result = { tipo:'Prueba de lógica con AudioContext simulado; no es escucha física ni prueba de Safari/iPhone', total:checks.length, aprobadas:checks.length-failed.length, fallidas:failed.length, pruebas:checks };
    var output = JSON.stringify(result, null, 2);
    $.NSString.alloc.initWithUTF8String(output).writeToFileAtomicallyEncodingError(root + '/pruebas/resultados-audio.json', true, $.NSUTF8StringEncoding, null);
    console.log(output);
  }, function(error) {
    console.log('FALLO_INESPERADO: ' + String(error));
  });
  return 'Pruebas de audio programadas; resultado en pruebas/resultados-audio.json';
}
