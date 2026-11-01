/*
  EPEN · Solicitud de Interferencias
  Consultar el estado: búsqueda por número y correo, línea de tiempo,
  respuesta tramo por tramo y carga de documentación cuando EPEN la pide.
*/
(function () {
  'use strict';

  const E = window.EPEN;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = E.esc;

  let actual = null;
  let archivos = [];

  // ---------- Búsqueda ----------

  const errorCampo = (id, texto) => {
    const el = document.getElementById(id);
    const caja = document.getElementById('e-' + id);
    caja.textContent = texto || '';
    caja.hidden = !texto;
    if (texto) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  };

  const consultar = () => {
    const numero = $('#b-numero').value;
    const correo = $('#b-correo').value.trim();
    const eNum = E.vacio(numero) ? 'Ingresá el número de trámite.' : '';
    const eCorreo = E.vacio(correo) ? 'Ingresá el correo electrónico.' : !E.correoOk(correo) ? 'Ingresá un correo válido, por ejemplo nombre@dominio.com.' : '';
    errorCampo('b-numero', eNum);
    errorCampo('b-correo', eCorreo);
    $('#no-encontrado').hidden = true;
    if (eNum || eCorreo) {
      $(eNum ? '#b-numero' : '#b-correo').focus();
      return;
    }
    const t = E.datos.obtener(numero);
    if (!t || t.contacto.correo.trim().toLowerCase() !== correo.toLowerCase()) {
      $('#no-encontrado').hidden = false;
      return;
    }
    $('#b-numero').value = t.numero;
    abrir(t, true);
  };

  const abrir = (t, enfocar) => {
    actual = t;
    archivos = [];
    E.datos.recordar(t.numero);
    pintarRecientes();
    pintarResultado();
    history.replaceState(null, '', location.pathname + '?n=' + encodeURIComponent(E.numeroAUrl(t.numero)));
    document.title = t.numero + ': ' + E.datos.etiquetaPublica(t) + ' | EPEN';
    if (enfocar) {
      const h = $('#res-t');
      $('#resultado').scrollIntoView({ block: 'start' });
      h.focus({ preventScroll: true });
    }
  };

  const pintarRecientes = () => {
    const lista = E.datos.recientes();
    const caja = $('#recientes');
    caja.hidden = !lista.length;
    caja.innerHTML =
      '<span class="recientes__titulo" id="recientes-t">Consultadas en este dispositivo:</span>' +
      lista
        .map((n) => '<button class="chip" type="button" data-reciente="' + esc(n) + '" aria-pressed="' + (actual && actual.numero === n) + '">' + esc(n) + '</button>')
        .join('');
  };

  // ---------- Resultado ----------

  const resultadoTramo = (v) =>
    v === 'si'
      ? '<span class="controles__marca controles__marca--alerta" aria-hidden="true" style="display:inline-flex;margin-right:6px;vertical-align:-5px">!</span>Existen interferencias subterráneas. Se adjunta plano.'
      : '<span class="controles__marca" aria-hidden="true" style="display:inline-flex;margin-right:6px;vertical-align:-5px">' + E.icono.tildeChico + '</span>No existen interferencias subterráneas.';

  const bloqueRespondida = (t) => {
    const r = t.respuesta;
    return (
      '<div><h3>Respuesta de EPEN</h3>' +
      '<p style="margin:-4px 0 12px;font-size:16px">Nota S.T. S.E.V.L.A. N° ' + esc(r.notaNumero) + ' del ' + esc(E.fecha(r.fecha)) + '.</p>' +
      '<ul class="filas-tramos" aria-label="Resultado por tramo">' +
      t.tramos
        .map(
          (x, i) =>
            '<li><div><span>Barrio</span><strong>' + esc(x.barrio) + '</strong></div>' +
            '<div><span>Calle</span><strong>' + esc(E.calleCompleta(x)) + '</strong>' + (E.nc(x) ? '<span class="filas-tramos__nc">N.C. ' + esc(E.nc(x)) + '</span>' : '') + '</div>' +
            '<div><span>Resultado</span><strong style="font-weight:800">' + resultadoTramo(r.resultados[i]) + '</strong></div></li>'
        )
        .join('') +
      '</ul>' +
      '<div class="botonera" style="margin-top:14px">' +
      '<a class="boton boton--verde" href="nota.html?n=' + encodeURIComponent(E.numeroAUrl(t.numero)) + '">' + E.icono.nota + 'Ver la nota de respuesta</a>' +
      (r.plano ? '<button class="boton boton--borde" type="button" id="descargar-plano">' + E.icono.descargar + 'Descargar el plano</button>' : '') +
      '</div></div>'
    );
  };

  const bloquePedido = (t) => {
    const p = t.pedidosInfo[t.pedidosInfo.length - 1];
    return (
      '<div class="recuadro recuadro--alerta" style="display:flex;flex-direction:column;gap:12px;padding:20px 22px" id="pedido">' +
      '<h3 style="margin:0;font-size:19px">Te pedimos información</h3>' +
      '<p>Para responder necesitamos: ' + esc(E.oracion(p.texto)) + ' Adjuntalo desde acá.</p>' +
      '<label class="zona-archivos zona-archivos--blanca" for="o-archivos" style="padding:18px">' +
      '<span class="zona-archivos__titulo">Elegí los archivos</span>' +
      '<span class="zona-archivos__nota">PDF, DWG, DXF, KMZ, KML, JPG o PNG. Hasta 20 MB cada uno.</span>' +
      '<input id="o-archivos" type="file" multiple accept=".pdf,.dwg,.dxf,.kmz,.kml,.jpg,.jpeg,.png">' +
      '</label>' +
      '<div class="avisos-archivos" id="avisos-pedido" aria-live="assertive"></div>' +
      '<ul class="archivos" id="lista-pedido" aria-label="Archivos para enviar"></ul>' +
      '<p class="error-texto" id="error-envio" role="alert" hidden></p>' +
      '<div><button class="boton boton--verde" type="button" id="enviar-doc">Enviar la documentación</button></div>' +
      '</div>'
    );
  };

  const pintarResultado = () => {
    const caja = $('#resultado');
    const t = actual;
    if (!t) {
      caja.innerHTML =
        '<div class="resultado__vacio"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 64 64" fill="none"><path d="M12 6 H36 L46 16 V58 H12 Z" stroke="#2B3E4C" stroke-width="2.6"></path><path d="M36 6 V16 H46" stroke="#2B3E4C" stroke-width="2.6"></path><path d="M19 25 H34 M19 32 H29" stroke="#87B867" stroke-width="2.8"></path><circle cx="40" cy="42" r="9" stroke="#2B3E4C" stroke-width="2.6"></circle><path d="M46.5 48.5 L56 58" stroke="#2B3E4C" stroke-width="2.6"></path></svg>' +
        '<h2 id="res-t" tabindex="-1" style="margin:8px 0 0;font-size:22px;color:var(--pizarra)">Todavía no consultaste ningún trámite</h2>' +
        '<p>Cuando busques tu solicitud, acá vas a ver en qué etapa está y la respuesta de EPEN.</p></div>';
      return;
    }
    const estado = t.estado;
    const docNueva = E.datos.documentacionNueva(t);
    let principal = '<div><h3>Etapas</h3>' + E.lineaTiempo(E.datos.etapas(t)) + '</div>';
    if (estado === 'respondida') principal += bloqueRespondida(t);
    else if (estado === 'falta_info') principal += bloquePedido(t);
    else if (docNueva)
      principal += '<p class="recuadro recuadro--exito" role="status" id="doc-recibida" tabindex="-1" style="padding:16px 18px;font-weight:700">Recibimos tu documentación. El Sector Técnico retomó la revisión y te avisamos por correo cuando esté la respuesta.</p>';
    else
      principal += '<p class="recuadro recuadro--gris" style="padding:16px 18px"><strong>Plazo:</strong> 72 horas hábiles desde que la solicitud está completa. Cuando esté la respuesta, te avisamos por correo.</p>';

    const datos = [
      ['Solicitante', E.datos.nombre(t)],
      ['Tipo de trabajo', t.obra.tipoTrabajo],
      ['Proyecto', t.obra.proyecto],
      ['Localidad', t.localidad],
      ['Fechas de obra', E.datos.fechasObra(t)],
      ['Excavación', E.datos.excavacion(t)]
    ];
    const lateral =
      '<div><h3 style="margin-bottom:10px">Datos de la solicitud</h3><dl class="datos datos--columna">' +
      datos.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') +
      '</dl></div>' +
      (estado !== 'respondida'
        ? '<div><h3 style="margin-bottom:10px">Calles o tramos</h3><ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px;font-size:16px">' +
          t.tramos.map((x) => '<li><strong>' + esc(x.barrio) + '</strong>, ' + esc(E.calleConNC(x)) + '</li>').join('') +
          '</ol></div>'
        : '');

    caja.innerHTML =
      '<div class="resultado__cab"><div style="min-width:0"><h2 id="res-t" tabindex="-1">' + esc(t.numero) + '</h2>' +
      '<p>Solicitud de Interferencias. Ingresó el ' + esc(E.fechaHoraLarga(t.creada)) + '.</p></div>' + E.pildora(t) + '</div>' +
      '<div class="resultado__cuerpo"><div class="resultado__principal">' + principal + '</div><div class="resultado__lateral">' + lateral + '</div></div>';
  };

  // ---------- Documentación pedida ----------

  const pintarArchivos = (avisos) => {
    if (avisos) $('#avisos-pedido').innerHTML = avisos.map((a) => '<p class="error-texto">' + esc(a) + '</p>').join('');
    $('#lista-pedido').innerHTML = archivos
      .map(
        (a, i) =>
          '<li class="archivo archivo--blanco">' + E.icono.archivo +
          '<span class="archivo__nombre">' + esc(a.nombre) + '</span><span class="archivo__tam">' + E.tam(a.bytes) + '</span>' +
          '<button class="boton boton--quitar" type="button" data-quitar="' + i + '" aria-label="Quitar ' + esc(a.nombre) + '">Quitar</button></li>'
      )
      .join('');
  };

  const agregar = (lista) => {
    const r = E.filtrarArchivos(lista, archivos);
    $('#error-envio').hidden = true;
    pintarArchivos(r.avisos);
    Promise.all(r.aceptados.map((f) => E.archivos.guardar(f).then((id) => ({ id: id || '', nombre: f.name, bytes: f.size || 0 })))).then((nuevos) => {
      archivos = archivos.concat(nuevos);
      pintarArchivos();
    });
  };

  const enviarDocumentacion = () => {
    if (!archivos.length) {
      const e = $('#error-envio');
      e.textContent = 'Adjuntá al menos un archivo antes de enviar.';
      e.hidden = false;
      return;
    }
    const t = E.datos.obtener(actual.numero);
    const ahora = E.ahoraISO();
    const p = t.pedidosInfo[t.pedidosInfo.length - 1];
    p.respondido = true;
    p.respondidoEl = E.hoyISO();
    t.adjuntos = (t.adjuntos || []).concat(archivos.map((a) => ({ id: a.id, nombre: a.nombre, bytes: a.bytes, enRespuesta: true })));
    t.historial.push({ fecha: ahora, tipo: 'documentacion', detalle: archivos.map((a) => a.nombre).join(', ') });
    t.estado = 'revision';
    E.datos.guardar(t);
    actual = t;
    archivos = [];
    pintarResultado();
    document.title = t.numero + ': ' + E.datos.etiquetaPublica(t) + ' | EPEN';
    const ok = $('#doc-recibida');
    if (ok) ok.focus();
  };

  // ---------- Inicio ----------

  E.alIniciar(() => {
    $('#buscar').addEventListener('submit', (ev) => {
      ev.preventDefault();
      consultar();
    });
    ['#b-numero', '#b-correo'].forEach((s) => $(s).addEventListener('input', () => ($('#no-encontrado').hidden = true)));
    $('#b-numero').addEventListener('blur', () => {
      const n = E.normalizarNumero($('#b-numero').value);
      if (n) $('#b-numero').value = n;
    });

    document.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.reciente) {
        const t = E.datos.obtener(b.dataset.reciente);
        if (t) {
          $('#b-numero').value = t.numero;
          errorCampo('b-numero', '');
          errorCampo('b-correo', '');
          $('#no-encontrado').hidden = true;
          abrir(t, false);
          const nuevo = $('[data-reciente="' + t.numero + '"]');
          if (nuevo) nuevo.focus();
        }
      } else if (b.id === 'descargar-plano') {
        const p = actual.respuesta.plano;
        if (p.id) E.archivos.abrir(p.id, p.nombre);
        else E.avisar('El plano de este trámite de ejemplo no es un archivo real. En la versión final se descarga el PDF.');
      } else if (b.id === 'enviar-doc') {
        enviarDocumentacion();
      } else if (b.dataset.quitar != null) {
        const a = archivos.splice(Number(b.dataset.quitar), 1)[0];
        if (a && a.id) E.archivos.borrar(a.id);
        pintarArchivos([]);
      }
    });
    document.addEventListener('change', (ev) => {
      if (ev.target.id === 'o-archivos') {
        agregar(ev.target.files);
        ev.target.value = '';
      }
    });

    // Si el Sector Técnico responde en otra pestaña, el estado se actualiza solo.
    window.addEventListener('storage', (ev) => {
      if (!actual || (ev.key && ev.key.indexOf('epen-interferencias:tramites') !== 0)) return;
      const t = E.datos.obtener(actual.numero);
      if (!t || JSON.stringify(t) === JSON.stringify(actual)) return;
      actual = t;
      pintarResultado();
      if ($('#lista-pedido')) pintarArchivos([]);
      document.title = t.numero + ': ' + E.datos.etiquetaPublica(t) + ' | EPEN';
      E.anunciar('El estado de tu solicitud cambió: ' + E.datos.etiquetaPublica(t) + '.');
    });

    E.accionPrototipo('Usar el correo de los ejemplos', () => {
      $('#b-correo').value = E.CORREO_EJEMPLO;
      errorCampo('b-correo', '');
      $('#b-numero').focus();
    });

    // Llegada desde la confirmación (?n=INT-149-26) o desde la nota.
    const pedido = E.param('n');
    const recientes = E.datos.recientes();
    if (pedido) {
      const t = E.datos.obtener(pedido);
      if (t && recientes.indexOf(t.numero) >= 0) {
        $('#b-numero').value = t.numero;
        abrir(t, false);
        return;
      }
      $('#b-numero').value = E.normalizarNumero(pedido) || '';
    }
    if (!pedido && recientes.length) {
      actual = E.datos.obtener(recientes[0]);
      document.title = actual.numero + ': ' + E.datos.etiquetaPublica(actual) + ' | EPEN';
    }
    pintarRecientes();
    pintarResultado();
    if (pedido) $('#b-correo').focus();
  });
})();
