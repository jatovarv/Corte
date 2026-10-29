/* Ejecutar: osascript -l JavaScript pruebas/audio.js .
   Ejecuta efectos.js real con Web Audio/fetch simulados y promesas reales.
   No usa red ni emite sonido. No demuestra decodificación o escucha física/iPhone. */
ObjC.import('Foundation');

function run(argv) {
  var root=argv[0] || $.NSFileManager.defaultManager.currentDirectoryPath.js;
  function read(path){return $.NSString.stringWithContentsOfFileEncodingError(path,$.NSUTF8StringEncoding,null).js;}
  var source=read(root+'/efectos.js');
  function loadEffects(fetcher){return new Function('fetch',source+'\nreturn CorteEfectos;')(fetcher);}
  var effects=loadEffects();
  var core=new Function(read(root+'/core.js')+'\nreturn CorteCore;')();
  var checks=[];
  var cases=[];
  var paths={triste:'assets/triste-kirbydx-175409.mp3',fanfarria:'assets/fanfarria-joepayne-413201.mp3'};
  function check(name,pass,detail){checks.push({prueba:name,pasa:!!pass,detalle:detail===undefined?null:detail});}
  function until(test,label,remaining){
    if(test()) return Promise.resolve();
    if(remaining===undefined) remaining=40;
    if(!remaining) return Promise.reject(new Error('No llegó la fase: '+label));
    return Promise.resolve().then(function(){return until(test,label,remaining-1);});
  }
  function fixture(options){
    options=options || {};
    var log={contexts:0,resumes:0,oscillators:[],sources:[],gains:[],starts:[],stops:[],fetches:[],decodes:[]};
    var instances=[],resumes=[],fetches=[],decodes=[];
    function Param(){this.value=0;this.events=[];}
    ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime'].forEach(function(method){Param.prototype[method]=function(value,at){this.value=value;this.events.push({method:method,value:value,at:at});};});
    Param.prototype.cancelScheduledValues=function(at){this.events.push({method:'cancelScheduledValues',at:at});};
    function node(kind){return {kind:kind,disconnected:0,connect:function(target){this.target=target;return target;},disconnect:function(){this.disconnected++;}};}
    function soundNode(kind){
      var sound=node(kind);
      sound.start=function(at){log.starts.push({node:sound,at:at});};
      // Programar stop no dispara onended hasta que la prueba avanza el final.
      sound.stop=function(at){log.stops.push({node:sound,at:at});};
      return sound;
    }
    function Context(){log.contexts++;this.state=options.initial || 'running';this.currentTime=10;this.destination={};instances.push(this);}
    Context.prototype.resume=function(){
      log.resumes++;
      var context=this;
      if(options.resume==='reject') return Promise.reject(new Error('Resume rechazado'));
      if(options.resume==='pending') return new Promise(function(resolve,reject){resumes.push({context:context,resolve:resolve,reject:reject});});
      if(options.resume!=='suspended') this.state='running';
      return Promise.resolve();
    };
    Context.prototype.createOscillator=function(){
      if(options.failOnOscillator===log.oscillators.length+1) throw new Error('Oscilador no disponible');
      var oscillator=soundNode('oscillator');oscillator.frequency=new Param();log.oscillators.push(oscillator);return oscillator;
    };
    Context.prototype.createBufferSource=function(){
      if(options.failBufferSource) throw new Error('BufferSource no disponible');
      var bufferSource=soundNode('buffer');log.sources.push(bufferSource);return bufferSource;
    };
    Context.prototype.createGain=function(){var gain=node('gain');gain.gain=new Param();log.gains.push(gain);return gain;};
    Context.prototype.decodeAudioData=function(data){
      log.decodes.push(data.sampleUrl);
      var buffer={duration:1.4,sampleUrl:data.sampleUrl};
      if(options.decode==='reject') return Promise.reject(new Error('Decodificación fallida'));
      if(options.decode==='pending') return new Promise(function(resolve,reject){decodes.push({buffer:buffer,resolve:resolve,reject:reject});});
      return Promise.resolve(buffer);
    };
    function response(url){return {ok:options.fetchMode!=='http',status:options.fetchMode==='http'?404:200,arrayBuffer:function(){
      if(options.fetchMode==='body') return Promise.reject(new Error('Lectura del cuerpo fallida'));
      var data=new ArrayBuffer(8);data.sampleUrl=url;return Promise.resolve(data);
    }};}
    function fetcher(url){
      log.fetches.push(url);
      if(options.fetchMode==='reject') return Promise.reject(new Error('Red no disponible'));
      if(options.fetchMode==='pending') return new Promise(function(resolve,reject){fetches.push({url:url,resolve:resolve,reject:reject});});
      return Promise.resolve(response(url));
    }
    return {Context:Context,log:log,instances:instances,options:options,effects:loadEffects(fetcher),
      pendingFetches:fetches,pendingDecodes:decodes,
      resolveFetches:function(){fetches.splice(0).forEach(function(item){item.resolve(response(item.url));});},
      rejectFetches:function(){fetches.splice(0).forEach(function(item){item.reject(new Error('Petición tardía fallida'));});},
      resolveDecodes:function(){decodes.splice(0).forEach(function(item){item.resolve(item.buffer);});},
      resolveResumes:function(){resumes.splice(0).forEach(function(item){item.context.state='running';item.resolve();});},
      rejectResumes:function(){resumes.splice(0).forEach(function(item){item.reject(new Error('Resume tardío fallido'));});},
      finish:function(){log.oscillators.concat(log.sources).forEach(function(sound){if(sound.onended) sound.onended();});}
    };
  }
  function assertCancellation(name,f){
    check(name+': detiene cada fuente inmediatamente',f.log.oscillators.concat(f.log.sources).every(function(sound){return f.log.stops.some(function(stop){return stop.node===sound && stop.at===10;});}));
    check(name+': cancela automatización y pone ganancia a cero',f.log.gains.every(function(gain){return gain.gain.events.some(function(e){return e.method==='cancelScheduledValues';}) && gain.gain.events[gain.gain.events.length-1].value===0;}));
    check(name+': desconecta cada fuente y ganancia una vez',f.log.oscillators.concat(f.log.sources,f.log.gains).every(function(node){return node.disconnected===1;}));
  }
  [[0,'triste'],[59999.99,'triste'],[60000,'actual'],[60000.01,'actual'],[99999.99,'actual'],[100000,'actual'],[100000.01,'fanfarria']].forEach(function(item){check('Selector por depósito '+item[0],effects.sonidoParaDeposito(item[0])===item[1],item[1]);});
  [-1,NaN,Infinity,-Infinity,'60000','',null,undefined,true,{},new Number(60000)].forEach(function(value){check('Selector rechaza '+String(value)+' ('+typeof value+')',effects.sonidoParaDeposito(value)===null);});

  var normal=fixture(),normalPlayer=normal.effects.crearAudio(normal.Context);
  cases.push(normalPlayer.reproducir().then(function(played){
    check('Sin argumento conserva sonido actual de tres notas',played===true && normal.log.oscillators.length===3 && normal.log.sources.length===0 && normal.log.oscillators.every(function(node){return node.type==='sine';}));
    check('Sonido actual conserva frecuencias y no solicita grabaciones',JSON.stringify(normal.log.oscillators.map(function(node){return node.frequency.events[0].value;}))===JSON.stringify([1318.51,1760,2637.02]) && normal.log.fetches.length===0 && normal.log.decodes.length===0);
    normal.finish();
    check('Final natural del sonido actual desconecta cada nodo',normal.log.oscillators.concat(normal.log.gains).every(function(node){return node.disconnected===1;}));
    return normalPlayer.reproducir('actual');
  }).then(function(played){check('Sonido actual repetido reutiliza contexto',played===true && normal.log.contexts===1 && normal.log.oscillators.length===6);}));
  ['triste','fanfarria'].forEach(function(type){
    var f=fixture(),player=f.effects.crearAudio(f.Context);
    cases.push(player.reproducir(type).then(function(played){
      check(type+': reproduce la grabación local exacta sin sintetizarla',played===true && f.log.sources.length===1 && f.log.oscillators.length===0 && f.log.fetches[0]===paths[type] && f.log.sources[0].buffer.sampleUrl===paths[type]);
      check(type+': usa su volumen previsto',f.log.gains[0].gain.events[0].value===(type==='triste'?0.37:0.8));
      f.finish();
      check(type+': final natural desconecta fuente y ganancia',f.log.sources[0].disconnected===1 && f.log.gains[0].disconnected===1);
      return player.reproducir(type);
    }).then(function(played){check(type+': reutiliza buffer decodificado con fuente nueva',played===true && f.log.fetches.length===1 && f.log.decodes.length===1 && f.log.sources.length===2);}));
  });
  [null,'desconocido','',60000].forEach(function(type){var f=fixture();cases.push(f.effects.crearAudio(f.Context).reproducir(type).then(function(played){check('Tipo inválido no inicia contexto ni fetch: '+String(type),played===false && f.log.contexts===0 && f.log.fetches.length===0);}));});
  var missing=effects.crearAudio(undefined);
  check('Disponibilidad detectada sin construir contexto',effects.crearAudio(fixture().Context).disponible===true && missing.disponible===false);
  var stopped=fixture(),stoppable=stopped.effects.crearAudio(stopped.Context);
  stoppable.detener();stoppable.detener();
  cases.push(stoppable.reproducir('triste').then(function(){
    stoppable.detener();assertCancellation('detener grabación',stopped);
    var stops=stopped.log.stops.length;stoppable.detener();check('detener es idempotente',stopped.log.stops.length===stops && stopped.log.sources[0].disconnected===1);
  }));
  var repeat=fixture(),repeatPlayer=repeat.effects.crearAudio(repeat.Context);
  cases.push(repeatPlayer.reproducir('triste').then(function(){return repeatPlayer.reproducir('fanfarria');}).then(function(played){
    check('Repetir otro tipo detiene la grabación anterior',played===true && repeat.log.sources.length===2 && repeat.log.sources[0].disconnected===1 && repeat.log.sources[1].disconnected===0);
    return repeatPlayer.reproducir(null);
  }).then(function(played){check('Tipo inválido cancela también la grabación activa',played===false && repeat.log.sources.every(function(node){return node.disconnected===1;}));}));
  var closed=fixture(),closedPlayer=closed.effects.crearAudio(closed.Context);
  cases.push(closedPlayer.reproducir('actual').then(function(){closed.instances[0].state='closed';return closedPlayer.reproducir('actual');}).then(function(played){check('Contexto cerrado se recrea',played===true && closed.log.contexts===2 && closed.log.oscillators.length===6);}));

  var pendingResume=fixture({initial:'suspended',resume:'pending'}),resumePlayer=pendingResume.effects.crearAudio(pendingResume.Context);
  var resumeResult=resumePlayer.reproducir('triste');
  check('Resume se solicita inmediatamente, sin esperar la grabación',pendingResume.log.resumes===1 && pendingResume.log.fetches.length===0);
  check('Carga o resume pendientes no bloquean cálculo',core.calcularImporte(116).porSocio===48.5 && pendingResume.log.starts.length===0);
  cases.push(until(function(){return pendingResume.log.decodes.length===1;},'decode antes de resume').then(function(){resumePlayer.detener();pendingResume.resolveResumes();return resumeResult;}).then(function(played){check('detener invalida resume pendiente con buffer preparado',played===false && pendingResume.log.starts.length===0);}));
  var resumed=fixture({initial:'suspended'});
  cases.push(resumed.effects.crearAudio(resumed.Context).reproducir('fanfarria').then(function(played){check('Resume y carga completos permiten la grabación',played===true && resumed.log.resumes===1 && resumed.log.sources.length===1);}));
  var lateResume=fixture({initial:'suspended',resume:'pending'}),lateResumePlayer=lateResume.effects.crearAudio(lateResume.Context);
  var lateResumeResult=lateResumePlayer.reproducir('actual');lateResumePlayer.detener();lateResume.rejectResumes();
  cases.push(lateResumeResult.then(function(played){check('Rechazo tardío de resume cancelado devuelve false',played===false && lateResume.log.starts.length===0);}));

  var pendingFetch=fixture({fetchMode:'pending'}),fetchPlayer=pendingFetch.effects.crearAudio(pendingFetch.Context);
  var fetchResult=fetchPlayer.reproducir('triste');
  cases.push(until(function(){return pendingFetch.pendingFetches.length===1;},'fetch pendiente').then(function(){fetchPlayer.detener();pendingFetch.resolveFetches();return fetchResult;}).then(function(played){check('detener invalida fetch pendiente',played===false && pendingFetch.log.starts.length===0);}));
  var pendingDecode=fixture({decode:'pending'}),decodePlayer=pendingDecode.effects.crearAudio(pendingDecode.Context);
  var decodeResult=decodePlayer.reproducir('fanfarria');
  cases.push(until(function(){return pendingDecode.pendingDecodes.length===1;},'decode pendiente').then(function(){decodePlayer.detener();pendingDecode.resolveDecodes();return decodeResult;}).then(function(played){check('detener invalida decode pendiente',played===false && pendingDecode.log.starts.length===0);}));
  var shared=fixture({fetchMode:'pending'}),sharedPlayer=shared.effects.crearAudio(shared.Context);
  var sharedFirst=sharedPlayer.reproducir('triste'),sharedLatest=sharedPlayer.reproducir('triste');
  cases.push(until(function(){return shared.pendingFetches.length===1;},'petición compartida').then(function(){shared.resolveFetches();return Promise.all([sharedFirst,sharedLatest]);}).then(function(results){check('Repetición durante carga comparte petición y solo reproduce la última',results[0]===false && results[1]===true && shared.log.fetches.length===1 && shared.log.decodes.length===1 && shared.log.sources.length===1);}));
  var previous=fixture({fetchMode:'pending'}),previousPlayer=previous.effects.crearAudio(previous.Context);
  var previousResult=previousPlayer.reproducir('triste');
  cases.push(until(function(){return previous.pendingFetches.length===1;},'petición obsoleta').then(function(){return previousPlayer.reproducir('actual');}).then(function(){previous.rejectFetches();return previousResult;}).then(function(played){check('Fallo de carga anterior no detiene sonido actual nuevo',played===false && previous.log.oscillators.length===3 && previous.log.oscillators.every(function(node){return node.disconnected===0;}) && previous.log.sources.length===0);}));

  function expectFailure(name,player,type,f){return player.reproducir(type).then(function(){check(name,false,'Se resolvió inesperadamente');},function(error){check(name,error instanceof Error && (!f || f.log.starts.length===0));check(name+': cálculo independiente',core.calcularImporte(116).porSocio===48.5);});}
  cases.push(expectFailure('API de audio ausente',missing,'actual'));
  cases.push(expectFailure('Constructor fallido',effects.crearAudio(function(){throw new Error('Constructor rechazado');}),'actual'));
  var rejected=fixture({initial:'suspended',resume:'reject'});
  cases.push(expectFailure('Resume rechazado',rejected.effects.crearAudio(rejected.Context),'actual',rejected));
  var suspended=fixture({initial:'suspended',resume:'suspended'});
  cases.push(expectFailure('Resume sigue suspendido',suspended.effects.crearAudio(suspended.Context),'actual',suspended));
  [{name:'Fallo de red',options:{fetchMode:'reject'}},{name:'Fallo del cuerpo',options:{fetchMode:'body'}},{name:'Fallo de decodificación',options:{decode:'reject'}},{name:'Fallo al crear BufferSource',options:{failBufferSource:true}}].forEach(function(item){var f=fixture(item.options);cases.push(expectFailure(item.name,f.effects.crearAudio(f.Context),'triste',f));});
  var http=fixture({fetchMode:'http'}),httpPlayer=http.effects.crearAudio(http.Context);
  cases.push(httpPlayer.reproducir('triste').then(function(){check('HTTP fallido se rechaza',false);},function(error){
    check('HTTP fallido se rechaza antes de decodificar',error instanceof Error && http.log.decodes.length===0 && http.log.starts.length===0);
    http.options.fetchMode='ok';return httpPlayer.reproducir('triste').then(function(played){check('HTTP fallido permite reintentar sin caché de error',played===true && http.log.fetches.length===2 && http.log.decodes.length===1 && http.log.sources.length===1);});
  }));
  var partial=fixture({failOnOscillator:2});
  cases.push(partial.effects.crearAudio(partial.Context).reproducir('actual').then(function(){check('Fallo parcial limpia voces',false);},function(error){check('Fallo parcial detectado',error instanceof Error && partial.log.starts.length===1);assertCancellation('Fallo parcial',partial);}));
  check('Sintaxis app y service worker válida',!!new Function(read(root+'/app.js')) && !!new Function(read(root+'/sw.js')));
  function finish(unexpected){
    if(unexpected) check('Sin errores inesperados del harness',false,String(unexpected));
    var failed=checks.filter(function(test){return !test.pasa;});
    var result={tipo:'efectos.js real con Web Audio, fetch y decode simulados; sin descarga, escucha física ni iPhone',total:checks.length,aprobadas:checks.length-failed.length,fallidas:failed.length,pruebas:checks};
    var output=JSON.stringify(result,null,2);
    $.NSString.alloc.initWithUTF8String(output).writeToFileAtomicallyEncodingError(root+'/pruebas/resultados-audio.json',true,$.NSUTF8StringEncoding,null);console.log(output);
  }
  Promise.all(cases).then(function(){finish();},finish);
  return 'Pruebas de audio programadas; resultado en pruebas/resultados-audio.json';
}
