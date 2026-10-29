/* Misma secuencia de operaciones y presentación que Corte/main e1556155. */
var CorteCore = (function () {
  'use strict';
  var MXN = new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  function calcularImporte(valor) {
    var X = parseFloat(valor);
    if (!Number.isFinite(X) || X < 0) return null;
    var baseSinIVA = X / 1.16;
    var ivaDescontado = X - baseSinIVA;
    var descuento3 = baseSinIVA * 0.03;
    var subTotal = baseSinIVA - descuento3;
    var porSocio = subTotal / 2;
    return { deposito: X, baseSinIVA: baseSinIVA, ivaDescontado: ivaDescontado,
      descuento3: descuento3, subTotal: subTotal, porSocio: porSocio };
  }
  return Object.freeze({ calcularImporte: calcularImporte, formatearMoneda: function (valor) { return MXN.format(valor); } });
}());
