/*
  EPEN · Solicitud de Interferencias
  Bandeja interna del Sector Técnico: filtros, búsqueda, detalle de cada
  pedido, respuesta tramo por tramo, vista previa de la nota, envío y pedido
  de más información.
*/
(function () {
  'use strict';

  const E = window.EPEN;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = E.esc;

  const FILTROS = [
    ['todas', 'Todas'],
    ['recibida', 'Nuevas'],
    ['revision', 'En revisión'],
    ['falta_info', 'Falta información'],
    ['respondida', 'Respondidas']
  ];

  let lista = [];
  let filtro = 'todas';
  let q = '';
  let sel = null;
  let modo = 'normal';
  let error = '';
  let banner = null;
  const borradores = {};

  const borrador = (t) => {
    if (!borradores[t.numero]) borradores[t.numero] = { resultados: [], plano: null, notaNumero: E.datos.sugerirNotaNumero(), pedido: '' };
    return borradores[t.numero];
  };
  const actual = () => lista.find((t) => t.numero === sel) || null;
  const recargar = () => (lista = E.datos.todos());

  // ---------- Lista ----------

  const visibles = () => {
    const txt = q.trim().toLowerCase();
    return lista.filter(
      (t) =>
        (filtro === 'todas' || t.estado === filtro) &&
        (!txt || (t.numero + ' ' + E.datos.nombre(t) + ' ' + E.datos.barrios(t)).toLowerCase().indexOf(txt) >= 0)
    );
  };

  const pintarFiltros = () => {
    $('#filtros').innerHTML = FILTROS.map(([k, nombre]) => {
      const n = k === 'todas' ? lista.length : lista.filter((t) => t.estado === k).length;
      return (
        '<button class="filtro" type="button" data-filtro="' + k + '" aria-pressed="' + (filtro === k) + '">' +
        '<span>' + nombre + '</span><span class="filtro__n"><span class="visualmente-oculto">: </span>' + n + '</span></button>'
      );
    }).join('');
  };

  const pintarLista = () => {
    const v = visibles();
    $('#filas').innerHTML = v
      .map((t) => {
        const elegido = t.numero === sel;
        const marca = E.datos.documentacionNueva(t) ? '<span class="tabla__marca">Nueva documentación</span>' : '';
        return (
          '<tr data-numero="' + esc(t.numero) + '" data-elegido="' + elegido + '">' +
          '<td data-col="numero"><button class="tabla__numero" type="button" data-elegir="' + esc(t.numero) + '"' + (elegido ? ' aria-current="true"' : '') + '>' + esc(t.numero) + '</button></td>' +
          '<td data-col="solicitante"><span class="tabla__solicitante">' + esc(E.datos.nombre(t)) + '</span>' + marca + '</td>' +
          '<td data-col="trabajo" data-etiqueta="Trabajo">' + esc(t.obra.tipoTrabajo) + '</td>' +
          '<td data-col="barrio" data-etiqueta="Barrio">' + esc(E.datos.barrios(t)) + '</td>' +
          '<td data-col="ingreso" data-etiqueta="Ingresó">' + esc(E.fecha(t.creada)) + '<span class="tabla__secundario">' + esc(E.haceDias(t.creada)) + '</span></td>' +
          '<td data-col="estado">' + E.pildora(t, { interno: true, chica: true }) + '</td>' +
          '</tr>'
        );
      })
      .join('');
    $('#sin-resultados').hidden = v.length > 0;
    $('#cuenta-lista').textContent = v.length === lista.length ? lista.length + ' solicitudes' : 'Mostrando ' + v.length + ' de ' + lista.length;
  };

  // ---------- Detalle ----------

  const dl = (pares, clase) =>
    '<dl class="datos datos--lineas' + (clase ? ' ' + clase : '') + '">' + pares.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>';

  const control = (ok, texto) =>
    '<li><span class="controles__marca' + (ok ? '' : ' controles__marca--alerta') + '" aria-hidden="true">' + (ok ? E.icono.tildeChico : '!') + '</span>' +
    '<span style="min-width:0">' + esc(texto) + '<span class="visualmente-oculto">' + (ok ? ' (bien)' : ' (falta)') + '</span></span></li>';

  const textoBanner = (t) => {
    if (banner && banner.numero === t.numero) return banner;
    if (t.estado === 'falta_info') {
      const p = t.pedidosInfo[t.pedidosInfo.length - 1];
      return { tipo: 'alerta', html: 'Se le pidió al solicitante: ' + esc(E.oracion(p.texto)) + ' Todavía no respondió.' };
    }
    if (E.datos.documentacionNueva(t)) {
      const h = t.historial[t.historial.length - 1];
      return { tipo: 'ok', html: 'El solicitante envió documentación el ' + esc(E.fechaHoraLarga(h.fecha)) + (h.detalle ? ': ' + esc(h.detalle) + '.' : '.') };
    }
    return null;
  };

  const inicioObra = (t) => {
    const hoy = E.hoyISO();
    const dias = Math.round((new Date(t.obra.inicio + 'T00:00') - new Date(hoy + 'T00:00')) / 86400000);
    if (dias < 0) return 'La obra empezaba el ' + E.fecha(t.obra.inicio) + '.';
    if (dias === 0) return 'La obra empieza hoy.';
    return 'La obra empieza el ' + E.fecha(t.obra.inicio) + ', en ' + dias + (dias === 1 ? ' día.' : ' días.');
  };

  const panelRespondida = (t) => {
    const r = t.respuesta;
    return (
      '<div class="panel"><h3>Respuesta enviada</h3>' +
      '<p style="margin:0">Respondida el ' + esc(E.fecha(r.fecha)) + ' con la Nota S.T. S.E.V.L.A. N° ' + esc(r.notaNumero) + (r.plano ? ', con el plano adjunto.' : '.') + '</p>' +
      '<ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px">' +
      t.tramos
        .map(
          (x, i) =>
            '<li><strong>' + esc(x.barrio) + ', ' + esc(E.calleCompleta(x)) + ':</strong> ' +
            (r.resultados[i] === 'si' ? 'existen interferencias subterráneas, con plano adjunto.' : 'no existen interferencias subterráneas.') + '</li>'
        )
        .join('') +
      '</ol>' +
      '<div class="botonera" style="gap:10px">' +
      '<a class="boton boton--borde boton--chico" href="nota.html?n=' + encodeURIComponent(E.numeroAUrl(t.numero)) + '&amp;desde=bandeja">' + E.icono.nota + 'Ver la nota enviada</a>' +
      (r.plano && r.plano.id ? '<button class="boton boton--borde boton--chico" type="button" data-abrir="' + esc(r.plano.id) + '" data-nombre="' + esc(r.plano.nombre) + '">' + E.icono.archivo + 'Ver el plano</button>' : '') +
      '</div></div>'
    );
  };

  const panelResponder = (t) => {
    const b = borrador(t);
    const tramos = t.tramos
      .map((x, i) => {
        const grupo = 'res-' + E.numeroAUrl(t.numero) + '-' + i;
        return (
          '<li><fieldset class="grupo"><legend>Tramo ' + (i + 1) + ': ' + esc(x.barrio) + ', ' + esc(E.calleCompleta(x)) + '</legend>' +
          '<div class="opciones">' +
          '<label class="opcion opcion--chica"><input type="radio" name="' + grupo + '" value="si" data-resultado="' + i + '"' + (b.resultados[i] === 'si' ? ' checked' : '') + '><span>Existen interferencias subterráneas</span></label>' +
          '<label class="opcion opcion--chica"><input type="radio" name="' + grupo + '" value="no" data-resultado="' + i + '"' + (b.resultados[i] === 'no' ? ' checked' : '') + '><span>No existen</span></label>' +
          '</div></fieldset></li>'
        );
      })
      .join('');
    const plano = b.plano
      ? '<div class="archivo">' + E.icono.archivo + '<span class="archivo__nombre">' + esc(b.plano.nombre) + '</span><span class="archivo__tam">' + E.tam(b.plano.bytes) + '</span>' +
        '<button class="boton boton--quitar" type="button" id="quitar-plano" aria-label="Quitar el plano adjunto">Quitar</button></div>'
      : '<label class="boton boton--borde-verde boton--chico" for="r-plano" style="position:relative;align-self:flex-start">' + E.icono.subir +
        '<span>Adjuntar plano (PDF o DWG)</span><input id="r-plano" type="file" accept=".pdf,.dwg,.dxf" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none"></label>';
    return (
      '<div class="panel" id="panel-respuesta">' +
      '<div><h3>Respuesta</h3><p class="panel__sub">Indicá el resultado de cada tramo. Si hay interferencias, adjuntá el plano.</p></div>' +
      (t.estado === 'recibida'
        ? '<div class="aviso" style="margin:0;background:var(--blanco)"><p>Es un pedido nuevo. Pasalo a revisión para que el solicitante vea que ya lo estás mirando.</p><button class="boton boton--borde boton--chico" type="button" id="pasar-revision">Pasar a revisión</button></div>'
        : '') +
      '<ol class="panel__tramos">' + tramos + '</ol>' +
      '<div style="display:flex;flex-direction:column;gap:8px"><span style="font-size:15px;font-weight:800">Plano de las instalaciones de EPEN</span>' + plano + '</div>' +
      '<div class="campo" style="max-width:260px"><label class="campo__etiqueta" for="r-numero-nota" style="font-size:15px">Número de nota</label>' +
      '<input class="entrada" id="r-numero-nota" type="text" inputmode="numeric" autocomplete="off" placeholder="Ej.: ' + esc(E.datos.sugerirNotaNumero() || '1/' + new Date().getFullYear()) + '" value="' + esc(b.notaNumero) + '" aria-describedby="ayuda-numero-nota">' +
      '<p class="campo__ayuda" id="ayuda-numero-nota" style="font-size:14px">Numeración de las notas del Sector Técnico. Sugerimos la siguiente a la última enviada.</p></div>' +
      '<p class="error-texto" id="error-respuesta" role="alert"' + (error ? '' : ' hidden') + '>' + esc(error) + '</p>' +
      '<div class="botonera" style="gap:10px">' +
      '<button class="boton boton--verde" type="button" id="enviar-nota">Enviar la nota</button>' +
      '<button class="boton boton--borde" type="button" id="alternar-vista" aria-expanded="' + (modo === 'vista') + '" aria-controls="vista-previa">' + (modo === 'vista' ? 'Ocultar la vista previa' : 'Ver la vista previa') + '</button>' +
      '<button class="boton boton--borde" type="button" id="alternar-pedido" aria-expanded="' + (modo === 'pedir') + '" aria-controls="panel-pedido">Pedir más información</button>' +
      '</div>' +
      '<div class="panel__pedido" id="panel-pedido"' + (modo === 'pedir' ? '' : ' hidden') + '>' +
      '<label class="campo__etiqueta" for="r-pedido" style="font-size:15px;font-weight:800">Qué le falta al solicitante</label>' +
      '<textarea class="entrada" id="r-pedido" rows="3" maxlength="400" placeholder="Ej.: el plano del proyecto con la traza de la excavación." style="min-height:90px;font-size:16px">' + esc(b.pedido) + '</textarea>' +
      '<div><button class="boton boton--verde boton--chico" type="button" id="enviar-pedido">Enviar el pedido por correo</button></div>' +
      '</div></div>'
    );
  };

  const pintarVistaPrevia = (t) => {
    const caja = $('#vista-previa');
    if (!caja) return;
    if (modo !== 'vista' || t.estado === 'respondida') {
      caja.hidden = true;
      caja.innerHTML = '';
      return;
    }
    const b = borrador(t);
    caja.hidden = false;
    caja.innerHTML =
      '<h3>Vista previa de la nota</h3><div class="papel">' +
      E.nota.html(t, { numero: /^\d{1,4}\/\d{4}$/.test(b.notaNumero.trim()) ? b.notaNumero.trim() : '', resultados: b.resultados, borrador: true }) +
      '</div>';
  };

  const pintarDetalle = () => {
    const caja = $('#detalle');
    const t = actual();
    if (!t) {
      caja.innerHTML = '<div class="resultado__vacio"><h2 id="det-t" tabindex="-1" style="margin:0;font-size:22px;color:var(--pizarra)">Elegí una solicitud de la lista</h2><p>Vas a ver los datos, la zona marcada y el panel para responder.</p></div>';
      return;
    }
    const s = t.solicitante;
    const persona = s.tipo === 'persona';
    const solicitante = persona
      ? [['Nombre y apellido', s.nombre], ['DNI', s.dni]]
      : [['Razón social', s.razonSocial], ['CUIT', s.cuit]]
          .concat(s.tipoEntidad ? [['Tipo de entidad', s.tipoEntidad]] : [])
          .concat([['Domicilio fiscal', s.domicilioFiscal], ['Representante', s.representante.nombre + (s.representante.dni && s.representante.dni !== '[DNI]' ? ' (DNI ' + s.representante.dni + ')' : '')]]);
    solicitante.push(['Correo', t.contacto.correo], ['Teléfono', t.contacto.telefono]);
    const obra = [
      ['Tipo de trabajo', t.obra.tipoTrabajo],
      ['Proyecto', t.obra.proyecto],
      ['Ejecuta', t.obra.ejecuta],
      ['Fechas', E.datos.fechasObra(t)],
      ['Método', t.obra.metodo],
      ['Profundidad máxima', E.metros(t.obra.profundidad)]
    ];
    const zona = t.zona;
    const archivos = t.adjuntos || [];
    const proyecto = archivos.filter((a) => !a.enRespuesta);
    const b = textoBanner(t);

    const listaArchivos = archivos.length
      ? '<ul class="archivos">' +
        archivos
          .map(
            (a) =>
              '<li class="archivo archivo--gris">' + E.icono.archivo +
              '<span class="archivo__nombre">' + esc(a.nombre) + '</span>' +
              (a.enRespuesta ? '<span class="archivo__etiqueta">Respuesta al pedido</span>' : '') +
              '<span class="archivo__tam">' + E.tam(a.bytes) + '</span>' +
              (a.id ? '<button class="boton boton--borde boton--chico" type="button" data-abrir="' + esc(a.id) + '" data-nombre="' + esc(a.nombre) + '" aria-label="Abrir ' + esc(a.nombre) + '">Abrir</button>' : '') +
              '</li>'
          )
          .join('') +
        '</ul>'
      : '<p class="texto-2" style="margin:0">No adjuntó planos.</p>';

    caja.innerHTML =
      '<div class="detalle__cab"><div style="min-width:0"><h2 id="det-t" tabindex="-1">' + esc(t.numero) + '</h2>' +
      '<p>Ingresó el ' + esc(E.fechaHoraLarga(t.creada)) + '. ' + esc(t.localidad) + '. ' + esc(inicioObra(t)) + '</p></div>' +
      E.pildora(t, { interno: true }) + '</div>' +
      (b ? '<p class="detalle__banner' + (b.tipo === 'alerta' ? ' detalle__banner--alerta' : '') + '" role="status" id="banner" tabindex="-1">' + b.html + '</p>' : '') +
      '<div class="detalle__cuerpo">' +
      '<div class="detalle__col">' +
      '<div><h3>Solicitante</h3>' + dl(solicitante) + '</div>' +
      '<div><h3>La obra</h3>' + dl(obra) + '<p class="detalle__descripcion">' + esc(t.obra.descripcion) + '</p></div>' +
      '<div><h3>Controles automáticos</h3><ul class="controles">' +
      control(true, 'Correo confirmado: lo escribió dos veces igual') +
      control(!!zona, zona ? 'Zona marcada en el mapa' : 'No marcó la zona en el mapa') +
      control(proyecto.length > 0, proyecto.length ? 'Adjuntó planos del proyecto' : 'No adjuntó planos del proyecto') +
      control(true, 'Aceptó el compromiso de exploración manual y la responsabilidad por daños') +
      '</ul></div>' +
      '<div><h3>Archivos del solicitante</h3>' + listaArchivos + '</div>' +
      '<div><h3>Historial</h3><ol class="historial">' +
      E.datos.eventos(t).map((x) => '<li><time>' + esc(x.fecha) + '</time><span>' + esc(x.texto) + (x.detalle ? ': ' + esc(x.detalle) : '') + '</span></li>').join('') +
      '</ol></div>' +
      '</div>' +
      '<div class="detalle__col">' +
      '<div><h3>Zona marcada por el solicitante</h3><div class="mapa mapa--lectura"><div class="mapa__lienzo">' +
      E.mapa.lienzo(zona, { vacio: zona ? '' : 'Sin zona marcada en el mapa' }) + '</div>' +
      (zona ? '<p class="mapa__estado">' + esc(E.mapa.resumen(zona)) + '.</p>' : '') + '</div></div>' +
      (t.estado === 'respondida' ? panelRespondida(t) : panelResponder(t)) +
      '</div></div>' +
      '<div class="vista-previa" id="vista-previa" hidden></div>';
    pintarVistaPrevia(t);
  };

  const pintarTodo = () => {
    pintarFiltros();
    pintarLista();
    pintarDetalle();
  };

  // ---------- Acciones ----------

  const elegir = (numero, enfocar) => {
    sel = numero;
    modo = 'normal';
    error = '';
    if (banner && banner.numero !== numero) banner = null;
    history.replaceState(null, '', location.pathname + '?n=' + encodeURIComponent(E.numeroAUrl(numero)));
    pintarLista();
    pintarDetalle();
    if (enfocar) {
      $('#detalle').scrollIntoView({ block: 'start' });
      $('#det-t').focus({ preventScroll: true });
    }
  };

  const guardarYMostrar = (t, b, foco) => {
    E.datos.guardar(t);
    banner = b;
    recargar();
    pintarTodo();
    const el = foco ? $(foco) : $('#banner');
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.focus({ preventScroll: true });
    }
  };

  const mostrarError = (texto) => {
    error = texto;
    const p = $('#error-respuesta');
    p.textContent = texto;
    p.hidden = !texto;
  };

  const enviarNota = () => {
    const t = actual();
    const b = borrador(t);
    const faltan = t.tramos.some((x, i) => !b.resultados[i]);
    if (faltan) return mostrarError('Indicá el resultado de cada tramo antes de enviar la nota.');
    const hayInterferencias = t.tramos.some((x, i) => b.resultados[i] === 'si');
    if (hayInterferencias && !b.plano) return mostrarError('Adjuntá el plano: hay tramos con interferencias subterráneas.');
    const numero = b.notaNumero.trim();
    if (!/^\d{1,4}\/\d{4}$/.test(numero)) return mostrarError('Indicá el número de nota, por ejemplo ' + (E.datos.sugerirNotaNumero() || '1/' + new Date().getFullYear()) + '.');
    if (E.datos.todos().some((x) => x.respuesta && x.respuesta.notaNumero === numero)) return mostrarError('Ya hay una nota enviada con el número ' + numero + '. Revisá la numeración.');
    mostrarError('');
    E.confirmar({
      titulo: '¿Enviar la Nota N° ' + numero + '?',
      texto: 'Se envía a ' + t.contacto.correo + (b.plano ? ' con el plano adjunto' : '') + '. El solicitante la ve enseguida en el seguimiento.',
      aceptar: 'Enviar la nota',
      cancelar: 'Seguir revisando'
    }).then((si) => {
      if (!si) return;
      const ahora = E.ahoraISO();
      t.estado = 'respondida';
      t.respuesta = {
        notaNumero: numero,
        fecha: E.hoyISO(),
        resultados: t.tramos.map((x, i) => b.resultados[i]),
        plano: b.plano ? { id: b.plano.id, nombre: b.plano.nombre, bytes: b.plano.bytes } : null
      };
      t.historial.push({ fecha: ahora, tipo: 'respondida', detalle: 'Nota N° ' + numero });
      delete borradores[t.numero];
      E.datos.guardar(t);
      // Los otros pedidos abiertos que tenían sugerido este número pasan al siguiente.
      Object.keys(borradores).forEach((k) => {
        if (borradores[k].notaNumero.trim() === numero) borradores[k].notaNumero = E.datos.sugerirNotaNumero();
      });
      modo = 'normal';
      guardarYMostrar(t, {
        numero: t.numero,
        tipo: 'ok',
        html:
          'Nota enviada el ' + esc(E.fecha(ahora)) + ' a ' + esc(t.contacto.correo) + (b.plano ? ', con el plano adjunto' : '') +
          '. El solicitante ya la ve en el seguimiento. <a href="nota.html?n=' + encodeURIComponent(E.numeroAUrl(t.numero)) + '&amp;desde=bandeja">Ver la nota enviada</a>'
      });
    });
  };

  const enviarPedido = () => {
    const t = actual();
    const b = borrador(t);
    const texto = b.pedido.trim();
    if (!texto) {
      mostrarError('Escribí qué le falta al solicitante antes de enviar el pedido.');
      $('#r-pedido').focus();
      return;
    }
    mostrarError('');
    t.estado = 'falta_info';
    t.pedidosInfo.push({ fecha: E.hoyISO(), texto, respondido: false });
    t.historial.push({ fecha: E.ahoraISO(), tipo: 'falta_info', detalle: texto });
    b.pedido = '';
    modo = 'normal';
    guardarYMostrar(t, {
      numero: t.numero,
      tipo: 'ok',
      html: 'Pedido enviado a ' + esc(t.contacto.correo) + '. El trámite queda en «Falta información» hasta que el solicitante responda.'
    });
  };

  const pasarARevision = () => {
    const t = actual();
    t.estado = 'revision';
    t.historial.push({ fecha: E.ahoraISO(), tipo: 'revision' });
    guardarYMostrar(t, { numero: t.numero, tipo: 'ok', html: 'Pasó a revisión técnica. El solicitante ya lo ve en el seguimiento.' });
  };

  const adjuntarPlano = (file) => {
    if (!file) return;
    const t = actual();
    if (['pdf', 'dwg', 'dxf'].indexOf(E.extension(file.name)) < 0) {
      mostrarError('«' + file.name + '» no se adjuntó: el plano tiene que ser PDF, DWG o DXF.');
      return;
    }
    if (file.size > E.MAX_BYTES) {
      mostrarError('«' + file.name + '» no se adjuntó: pesa más de 20 MB.');
      return;
    }
    E.archivos.guardar(file).then((id) => {
      borrador(t).plano = { id: id || '', nombre: file.name, bytes: file.size || 0 };
      error = '';
      pintarDetalle();
      const q2 = $('#quitar-plano');
      if (q2) q2.focus();
      E.anunciar('Plano adjuntado: ' + file.name + '.');
    });
  };

  // ---------- Inicio ----------

  E.alIniciar(() => {
    recargar();
    const pedido = E.param('n');
    const t = pedido && E.datos.obtener(pedido);
    sel = t ? t.numero : lista.some((x) => x.numero === 'INT 147/26') ? 'INT 147/26' : lista[0] && lista[0].numero;
    pintarTodo();

    $('#buscar').addEventListener('input', (ev) => {
      q = ev.target.value;
      pintarLista();
    });

    document.addEventListener('click', (ev) => {
      const fil = ev.target.closest('[data-filtro]');
      if (fil) {
        filtro = fil.dataset.filtro;
        const v = visibles();
        pintarFiltros();
        if (v.length && !v.some((x) => x.numero === sel)) {
          elegir(v[0].numero, false);
        } else {
          pintarLista();
        }
        const nuevo = $('[data-filtro="' + filtro + '"]');
        if (nuevo) nuevo.focus();
        return;
      }
      const boton = ev.target.closest('[data-elegir]');
      if (boton) {
        elegir(boton.dataset.elegir, true);
        return;
      }
      const fila = ev.target.closest('#filas tr');
      if (fila && !ev.target.closest('a, button')) {
        elegir(fila.dataset.numero, true);
        return;
      }
      const abrir = ev.target.closest('[data-abrir]');
      if (abrir) {
        E.archivos.abrir(abrir.dataset.abrir, abrir.dataset.nombre);
        return;
      }
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.id === 'enviar-nota') enviarNota();
      else if (b.id === 'enviar-pedido') enviarPedido();
      else if (b.id === 'pasar-revision') pasarARevision();
      else if (b.id === 'alternar-vista') {
        modo = modo === 'vista' ? 'normal' : 'vista';
        b.setAttribute('aria-expanded', modo === 'vista');
        b.textContent = modo === 'vista' ? 'Ocultar la vista previa' : 'Ver la vista previa';
        $('#alternar-pedido').setAttribute('aria-expanded', 'false');
        $('#panel-pedido').hidden = true;
        pintarVistaPrevia(actual());
        if (modo === 'vista') $('#vista-previa').scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else if (b.id === 'alternar-pedido') {
        modo = modo === 'pedir' ? 'normal' : 'pedir';
        b.setAttribute('aria-expanded', modo === 'pedir');
        $('#panel-pedido').hidden = modo !== 'pedir';
        $('#alternar-vista').setAttribute('aria-expanded', 'false');
        $('#alternar-vista').textContent = 'Ver la vista previa';
        pintarVistaPrevia(actual());
        mostrarError('');
        if (modo === 'pedir') $('#r-pedido').focus();
      } else if (b.id === 'quitar-plano') {
        const t2 = actual();
        const pl = borrador(t2).plano;
        if (pl && pl.id) E.archivos.borrar(pl.id);
        borrador(t2).plano = null;
        pintarDetalle();
        $('#r-plano').focus();
        E.anunciar('Quitaste el plano.');
      }
    });

    document.addEventListener('change', (ev) => {
      const t2 = actual();
      if (!t2) return;
      if (ev.target.dataset.resultado != null) {
        borrador(t2).resultados[Number(ev.target.dataset.resultado)] = ev.target.value;
        if (error) mostrarError('');
        pintarVistaPrevia(t2);
      } else if (ev.target.id === 'r-plano') {
        adjuntarPlano(ev.target.files[0]);
        ev.target.value = '';
      }
    });
    document.addEventListener('input', (ev) => {
      const t2 = actual();
      if (!t2) return;
      if (ev.target.id === 'r-pedido') {
        borrador(t2).pedido = ev.target.value;
        if (error) mostrarError('');
      } else if (ev.target.id === 'r-numero-nota') {
        borrador(t2).notaNumero = ev.target.value;
        if (error) mostrarError('');
        pintarVistaPrevia(t2);
      }
    });

    // Si en otra pestaña se envía una solicitud o se responde, la bandeja se actualiza sola.
    window.addEventListener('storage', (ev) => {
      if (ev.key && ev.key.indexOf('epen-interferencias:tramites') !== 0) return;
      const antes = JSON.stringify(actual());
      recargar();
      pintarFiltros();
      pintarLista();
      if (JSON.stringify(actual()) !== antes) pintarDetalle();
      E.anunciar('La bandeja se actualizó.');
    });
  });
})();
