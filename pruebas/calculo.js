/* Ejecutar: osascript -l JavaScript pruebas/calculo.js [carpeta candidata]
   Usa JavaScriptCore de macOS. No controla aplicaciones ni modifica la app.
   referencia-original.html: copia byte por byte del index.html de Corte main
   commit e15561550ab12b9678c16cff07fa3a9571cbe85a; no se modifica ni se usa en la app. */
ObjC.import('Foundation');

function run(argv) {
  var root = argv[0] || $.NSFileManager.defaultManager.currentDirectoryPath.js;
  var read = function(path) {
    var data = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
    if (!data) throw new Error('No se pudo leer: ' + path);
    return data.js;
  };
  var tests = [];
  function check(name, pass, detail) {
    tests.push({ prueba: name, pasa: !!pass, detalle: detail || null });
  }
  var core = new Function(read(root + '/core.js') + '\nreturn CorteCore;')();
  if (!core || typeof core.calcularImporte !== 'function') throw new Error('Falta CorteCore.calcularImporte');
  if (typeof core.formatearMoneda !== 'function') throw new Error('Falta CorteCore.formatearMoneda');

  // Ejecuta la función original sin cambiar su texto y sustituye únicamente el DOM.
  var original = read(root + '/pruebas/referencia-original.html');
  var source = original.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  var input = { value: '116' };
  var out = { innerHTML: '', style: {}, classList: { remove: function(){}, add: function(){} }, offsetWidth: 1 };
  var btn = { classList: { remove: function(){}, add: function(){} }, offsetWidth: 1 };
  var document = { body: { style: {} }, getElementById: function(id) { return { valorBase: input, resultado: out, calculateButton: btn, container: {} }[id]; } };
  var window = { addEventListener: function(){} };
  var confetti = function(){};
  var calcular = new Function('document', 'window', 'confetti', source + '\nreturn calcular;')(document, window, confetti);

  var cases = ['116', '53600', '0', '0.01', '0.02', '0.03', '1', '100.55', '999999999.99', '1e100', String(Number.MAX_VALUE)];
  cases.forEach(function(value) {
    input.value = value;
    calcular();
    var actual = core.calcularImporte(value);
    var oldValues = [];
    var re = /<span class="value">([^<]+)<\/span>/g;
    var m;
    while ((m = re.exec(out.innerHTML))) oldValues.push(m[1]);
    var candidateValues = actual ? [core.formatearMoneda(actual.deposito), '-' + core.formatearMoneda(actual.ivaDescontado), '-' + core.formatearMoneda(actual.descuento3), core.formatearMoneda(actual.subTotal), core.formatearMoneda(actual.porSocio)] : [];
    check('Paridad completa con original: ' + value, JSON.stringify(oldValues) === JSON.stringify(candidateValues), { original: oldValues, candidata: candidateValues });
    check('Todos los resultados finitos: ' + value, actual && Object.keys(actual).every(function(k){ return Number.isFinite(actual[k]); }));
  });

  var invalid = ['', '-1', '-0.01', 'texto', '1e309', NaN, Infinity, -Infinity, null, undefined];
  invalid.forEach(function(value) {
    var actual = core.calcularImporte(value);
    check('Entrada inválida: ' + String(value), actual === null, actual);
  });

  var simple = core.calcularImporte(116);
  check('Fixture 116 sin pérdida de centavos', simple.deposito === 116 && simple.baseSinIVA === 100 && simple.ivaDescontado === 16 && simple.descuento3 === 3 && simple.subTotal === 97 && simple.porSocio === 48.5, simple);
  var repeated = core.calcularImporte('53600');
  var signature = JSON.stringify(repeated);
  core.calcularImporte('0.01');
  check('Cálculos repetidos independientes', signature === JSON.stringify(core.calcularImporte('53600')) && signature === JSON.stringify(repeated));
  check('Se conserva redondeo visible original', core.formatearMoneda(repeated.subTotal) === '$44,820.69' && core.formatearMoneda(repeated.porSocio) === '$22,410.34');
  check('Se conserva cero', core.calcularImporte(0).porSocio === 0);
  var failed = tests.filter(function(t){ return !t.pasa; });
  var report = { motor: 'JavaScriptCore de macOS / osascript', total: tests.length, aprobadas: tests.length - failed.length, fallidas: failed.length, pruebas: tests };
  if (failed.length) throw new Error(JSON.stringify(report, null, 2));
  return JSON.stringify(report, null, 2);
}
