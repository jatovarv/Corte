/* Ejecutar: osascript -l JavaScript pruebas/audio.js .
   Ejecuta efectos.js real con Web Audio simulado y promesas reales.
   No emite sonido ni controla aplicaciones. No demuestra escucha física/iPhone. */
ObjC.import('Foundation');

function run(argv) {
  var root = argv[0] || $.NSFileManager.defaultManager.currentDirectoryPath.js;
  var read = function(path) { return $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js; };
  var effects = new Function(read(root + '/efectos.js') + '\nreturn CorteEfectos;')();
  var core = new Function(read(root + '/core.js') + '\nreturn CorteCore;')();
  var checks = [];
  function check(name, pass, detail) { checks.push({ prueba:name, pasa:!!pass, detalle:detail === undefined ? null : detail }); }
  function fixture(options) {
    options = options || {};
    var log = { contexts:0, resumes:0, oscillators:[], gains:[], filters:[], starts:[], stops:[] };
    var instances = [];
    var pending = [];
    function Param(value) { this.value = value || 0; this.events = []; }
    ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime'].forEach(function(method) {
      Param.prototype[method] = function(value, at) { this.value=value; this.events.push({ method:method, value:value, at:at }); };
    });
    Param.prototype.cancelScheduledValues = function(at) { this.events.push({ method:'cancelScheduledValues', at:at }); };
    function node(kind) {
      return { kind:kind, disconnected:0, connect:function(target){this.target=target;return target;}, disconnect:function(){this.disconnected++;} };
    }
    function Context() {
      log.contexts++;
      this.state=options.initial || 'running';
      this.currentTime=10;
      this.destination={};
      instances.push(this);
    }
    Context.prototype.resume=function() {
      log.resumes++;
      var context=this;
      if (options.resume==='reject') return Promise.reject(new Error('Resume rechazado'));
      if (options.resume==='pending') return new Promise(function(resolve,reject){pending.push({context:context,resolve:resolve,reject:reject});});
      if (options.resume!=='suspended') this.state='running';
      return Promise.resolve();
    };
    Context.prototype.createOscillator=function() {
      if (options.failOnOscillator===log.oscillators.length+1) throw new Error('Oscilador no disponible');
      var oscillator=node('oscillator');
      oscillator.frequency=new Param();
      oscillator.start=function(at){log.starts.push({oscillator:oscillator,at:at});};
      // Un stop futuro programa el final; no dispara onended sin avanzar el reloj.
      oscillator.stop=function(at){log.stops.push({oscillator:oscillator,at:at});};
      log.oscillators.push(oscillator);
      return oscillator;
    };
    Context.prototype.createGain=function() {
      var gain=node('gain');
      gain.gain=new Param();
      log.gains.push(gain);
      return gain;
    };
    Context.prototype.createBiquadFilter=function() {
      var filter=node('filter');
      filter.frequency=new Param();
      filter.Q=new Param();
      log.filters.push(filter);
      return filter;
    };
    return {
      Context:Context, log:log, instances:instances,
      resolveResumes:function(){pending.splice(0).forEach(function(item){item.context.state='running';item.resolve();});},
      rejectResumes:function(){pending.splice(0).forEach(function(item){item.reject(new Error('Resume pendiente rechazado'));});},
      finish:function(){log.oscillators.forEach(function(oscillator){if(oscillator.onended) oscillator.onended();});}
    };
  }
  var cases=[];
  [
    [0,'triste'], [59999.99,'triste'], [60000,'actual'], [60000.01,'actual'],
    [99999.99,'actual'], [100000,'actual'], [100000.01,'fanfarria']
  ].forEach(function(item){check('Selector por depósito '+item[0],effects.sonidoParaDeposito(item[0])===item[1],item[1]);});
  [-1,NaN,Infinity,-Infinity,'60000','',null,undefined,true,{},new Number(60000)].forEach(function(value){
    check('Selector rechaza '+String(value)+' ('+typeof value+')',effects.sonidoParaDeposito(value)===null);
  });

  function assertCancellation(name, fixture) {
    var log=fixture.log;
    check(name+': detiene todas las voces inmediatamente', log.oscillators.every(function(oscillator){return log.stops.some(function(stop){return stop.oscillator===oscillator && stop.at===10;});}));
    check(name+': cancela automatización y deja ganancia en cero',log.gains.every(function(gain){return gain.gain.events.some(function(event){return event.method==='cancelScheduledValues' && event.at===10;}) && gain.gain.events[gain.gain.events.length-1].value===0;}));
    check(name+': desconecta osciladores, filtros y ganancias',log.oscillators.concat(log.filters,log.gains).every(function(node){return node.disconnected===1;}));
  }

  ['actual','triste','fanfarria'].forEach(function(type){
    var f=fixture();
    var player=effects.crearAudio(f.Context);
    cases.push(player.reproducir(type).then(function(played){
      var expected=type==='actual'?3:type==='triste'?4:8;
      check(type+': devuelve true y programa cantidad prevista de notas',played===true && f.log.starts.length===expected && f.log.stops.length===expected);
      check(type+': usa el timbre previsto',f.log.oscillators.every(function(oscillator){return oscillator.type===(type==='actual'?'sine':'sawtooth');}) && f.log.filters.length===(type==='actual'?0:expected));
      if(type==='actual') check('Sonido actual conserva sus tres frecuencias',JSON.stringify(f.log.oscillators.map(function(oscillator){return oscillator.frequency.events[0].value;}))===JSON.stringify([1318.51,1760,2637.02]));
      if(type==='triste') {
        var last=f.log.oscillators[f.log.oscillators.length-1];
        check('Triste termina con glissando descendente',last.frequency.events.some(function(event){return event.method==='linearRampToValueAtTime' && event.value<last.frequency.events[0].value;}));
      }
      if(type==='fanfarria') check('Fanfarria incluye acorde simultáneo',f.log.starts.filter(function(start){return start.at===f.log.starts[f.log.starts.length-1].at;}).length>=3);
      f.finish();
      check(type+': final natural desconecta cada nodo una vez',f.log.oscillators.concat(f.log.filters,f.log.gains).every(function(node){return node.disconnected===1;}));
    }));
  });

  var defaults=fixture();
  cases.push(effects.crearAudio(defaults.Context).reproducir().then(function(played){check('Sin argumento conserva preview actual',played===true && defaults.log.starts.length===3 && defaults.log.filters.length===0);}));
  [null,'desconocido','',60000].forEach(function(type){
    var f=fixture();
    cases.push(effects.crearAudio(f.Context).reproducir(type).then(function(played){check('Tipo inválido no inicia contexto: '+String(type),played===false && f.log.contexts===0 && f.log.starts.length===0);}));
  });

  var stopped=fixture();
  var stoppable=effects.crearAudio(stopped.Context);
  stoppable.detener();
  stoppable.detener();
  cases.push(stoppable.reproducir('triste').then(function(){
    stoppable.detener();
    assertCancellation('detener',stopped);
    var snapshot=JSON.stringify({stops:stopped.log.stops.length,disconnects:stopped.log.oscillators.map(function(node){return node.disconnected;})});
    stoppable.detener();
    check('detener es idempotente antes y después de reproducir',snapshot===JSON.stringify({stops:stopped.log.stops.length,disconnects:stopped.log.oscillators.map(function(node){return node.disconnected;})}));
  }));

  var repeat=fixture();
  var repeatPlayer=effects.crearAudio(repeat.Context);
  cases.push(repeatPlayer.reproducir('triste').then(function(){
    var first=repeat.log.oscillators.slice();
    return repeatPlayer.reproducir('fanfarria').then(function(played){
      check('Repetir sustituye las notas anteriores sin superponer voces',played===true && repeat.log.contexts===1 && repeat.log.starts.length===12 && first.every(function(node){return node.disconnected===1;}) && repeat.log.oscillators.slice(4).every(function(node){return node.disconnected===0;}));
      return repeatPlayer.reproducir(null).then(function(cancelled){check('Tipo inválido también cancela la reproducción anterior',cancelled===false && repeat.log.oscillators.every(function(node){return node.disconnected===1;}));});
    });
  }));

  var resume=fixture({initial:'suspended'});
  cases.push(effects.crearAudio(resume.Context).reproducir('actual').then(function(played){check('Contexto suspendido se reanuda y programa audio',played===true && resume.log.resumes===1 && resume.log.starts.length===3);}));
  var closed=fixture();
  var closedPlayer=effects.crearAudio(closed.Context);
  cases.push(closedPlayer.reproducir().then(function(){closed.instances[0].state='closed';return closedPlayer.reproducir();}).then(function(played){check('Contexto cerrado se recrea',played===true && closed.log.contexts===2 && closed.log.starts.length===6);}));

  var pending=fixture({initial:'suspended',resume:'pending'});
  var pendingPlayer=effects.crearAudio(pending.Context);
  var pendingResult=pendingPlayer.reproducir('triste');
  check('Resume pendiente no bloquea cálculo ni programa notas',core.calcularImporte(116).porSocio===48.5 && pending.log.starts.length===0 && typeof pendingResult.then==='function');
  pendingPlayer.detener();
  pending.resolveResumes();
  cases.push(pendingResult.then(function(played){check('detener invalida un resume pendiente',played===false && pending.log.starts.length===0);}));

  var race=fixture({initial:'suspended',resume:'pending'});
  var racePlayer=effects.crearAudio(race.Context);
  var firstRace=racePlayer.reproducir('triste');
  var latestRace=racePlayer.reproducir('fanfarria');
  race.resolveResumes();
  cases.push(Promise.all([firstRace,latestRace]).then(function(results){check('Resumes fuera de turno solo programan la última petición',results[0]===false && results[1]===true && race.log.starts.length===8 && race.log.contexts===1);}));

  var cancelledReject=fixture({initial:'suspended',resume:'pending'});
  var cancelledPlayer=effects.crearAudio(cancelledReject.Context);
  var cancelledPromise=cancelledPlayer.reproducir('triste');
  cancelledPlayer.detener();
  cancelledReject.rejectResumes();
  cases.push(cancelledPromise.then(function(played){check('Rechazo tardío de una petición cancelada devuelve false',played===false && cancelledReject.log.starts.length===0);}));

  function expectFailure(name, player, f) {
    return player.reproducir('actual').then(function(){check(name,false,'Se resolvió inesperadamente');},function(error){
      check(name,error instanceof Error && (!f || f.log.starts.length===0));
      check(name+': cálculo independiente',core.calcularImporte(116).porSocio===48.5);
    });
  }
  var missing=effects.crearAudio(undefined);
  check('Disponibilidad detectada sin construir contexto',effects.crearAudio(fixture().Context).disponible===true && missing.disponible===false);
  cases.push(expectFailure('API de audio ausente: fallo recuperable',missing));
  cases.push(expectFailure('Constructor fallido: fallo recuperable',effects.crearAudio(function(){throw new Error('Constructor rechazado');})));
  var rejected=fixture({initial:'suspended',resume:'reject'});
  cases.push(expectFailure('Resume rechazado sin programar notas',effects.crearAudio(rejected.Context),rejected));
  var suspended=fixture({initial:'suspended',resume:'suspended'});
  cases.push(expectFailure('Resume que sigue suspendido no programa notas',effects.crearAudio(suspended.Context),suspended));
  var partial=fixture({failOnOscillator:2});
  cases.push(effects.crearAudio(partial.Context).reproducir('actual').then(function(){check('Fallo a mitad de programación limpia voces',false);},function(error){
    check('Fallo a mitad de programación limpia voces',error instanceof Error && partial.log.starts.length===1);
    assertCancellation('Fallo parcial',partial);
  }));
  check('Sintaxis app y service worker válida',!!new Function(read(root+'/app.js')) && !!new Function(read(root+'/sw.js')));

  function finish(unexpected) {
    if(unexpected) check('Sin errores inesperados del harness',false,String(unexpected));
    var failed=checks.filter(function(test){return !test.pasa;});
    var result={tipo:'efectos.js real con Web Audio simulado y promesas reales; sin escucha física ni iPhone',total:checks.length,aprobadas:checks.length-failed.length,fallidas:failed.length,pruebas:checks};
    var output=JSON.stringify(result,null,2);
    $.NSString.alloc.initWithUTF8String(output).writeToFileAtomicallyEncodingError(root+'/pruebas/resultados-audio.json',true,$.NSUTF8StringEncoding,null);
    console.log(output);
  }
  Promise.all(cases).then(function(){finish();},finish);
  return 'Pruebas de audio programadas; resultado en pruebas/resultados-audio.json';
}
