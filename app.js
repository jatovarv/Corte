(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var photos = [
    { src:'assets/foto1.jpg', alt:'Un perro de orejas largas sentado junto a los sillones de una sala.' },
    { src:'assets/foto2.jpg', alt:'Un perro de orejas largas con capa y dos gatos a su lado.' },
    { src:'assets/foto3.jpg', alt:'Un perro de pelo rizado cerca de una mesa en una terraza.' },
    { src:'assets/foto4.jpg', alt:'Un perro blanco, negro y café sentado en una escalera.' },
    { src:'assets/foto5.jpg', alt:'Un perro de orejas largas descansando en los brazos de una persona.' }
  ];
  var photoIndex = 1;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var soundEnabled = true;
  var player = CorteEfectos.crearAudio(window.AudioContext || window.webkitAudioContext);
  var confettiTimer;
  var offlineReady = false;
  try { soundEnabled = localStorage.getItem('corte-prueba-sonido') !== 'off'; } catch (error) { /* Preferencia opcional. */ }

  function updateSoundButton() {
    $('soundToggle').setAttribute('aria-pressed', String(soundEnabled));
    $('soundToggle').setAttribute('aria-label', soundEnabled ? 'Silenciar efectos de sonido' : 'Activar efectos de sonido');
    $('soundLabel').textContent = soundEnabled ? 'Sonido activado' : 'Sonido silenciado';
  }
  function playSound() {
    if (!soundEnabled) return;
    player.reproducir().then(function () { $('soundNotice').hidden = true; }).catch(function (error) {
      $('soundNotice').textContent = 'El sonido no está disponible. Puedes seguir calculando con normalidad.';
      $('soundNotice').hidden = false;
      console.warn('Efecto de sonido no disponible:', error);
    });
  }
  $('soundToggle').addEventListener('click', function () {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('corte-prueba-sonido', soundEnabled ? 'on' : 'off'); } catch (error) { /* No afecta el cálculo. */ }
    updateSoundButton();
    if (soundEnabled) playSound();
    else $('soundNotice').hidden = true;
  });
  updateSoundButton();

  function restartAnimation(element, className) {
    element.classList.remove(className);
    if (reducedMotion.matches) return;
    void element.offsetWidth;
    element.classList.add(className);
  }
  function showPhoto(nextIndex) {
    photoIndex = (nextIndex + photos.length) % photos.length;
    $('photoError').hidden = true;
    $('galleryPhoto').src = photos[photoIndex].src;
    $('galleryPhoto').alt = photos[photoIndex].alt;
    $('photoCount').textContent = String(photoIndex + 1).padStart(2, '0') + ' / 05';
    $('photoCaption').textContent = 'Fotografía ' + (photoIndex + 1) + ' de 5.';
    restartAnimation($('galleryPhoto'), 'is-changing');
  }
  $('previousPhoto').addEventListener('click', function () { showPhoto(photoIndex - 1); });
  $('nextPhoto').addEventListener('click', function () { showPhoto(photoIndex + 1); });
  $('galleryPhoto').addEventListener('error', function () { $('photoError').hidden = false; });

  function celebrate() {
    var host = $('celebration');
    clearTimeout(confettiTimer);
    host.replaceChildren();
    if (reducedMotion.matches) return;
    var colors = ['#b62362','#ed9278','#d2b65a','#659979','#d890b1'];
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < 32; i++) {
      var piece = document.createElement('i');
      piece.className = 'confetti-piece';
      piece.style.setProperty('--left', Math.random() * 100 + '%');
      piece.style.setProperty('--color', colors[i % colors.length]);
      piece.style.setProperty('--duration', (1.15 + Math.random() * 0.65) + 's');
      piece.style.setProperty('--delay', Math.random() * 0.12 + 's');
      piece.style.setProperty('--drift', (Math.random() - 0.5) * 160 + 'px');
      piece.style.setProperty('--rotation', (Math.random() - 0.5) * 900 + 'deg');
      fragment.appendChild(piece);
    }
    host.appendChild(fragment);
    confettiTimer = setTimeout(function () { host.replaceChildren(); }, 2100);
  }
  function stopMotion() {
    if (!reducedMotion.matches) return;
    clearTimeout(confettiTimer);
    $('celebration').replaceChildren();
    document.querySelectorAll('.is-celebrating,.is-changing').forEach(function (element) { element.classList.remove('is-celebrating','is-changing'); });
  }
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', stopMotion);
  else if (reducedMotion.addListener) reducedMotion.addListener(stopMotion);

  $('calculatorForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var result = CorteCore.calcularImporte($('valorBase').value);
    if (!result) {
      $('inputError').hidden = false;
      $('valorBase').setAttribute('aria-invalid','true');
      $('resultado').hidden = true;
      $('emptyResult').hidden = true;
      $('resultAnnouncement').textContent = '';
      $('valorBase').focus();
      return;
    }
    $('inputError').hidden = true;
    $('valorBase').removeAttribute('aria-invalid');
    var money = CorteCore.formatearMoneda;
    $('shareAmount').textContent = money(result.porSocio);
    $('depositAmount').textContent = money(result.deposito);
    $('vatAmount').textContent = '−' + money(result.ivaDescontado);
    $('discountAmount').textContent = '−' + money(result.descuento3);
    $('subtotalAmount').textContent = money(result.subTotal);
    $('emptyResult').hidden = true;
    $('resultado').hidden = false;
    $('resultAnnouncement').textContent = 'A cada socio le toca ' + money(result.porSocio) + '. Subtotal a repartir: ' + money(result.subTotal) + '.';
    // Al enviar desde el teclado del teléfono, liberar el campo permite ver el resultado.
    $('valorBase').blur();
    // El resultado ya está pintado antes de comenzar cualquier efecto opcional.
    try { showPhoto(photoIndex + 1); } catch (error) { console.warn('No se pudo cambiar la foto:', error); }
    try {
      restartAnimation($('resultado'),'is-celebrating');
      restartAnimation($('calculateButton'),'is-celebrating');
      restartAnimation($('shareAmount'),'is-celebrating');
      celebrate();
    } catch (error) { console.warn('No se pudo reproducir el efecto visual:', error); }
    playSound();
  });
  $('valorBase').addEventListener('input', function () {
    $('inputError').hidden = true;
    $('valorBase').removeAttribute('aria-invalid');
    if (!$('resultado').hidden) {
      $('resultado').hidden = true;
      $('emptyResult').hidden = false;
      $('resultAnnouncement').textContent = '';
    }
  });

  function updateOfflineStatus() {
    $('statusDot').classList.toggle('is-ready', offlineReady);
    $('offlineStatus').textContent = offlineReady ? (navigator.onLine ? 'Lista para usar sin conexión' : 'Sin conexión · lista para calcular') : 'Vista previa local';
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(function () {
      offlineReady = true;
      updateOfflineStatus();
    }).catch(function (error) {
      $('offlineStatus').textContent = 'Puedes calcular aquí. El modo sin conexión aún no está listo.';
      console.warn('No se pudo preparar el modo sin conexión:', error);
    });
  } else updateOfflineStatus();
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);

  var installPrompt;
  window.addEventListener('beforeinstallprompt', function (event) { event.preventDefault(); installPrompt = event; $('installButton').hidden = false; });
  $('installButton').addEventListener('click', function () {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(function () { installPrompt = null; $('installButton').hidden = true; });
  });
  window.addEventListener('appinstalled', function () { installPrompt = null; $('installButton').hidden = true; });
}());
