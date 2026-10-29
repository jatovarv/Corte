/* Ejecutar: osascript -l JavaScript pruebas/interfaz.js .
   Ejecuta app.js real con DOM, matchMedia y AudioContext simulados.
   No modifica la app ni preferencias del sistema. No sustituye pruebas visuales. */
ObjC.import('Foundation');

function run(argv) {
  var root = argv[0] || $.NSFileManager.defaultManager.currentDirectoryPath.js;
  function read(path) { return $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js; }
  var core = new Function(read(root + '/core.js') + '\nreturn CorteCore;')();
  var effects = new Function(read(root + '/efectos.js') + '\nreturn CorteEfectos;')();
  var source = read(root + '/app.js');
  var checks = [];
  function check(name, pass, detail) { checks.push({ prueba:name, pasa:!!pass, detalle:detail || null }); }
  function fixture(options) {
    var logs = [];
    var nodes = {};
    var timers = [];
    function Node() {
      this.hidden = false;
      this.textContent = '';
      this.children = [];
      this.attributes = {};
      this.events = {};
      this.classes = new Set();
      var self = this;
      this.classList = {
        add:function(){[].slice.call(arguments).forEach(function(c){self.classes.add(c);});},
        remove:function(){[].slice.call(arguments).forEach(function(c){self.classes.delete(c);});},
        toggle:function(c, enabled){if(enabled) self.classes.add(c); else self.classes.delete(c);}
      };
      this.style = { setProperty:function(){} };
      this.offsetWidth = 1;
    }
    Node.prototype.setAttribute = function(k,v){this.attributes[k]=v;};
    Node.prototype.removeAttribute = function(k){delete this.attributes[k];};
    Node.prototype.addEventListener = function(k,v){this.events[k]=v;};
    Node.prototype.focus = function(){this.focused=true;};
    Node.prototype.blur = function(){this.blurred=true;};
    Node.prototype.replaceChildren = function(){this.children=[];};
    Node.prototype.appendChild = function(child){this.children.push(child);};
    function get(id){if(!nodes[id]) nodes[id]=new Node(); return nodes[id];}
    get('valorBase').value = '116';
    get('resultado').hidden = true;
    get('inputError').hidden = true;
    get('soundNotice').hidden = true;
    get('installButton').hidden = true;
    var media = { matches:!!options.reduced, addEventListener:function(name, handler){media.change=handler;} };
    var window = { matchMedia:function(){return media;}, addEventListener:function(){} };
    if (options.Context) window.AudioContext=options.Context;
    var document = {
      getElementById:get,
      createElement:function(){return new Node();},
      createDocumentFragment:function(){return new Node();},
      querySelectorAll:function(){return Object.keys(nodes).map(function(k){return nodes[k];}).filter(function(n){return n.classes.has('is-celebrating')||n.classes.has('is-changing');});}
    };
    var storage = { getItem:function(){return options.muted?'off':null;}, setItem:function(){} };
    var fakeConsole = {warn:function(){logs.push([].slice.call(arguments).map(String).join(' '));}};
    new Function('window','document','localStorage','navigator','location','CorteCore','CorteEfectos','console','setTimeout','clearTimeout',source)(window,document,storage,{onLine:true},{protocol:'file:',hostname:''},core,effects,fakeConsole,function(handler){timers.push(handler);return timers.length;},function(){});
    return {
      nodes:nodes, get:get, media:media, warnings:logs,
      submit:function(value){get('valorBase').value=value;get('calculatorForm').events.submit({preventDefault:function(){}});},
      particles:function(){return get('celebration').children.reduce(function(sum,fragment){return sum+fragment.children.length;},0);}
    };
  }

  var reduced = fixture({reduced:true});
  reduced.submit('116');
  check('Movimiento reducido + sin audio: resultado correcto inmediato', !reduced.get('resultado').hidden && reduced.get('shareAmount').textContent==='$48.50');
  check('Entrada pierde foco después del cálculo válido', reduced.get('valorBase').blurred===true);
  check('Movimiento reducido: no crea confeti', reduced.particles()===0);
  check('Movimiento reducido: no añade animaciones', !reduced.get('resultado').classes.has('is-celebrating') && !reduced.get('calculateButton').classes.has('is-celebrating') && !reduced.get('shareAmount').classes.has('is-celebrating') && !reduced.get('galleryPhoto').classes.has('is-changing'));

  var failed = fixture({Context:function(){throw new Error('AudioContext no permitido');}});
  failed.submit('53600');
  check('Audio falla: resultado correcto inmediato', !failed.get('resultado').hidden && failed.get('shareAmount').textContent==='$22,410.34');
  check('Audio falla: confeti independiente', failed.particles()===32);
  check('Animaciones separadas se activan en tres elementos', failed.get('resultado').classes.has('is-celebrating') && failed.get('calculateButton').classes.has('is-celebrating') && failed.get('shareAmount').classes.has('is-celebrating'));
  failed.submit('116');
  check('Cálculo repetido reemplaza resultado y partículas', failed.get('shareAmount').textContent==='$48.50' && failed.particles()===32);
  check('Cálculo repetido cambia fotografía', failed.get('galleryPhoto').src==='assets/foto4.jpg');
  failed.media.matches=true;
  failed.media.change();
  check('Activar reducción limpia efectos activos', failed.particles()===0 && !failed.get('resultado').classes.has('is-celebrating'));

  var created = 0;
  var muted = fixture({muted:true,Context:function(){created++;throw new Error('No debería construirse');}});
  muted.submit('116');
  check('Silenciado conserva cálculo y confeti sin iniciar audio', created===0 && muted.get('shareAmount').textContent==='$48.50' && muted.particles()===32);
  check('Preferencia silenciado y etiqueta accesible sincronizadas', muted.get('soundToggle').attributes['aria-pressed']==='false' && muted.get('soundLabel').textContent==='Sonido silenciado');

  var invalid = fixture({muted:true});
  invalid.submit('');
  check('Vacío se rechaza y enfoca entrada', invalid.get('resultado').hidden && !invalid.get('inputError').hidden && invalid.get('valorBase').focused && invalid.get('valorBase').attributes['aria-invalid']==='true' && invalid.particles()===0);
  invalid.submit('-1');
  check('Negativo se rechaza sin efectos', invalid.get('resultado').hidden && !invalid.get('inputError').hidden && invalid.particles()===0);
  invalid.submit('0');
  check('Cero válido después de error', !invalid.get('resultado').hidden && invalid.get('shareAmount').textContent==='$0.00' && invalid.get('inputError').hidden && !invalid.get('valorBase').attributes['aria-invalid']);
  invalid.get('valorBase').events.input();
  check('Editar cantidad oculta resultado anterior', invalid.get('resultado').hidden && !invalid.get('emptyResult').hidden && invalid.get('resultAnnouncement').textContent==='');

  Promise.resolve().then(function(){}).then(function(){}).then(function(){
    check('API de audio ausente informa sin bloquear', !reduced.get('soundNotice').hidden && reduced.get('soundNotice').textContent.indexOf('seguir calculando')>=0 && reduced.warnings.length===1);
    check('Constructor de audio fallido informa sin bloquear', !failed.get('soundNotice').hidden && failed.warnings.length===2 && failed.get('shareAmount').textContent==='$48.50');
    check('Silenciado no genera aviso de audio fallido', muted.get('soundNotice').hidden && muted.warnings.length===0);
    var failedChecks = checks.filter(function(c){return !c.pasa;});
    var result={tipo:'app.js real con DOM, media y audio simulados; no es verificación visual ni iPhone',total:checks.length,aprobadas:checks.length-failedChecks.length,fallidas:failedChecks.length,pruebas:checks};
    var output=JSON.stringify(result,null,2);
    $.NSString.alloc.initWithUTF8String(output).writeToFileAtomicallyEncodingError(root+'/pruebas/resultados-interfaz.json',true,$.NSUTF8StringEncoding,null);
    console.log(output);
  });
  return 'Pruebas de interfaz programadas; resultado en pruebas/resultados-interfaz.json';
}
