/*
  EPEN · Solicitud de Interferencias
  Formulario de nueva solicitud: completar → revisar → listo.
  Validaciones y mensajes según docs/CONTEXTO-COMPLETO.md §8.2 y apéndice C.
*/
(function () {
  'use strict';

  const E = window.EPEN;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = E.esc;

  // Campo del estado → id del elemento en la página.
  const IDS = {
    dni: 'f-dni', nombre: 'f-nombre', cuit: 'f-cuit', razon: 'f-razon', tipoEntidad: 'f-tipo-entidad', domicilio: 'f-domicilio',
    repDni: 'f-rep-dni', repNombre: 'f-rep-nombre', correo: 'f-correo', correo2: 'f-correo2', tel: 'f-tel',
    tipoTrabajo: 'f-tipo-trabajo', proyecto: 'f-proyecto', ejecuta: 'f-ejecuta', prof: 'f-prof', inicio: 'f-inicio', fin: 'f-fin',
    metodo: 'g-metodo', localidad: 'f-localidad', descripcion: 'f-descripcion',
    notif: 'c-notif', digital: 'c-digital', explora: 'c-explora'
  };
  const SECCIONES = [
    { id: 's1', titulo: 'Quién hace la solicitud' },
    { id: 's2', titulo: 'Contacto' },
    { id: 's3', titulo: 'La obra' },
    { id: 's4', titulo: 'Dónde es la obra' },
    { id: 's5', titulo: 'Descripción y planos' },
    { id: 's6', titulo: 'Confirmación' }
  ];
  const MAX_TRAMOS = 10;
  const MAX_VERTICES = 12;

  const VACIO = {
    dni: '', nombre: '', cuit: '', razon: '', tipoEntidad: '', domicilio: '', repDni: '', repNombre: '',
    correo: '', correo2: '', tel: '', tipoTrabajo: '', proyecto: '', ejecuta: '', inicio: '', fin: '',
    metodo: '', prof: '', localidad: '', descripcion: ''
  };

  const nuevoEstado = () => ({
    quien: 'empresa',
    f: Object.assign({}, VACIO),
    tramos: [{ id: 1, barrio: '', calle: '', altura: '' }],
    sigId: 2,
    mapa: { modo: 'area', puntos: [], punto: null },
    archivos: [],
    acepta: { notif: false, digital: false, explora: false },
    intento: false,
    tocados: {}
  });

  const estadoDeEjemplo = () => {
    const s = nuevoEstado();
    s.f = {
      dni: '', nombre: '', cuit: '30-71234567-1', razon: '[Razón social]', tipoEntidad: 'Empresa contratista',
      domicilio: '[Calle y número], Villa La Angostura', repDni: '30123456', repNombre: '[Nombre y apellido]',
      correo: E.CORREO_EJEMPLO, correo2: E.CORREO_EJEMPLO, tel: '294 4123456', tipoTrabajo: 'Telecomunicaciones o fibra óptica',
      proyecto: 'Tendido de fibra óptica', ejecuta: '[Empresa que ejecuta]', inicio: E.sumarDias(14), fin: E.sumarDias(35),
      metodo: 'Con máquina', prof: '0,8', localidad: 'Villa La Angostura',
      descripcion: 'Zanjeo por vereda para tendido de fibra óptica, con cruces de calle por perforación dirigida.'
    };
    s.tramos = [
      { id: 1, barrio: 'El Once', calle: '[Calle]', altura: 'entre [calle] y [calle]' },
      { id: 2, barrio: 'El Once', calle: '[Calle]', altura: 'N° [altura]' }
    ];
    s.sigId = 3;
    s.mapa = { modo: 'area', puntos: [[140, 188], [610, 188], [610, 222], [140, 222]], punto: null };
    s.acepta = { notif: true, digital: true, explora: true };
    return s;
  };

  let st = nuevoEstado();
  let pantalla = 'form';
  let enviado = null;
  let visibles = new Set();
  let mira = [400, 180];
  let miraVisible = false;
  let irDespues = null;

  // ---------- Validación ----------

  const validar = (c) => {
    const e = {};
    const x = c.f;
    const hoy = E.hoyISO();
    if (c.quien === 'persona') {
      const d = E.soloDig(x.dni);
      if (E.vacio(x.dni)) e.dni = 'Ingresá el DNI.';
      else if (d.length < 7 || d.length > 8) e.dni = 'El DNI tiene que tener 7 u 8 números.';
      if (E.vacio(x.nombre)) e.nombre = 'Ingresá el nombre y apellido.';
    } else {
      if (E.vacio(x.cuit)) e.cuit = 'Ingresá el CUIT.';
      else if (!E.cuitOk(x.cuit)) e.cuit = 'El CUIT no es válido. Revisá los 11 números.';
      if (E.vacio(x.razon)) e.razon = 'Ingresá la razón social.';
      if (E.vacio(x.tipoEntidad)) e.tipoEntidad = 'Elegí el tipo de entidad.';
      if (E.vacio(x.domicilio)) e.domicilio = 'Ingresá el domicilio fiscal.';
      const d = E.soloDig(x.repDni);
      if (E.vacio(x.repDni)) e.repDni = 'Ingresá el DNI del representante.';
      else if (d.length < 7 || d.length > 8) e.repDni = 'El DNI tiene que tener 7 u 8 números.';
      if (E.vacio(x.repNombre)) e.repNombre = 'Ingresá el nombre y apellido del representante.';
    }
    if (E.vacio(x.correo)) e.correo = 'Ingresá un correo electrónico.';
    else if (!E.correoOk(x.correo)) e.correo = 'Ingresá un correo válido, por ejemplo nombre@dominio.com.';
    if (E.vacio(x.correo2)) e.correo2 = 'Repetí el correo electrónico.';
    else if (String(x.correo2).trim().toLowerCase() !== String(x.correo).trim().toLowerCase()) e.correo2 = 'Los dos correos no coinciden.';
    if (E.vacio(x.tel)) e.tel = 'Ingresá un teléfono de contacto.';
    else if (E.soloDig(x.tel).length < 8) e.tel = 'El teléfono tiene que tener al menos 8 números, con código de área.';
    if (E.vacio(x.tipoTrabajo)) e.tipoTrabajo = 'Elegí el tipo de trabajo.';
    if (E.vacio(x.proyecto)) e.proyecto = 'Ingresá el nombre del proyecto.';
    if (E.vacio(x.ejecuta)) e.ejecuta = 'Indicá quién ejecuta los trabajos.';
    const prof = parseFloat(String(x.prof || '').replace(',', '.'));
    if (E.vacio(x.prof)) e.prof = 'Indicá la profundidad máxima en metros.';
    else if (!/^\d+([.,]\d+)?$/.test(String(x.prof).trim()) || isNaN(prof) || prof < 0.1 || prof > 20) e.prof = 'Indicá una profundidad entre 0,1 y 20 metros.';
    if (E.vacio(x.inicio)) e.inicio = 'Elegí la fecha de inicio.';
    else if (x.inicio < hoy) e.inicio = 'La fecha de inicio no puede ser anterior a hoy.';
    if (E.vacio(x.fin)) e.fin = 'Elegí la fecha de fin.';
    else if (x.inicio && x.fin < x.inicio) e.fin = 'La fecha de fin no puede ser anterior a la de inicio.';
    if (E.vacio(x.metodo)) e.metodo = 'Elegí cómo se va a excavar.';
    if (E.vacio(x.localidad)) e.localidad = 'Elegí la localidad.';
    c.tramos.forEach((t, i) => {
      if (E.vacio(t.barrio)) e['t' + t.id + 'barrio'] = 'Completá el barrio del tramo ' + (i + 1) + '.';
      if (E.vacio(t.calle)) e['t' + t.id + 'calle'] = 'Completá la calle del tramo ' + (i + 1) + '.';
    });
    if (E.vacio(x.descripcion)) e.descripcion = 'Describí brevemente los trabajos.';
    if (!c.acepta.notif) e.notif = 'Para enviar, aceptá las notificaciones por correo.';
    if (!c.acepta.digital) e.digital = 'Para enviar, aceptá recibir la respuesta en formato digital.';
    if (!c.acepta.explora) e.explora = 'Para enviar, aceptá el compromiso de exploración manual.';
    return e;
  };

  // Orden de los errores en el resumen (igual al orden en pantalla) y sección de cada uno.
  const ordenErrores = (c) => {
    const o = c.quien === 'persona'
      ? [['dni', 's1'], ['nombre', 's1']]
      : [['cuit', 's1'], ['razon', 's1'], ['tipoEntidad', 's1'], ['domicilio', 's1'], ['repDni', 's1'], ['repNombre', 's1']];
    o.push(['correo', 's2'], ['correo2', 's2'], ['tel', 's2'], ['tipoTrabajo', 's3'], ['proyecto', 's3'], ['ejecuta', 's3'], ['prof', 's3'], ['inicio', 's3'], ['fin', 's3'], ['metodo', 's3'], ['localidad', 's4']);
    c.tramos.forEach((t) => o.push(['t' + t.id + 'barrio', 's4'], ['t' + t.id + 'calle', 's4']));
    o.push(['descripcion', 's5'], ['notif', 's6'], ['digital', 's6'], ['explora', 's6']);
    return o;
  };
  const idDe = (k) => {
    const m = k.match(/^t(\d+)(barrio|calle)$/);
    return m ? 'tr-' + m[1] + '-' + m[2] : IDS[k];
  };

  // Los errores aparecen al salir de un campo o después del primer intento.
  // Mientras se escribe en un campo, su error solo se actualiza si ya estaba a la vista.
  const pintarErrores = (editando) => {
    const err = validar(st);
    const nuevos = new Set();
    ordenErrores(st).forEach(([k]) => {
      const el = document.getElementById(idDe(k));
      const caja = document.getElementById('e-' + idDe(k));
      if (!el || !caja) return;
      const esCasilla = k === 'notif' || k === 'digital' || k === 'explora';
      let mostrar = !!err[k] && (esCasilla ? st.intento : st.intento || !!st.tocados[k]);
      if (k === editando && err[k]) mostrar = visibles.has(k);
      if (mostrar) {
        nuevos.add(k);
        caja.textContent = err[k];
        caja.hidden = false;
        el.setAttribute('aria-invalid', 'true');
      } else {
        caja.hidden = true;
        caja.textContent = '';
        el.removeAttribute('aria-invalid');
      }
    });
    visibles = nuevos;
    pintarResumen(err);
    pintarAvance(err);
    return err;
  };

  const pintarResumen = (err) => {
    const caja = $('#resumen-errores');
    const lista = ordenErrores(st).filter(([k]) => err[k]);
    if (!st.intento || !lista.length) {
      caja.hidden = true;
      if (pantalla === 'form') document.title = TITULOS.form;
      return;
    }
    if (pantalla === 'form') document.title = 'Error: ' + TITULOS.form;
    $('#resumen-errores-t').textContent = lista.length === 1 ? 'Hay 1 dato para corregir' : 'Hay ' + lista.length + ' datos para corregir';
    $('#resumen-errores-lista').innerHTML = lista.map(([k]) => '<li><a href="#' + idDe(k) + '" data-ir="' + idDe(k) + '">' + esc(err[k]) + '</a></li>').join('');
    caja.hidden = false;
  };

  const pintarAvance = (err) => {
    const porSeccion = {};
    ordenErrores(st).forEach(([k, s]) => {
      if (err[k]) porSeccion[s] = (porSeccion[s] || 0) + 1;
    });
    const completas = SECCIONES.filter((s) => !porSeccion[s.id]).length;
    $('#avance-relleno').style.width = Math.round((completas / SECCIONES.length) * 100) + '%';
    $('#avance-texto').textContent = completas + ' de ' + SECCIONES.length + ' secciones completas';
    $('#avance-lista').innerHTML = SECCIONES.map((s, i) => {
      const ok = !porSeccion[s.id];
      const conError = !ok && st.intento;
      const marca = ok ? E.icono.tildeChico : conError ? '!' : String(i + 1);
      const estado = ok ? 'completa' : conError ? 'con datos para corregir' : 'por completar';
      return (
        '<li data-ok="' + ok + '" data-error="' + conError + '"><a href="#' + s.id + '" data-ir="' + s.id + '-t">' +
        '<span class="avance__marca" aria-hidden="true">' + marca + '</span>' + esc(s.titulo) +
        '<span class="visualmente-oculto">, ' + estado + '</span></a></li>'
      );
    }).join('');
  };

  // ---------- Pintar el formulario a partir del estado ----------

  const pintarQuien = () => {
    $$('input[name="quien"]').forEach((r) => (r.checked = r.value === st.quien));
    $$('[data-si]').forEach((b) => (b.hidden = b.dataset.si !== st.quien));
  };

  const pintarCampos = () => {
    Object.keys(VACIO).forEach((k) => {
      if (k === 'metodo') return;
      const el = document.getElementById(IDS[k]);
      if (el) el.value = st.f[k] || '';
    });
    $$('input[name="metodo"]').forEach((r) => (r.checked = r.value === st.f.metodo));
    $$('[data-acepta]').forEach((c) => (c.checked = !!st.acepta[c.dataset.acepta]));
    actualizarFechas();
    actualizarCuenta();
    pintarQuien();
  };

  const actualizarFechas = () => {
    const hoy = E.hoyISO();
    $('#f-inicio').min = hoy;
    $('#f-fin').min = st.f.inicio && st.f.inicio > hoy ? st.f.inicio : hoy;
  };

  const actualizarCuenta = () => {
    const n = String(st.f.descripcion || '').length;
    const cuenta = $('#cuenta-desc');
    cuenta.textContent = n + ' de 500 caracteres';
    cuenta.classList.toggle('campo__cuenta--limite', n >= 450);
  };

  // ---------- Tramos ----------

  const pintarTramos = (nuevo) => {
    const puedeQuitar = st.tramos.length > 1;
    $('#tramos').innerHTML = st.tramos
      .map((t, i) => {
        const n = i + 1;
        const id = 'tr-' + t.id;
        return (
          '<fieldset class="tramo' + (t.id === nuevo ? ' tramo--nuevo' : '') + '" id="' + id + '">' +
          '<legend>Tramo ' + n + '</legend>' +
          '<div class="grilla-campos grilla-campos--tramo">' +
          '<div class="campo"><label class="campo__etiqueta" for="' + id + '-barrio">Barrio <span aria-hidden="true">*</span></label>' +
          '<input class="entrada" id="' + id + '-barrio" data-tramo="' + t.id + '" data-parte="barrio" type="text" maxlength="80" value="' + esc(t.barrio) + '" aria-required="true" aria-describedby="e-' + id + '-barrio">' +
          '<p class="campo__error" id="e-' + id + '-barrio" hidden></p></div>' +
          '<div class="campo"><label class="campo__etiqueta" for="' + id + '-calle">Calle, ruta o camino <span aria-hidden="true">*</span></label>' +
          '<input class="entrada" id="' + id + '-calle" data-tramo="' + t.id + '" data-parte="calle" type="text" maxlength="100" value="' + esc(t.calle) + '" aria-required="true" aria-describedby="e-' + id + '-calle">' +
          '<p class="campo__error" id="e-' + id + '-calle" hidden></p></div>' +
          '<div class="campo"><label class="campo__etiqueta" for="' + id + '-altura">Altura o entre calles</label>' +
          '<input class="entrada" id="' + id + '-altura" data-tramo="' + t.id + '" data-parte="altura" type="text" maxlength="100" placeholder="Ej.: N° 1010" value="' + esc(t.altura) + '"></div>' +
          '</div>' +
          (puedeQuitar
            ? '<button class="boton boton--quitar" type="button" data-quitar-tramo="' + t.id + '" aria-label="Quitar el tramo ' + n + '"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M4 7 H20"></path><path d="M9 7 V4.5 H15 V7"></path><path d="M6.5 7 L7.5 20 H16.5 L17.5 7"></path></svg>Quitar este tramo</button>'
            : '') +
          '</fieldset>'
        );
      })
      .join('');
    const n = st.tramos.length;
    $('#cuenta-tramos').textContent = n === 1 ? '1 tramo cargado' : n + ' tramos cargados' + (n >= MAX_TRAMOS ? ' (máximo por solicitud)' : '');
    $('#agregar-tramo').disabled = n >= MAX_TRAMOS;
  };

  const agregarTramo = () => {
    if (st.tramos.length >= MAX_TRAMOS) return;
    const ultimo = st.tramos[st.tramos.length - 1];
    const id = st.sigId++;
    st.tramos.push({ id, barrio: ultimo ? ultimo.barrio : '', calle: '', altura: '' });
    pintarTramos(id);
    pintarErrores();
    guardarBorrador();
    const campo = document.getElementById('tr-' + id + '-calle');
    if (campo) campo.focus();
    E.anunciar('Agregaste el tramo ' + st.tramos.length + '. El barrio se copió del tramo anterior.');
  };

  const quitarTramo = (id) => {
    const i = st.tramos.findIndex((t) => t.id === id);
    if (i < 0 || st.tramos.length <= 1) return;
    st.tramos.splice(i, 1);
    Object.keys(st.tocados).forEach((k) => {
      if (k.indexOf('t' + id) === 0) delete st.tocados[k];
    });
    pintarTramos();
    pintarErrores();
    guardarBorrador();
    $('#agregar-tramo').focus();
    E.anunciar('Quitaste el tramo ' + (i + 1) + '. Quedan ' + st.tramos.length + '.');
  };

  // ---------- Mapa esquemático ----------

  const zonaActual = () => {
    const m = st.mapa;
    if (m.modo === 'punto') return m.punto ? { tipo: 'punto', punto: m.punto } : null;
    return m.puntos.length ? { tipo: 'area', puntos: m.puntos } : null;
  };

  const pintarMapa = () => {
    const m = st.mapa;
    const n = m.puntos.length;
    const marcas = m.modo === 'punto' ? (m.punto ? 1 : 0) : n;
    const vacio = marcas === 0 && !miraVisible
      ? m.modo === 'punto' ? 'Tocá el mapa para marcar el lugar de la obra' : 'Tocá el mapa para marcar los vértices del área de trabajo'
      : '';
    $('#mapa-superficie').innerHTML = E.mapa.lienzo(zonaActual(), { mira: miraVisible ? mira : null, vacio });
    $$('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.modo === m.modo ? 'true' : 'false'));
    $('#mapa-deshacer').disabled = marcas === 0;
    $('#mapa-borrar').disabled = marcas === 0;
    let estado = 'Todavía no marcaste la zona.';
    if (m.modo === 'punto') {
      if (m.punto) estado = 'Punto marcado en ' + E.mapa.coord(m.punto[0], m.punto[1]) + '.';
    } else if (n > 0 && n < 3) {
      estado = 'Marcaste ' + n + (n === 1 ? ' vértice' : ' vértices') + '. Seguí tocando el mapa: el área necesita al menos 3.';
    } else if (n >= 3) {
      estado = E.mapa.resumen(zonaActual()).replace('Área de', 'Área marcada con').replace(', centro en', '. Centro aproximado:') + '.';
      if (n >= MAX_VERTICES) estado += ' Llegaste al máximo de ' + MAX_VERTICES + ' vértices.';
    }
    $('#mapa-estado').textContent = estado;
  };

  const marcar = (x, y) => {
    const m = st.mapa;
    x = Math.max(0, Math.min(E.mapa.ANCHO, Math.round(x)));
    y = Math.max(0, Math.min(E.mapa.ALTO, Math.round(y)));
    if (m.modo === 'punto') m.punto = [x, y];
    else if (m.puntos.length < MAX_VERTICES) m.puntos.push([x, y]);
    else E.avisar('El área puede tener hasta ' + MAX_VERTICES + ' vértices.');
    pintarMapa();
    guardarBorrador();
  };

  const deshacerMapa = () => {
    const m = st.mapa;
    if (m.modo === 'punto') m.punto = null;
    else m.puntos.pop();
    pintarMapa();
    guardarBorrador();
  };

  const iniciarMapa = () => {
    const sup = $('#mapa-superficie');
    sup.addEventListener('click', (ev) => {
      const r = sup.getBoundingClientRect();
      if (!r.width || !r.height) return;
      miraVisible = false;
      marcar(((ev.clientX - r.left) / r.width) * E.mapa.ANCHO, ((ev.clientY - r.top) / r.height) * E.mapa.ALTO);
    });
    sup.addEventListener('keydown', (ev) => {
      const paso = ev.shiftKey ? 40 : 10;
      const mov = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[ev.key];
      if (mov) {
        ev.preventDefault();
        miraVisible = true;
        mira = [Math.max(0, Math.min(E.mapa.ANCHO, mira[0] + mov[0])), Math.max(0, Math.min(E.mapa.ALTO, mira[1] + mov[1]))];
        pintarMapa();
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        miraVisible = true;
        marcar(mira[0], mira[1]);
      } else if (ev.key === 'Backspace' || ev.key === 'Delete') {
        ev.preventDefault();
        deshacerMapa();
      }
    });
    sup.addEventListener('focus', () => {
      if (sup.matches(':focus-visible')) {
        miraVisible = true;
        pintarMapa();
      }
    });
    sup.addEventListener('blur', () => {
      if (miraVisible) {
        miraVisible = false;
        pintarMapa();
      }
    });
    $$('[data-modo]').forEach((b) =>
      b.addEventListener('click', () => {
        st.mapa.modo = b.dataset.modo;
        pintarMapa();
        guardarBorrador();
      })
    );
    $('#mapa-deshacer').addEventListener('click', deshacerMapa);
    $('#mapa-borrar').addEventListener('click', () => {
      if (st.mapa.modo === 'punto') st.mapa.punto = null;
      else st.mapa.puntos = [];
      pintarMapa();
      guardarBorrador();
      E.anunciar('Borraste las marcas del mapa.');
    });
  };

  // ---------- Archivos ----------

  const pintarArchivos = (avisos) => {
    if (avisos) $('#avisos-planos').innerHTML = avisos.map((a) => '<p class="error-texto">' + esc(a) + '</p>').join('');
    $('#lista-planos').innerHTML = st.archivos
      .map(
        (a) =>
          '<li class="archivo">' + E.icono.archivo +
          '<span class="archivo__nombre">' + esc(a.nombre) + '</span>' +
          '<span class="archivo__tam">' + E.tam(a.bytes) + '</span>' +
          '<button class="boton boton--quitar" type="button" data-quitar-archivo="' + esc(a.id || a.nombre) + '" aria-label="Quitar ' + esc(a.nombre) + '">Quitar</button></li>'
      )
      .join('');
  };

  const agregarArchivos = (lista) => {
    const r = E.filtrarArchivos(lista, st.archivos);
    pintarArchivos(r.avisos);
    if (!r.aceptados.length) return;
    Promise.all(r.aceptados.map((f) => E.archivos.guardar(f).then((id) => ({ id: id || '', nombre: f.name, bytes: f.size || 0 })))).then((nuevos) => {
      nuevos.forEach((a) => {
        if (!st.archivos.some((x) => x.nombre === a.nombre)) st.archivos.push(a);
      });
      pintarArchivos();
      guardarBorrador();
      E.anunciar(nuevos.length === 1 ? 'Se adjuntó ' + nuevos[0].nombre + '.' : 'Se adjuntaron ' + nuevos.length + ' archivos.');
    });
  };

  const iniciarArchivos = () => {
    const entrada = $('#f-planos');
    const zona = $('#zona-planos');
    entrada.addEventListener('change', () => {
      agregarArchivos(entrada.files);
      entrada.value = '';
    });
    zona.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      zona.classList.add('zona-archivos--encima');
    });
    zona.addEventListener('dragleave', () => zona.classList.remove('zona-archivos--encima'));
    zona.addEventListener('drop', (ev) => {
      ev.preventDefault();
      zona.classList.remove('zona-archivos--encima');
      agregarArchivos(ev.dataTransfer ? ev.dataTransfer.files : []);
    });
    $('#lista-planos').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-quitar-archivo]');
      if (!b) return;
      const clave = b.dataset.quitarArchivo;
      const a = st.archivos.find((x) => (x.id || x.nombre) === clave);
      if (!a) return;
      st.archivos = st.archivos.filter((x) => x !== a);
      if (a.id) E.archivos.borrar(a.id);
      pintarArchivos([]);
      guardarBorrador();
      zona.focus();
      E.anunciar('Quitaste ' + a.nombre + '.');
    });
  };

  // ---------- Borrador guardado en el dispositivo ----------

  let temporizadorBorrador = null;
  const tieneDatos = (s) =>
    Object.keys(VACIO).some((k) => !E.vacio(s.f[k])) ||
    s.tramos.some((t) => !E.vacio(t.barrio) || !E.vacio(t.calle) || !E.vacio(t.altura)) ||
    s.archivos.length > 0 || s.mapa.puntos.length > 0 || !!s.mapa.punto;

  const guardarBorrador = () => {
    clearTimeout(temporizadorBorrador);
    temporizadorBorrador = setTimeout(() => {
      if (pantalla === 'enviada') return;
      if (!tieneDatos(st)) {
        E.guardado.borrar('borrador');
        return;
      }
      E.guardado.escribir('borrador', {
        guardadoEl: E.ahoraISO(),
        st: { quien: st.quien, f: st.f, tramos: st.tramos, sigId: st.sigId, mapa: st.mapa, archivos: st.archivos, acepta: st.acepta }
      });
    }, 300);
  };

  const recuperarBorrador = () => {
    const b = E.guardado.leer('borrador', null);
    if (!b || !b.st) return false;
    const base = nuevoEstado();
    st = Object.assign(base, b.st, { f: Object.assign({}, VACIO, b.st.f), intento: false, tocados: {} });
    if (!Array.isArray(st.tramos) || !st.tramos.length) st.tramos = base.tramos;
    $('#aviso-borrador-texto').textContent =
      'Recuperamos lo que cargaste el ' + E.fechaHoraLarga(b.guardadoEl) + '. Se guarda solo en este dispositivo hasta que envíes la solicitud.';
    $('#aviso-borrador').hidden = false;
    return true;
  };

  const empezarDeNuevo = (estado) => {
    st.archivos.forEach((a) => a.id && E.archivos.borrar(a.id));
    st = estado || nuevoEstado();
    visibles = new Set();
    E.guardado.borrar('borrador');
    $('#aviso-borrador').hidden = true;
    pintarTodo();
    pintarArchivos([]);
  };

  // ---------- Eventos del formulario ----------

  const iniciarFormulario = () => {
    const sel = $('#f-localidad');
    sel.insertAdjacentHTML('beforeend', E.LOCALIDADES.map((l) => '<option>' + esc(l) + '</option>').join(''));

    const form = $('#formulario');

    form.addEventListener('input', (ev) => {
      const t = ev.target;
      if (t.dataset.campo) {
        st.f[t.dataset.campo] = t.value;
        if (t.dataset.campo === 'descripcion') actualizarCuenta();
        if (t.dataset.campo === 'inicio') actualizarFechas();
        pintarErrores(t.dataset.campo);
        guardarBorrador();
      } else if (t.dataset.tramo) {
        const tr = st.tramos.find((x) => x.id === Number(t.dataset.tramo));
        if (tr) tr[t.dataset.parte] = t.value;
        pintarErrores('t' + t.dataset.tramo + t.dataset.parte);
        guardarBorrador();
      }
    });

    form.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t.name === 'quien') {
        st.quien = t.value;
        pintarQuien();
        pintarErrores();
        guardarBorrador();
      } else if (t.name === 'metodo') {
        st.f.metodo = t.value;
        st.tocados.metodo = true;
        pintarErrores();
        guardarBorrador();
      } else if (t.dataset.acepta) {
        st.acepta[t.dataset.acepta] = t.checked;
        pintarErrores();
        guardarBorrador();
      } else if (t.tagName === 'SELECT' && t.dataset.campo) {
        st.tocados[t.dataset.campo] = true;
        pintarErrores();
      }
    });

    // Al salir de un campo: se normaliza lo escrito y se muestra el error si hay.
    form.addEventListener('focusout', (ev) => {
      const t = ev.target;
      if (t.dataset.campo) {
        const k = t.dataset.campo;
        if (k === 'cuit' && E.soloDig(t.value).length === 11) t.value = st.f.cuit = E.formatoCuit(t.value);
        if ((k === 'dni' || k === 'repDni') && /^[\d.\s-]+$/.test(t.value)) t.value = st.f[k] = E.soloDig(t.value);
        if (k === 'correo' || k === 'correo2') t.value = st.f[k] = t.value.trim();
        if (!E.vacio(t.value) || st.tocados[k]) st.tocados[k] = true;
        pintarErrores();
        guardarBorrador();
      } else if (t.dataset.tramo && t.dataset.parte !== 'altura') {
        const k = 't' + t.dataset.tramo + t.dataset.parte;
        if (!E.vacio(t.value) || st.tocados[k]) st.tocados[k] = true;
        pintarErrores();
      }
    });

    form.addEventListener('click', (ev) => {
      const q = ev.target.closest('[data-quitar-tramo]');
      if (q) quitarTramo(Number(q.dataset.quitarTramo));
    });

    $('#agregar-tramo').addEventListener('click', agregarTramo);

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      revisar();
    });

    // Los enlaces del resumen de errores y del avance llevan el foco al campo.
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-ir]');
      if (!a) return;
      ev.preventDefault();
      irA(a.dataset.ir);
    });

    $('#borrar-borrador').addEventListener('click', () => {
      E.confirmar({
        titulo: '¿Empezar de nuevo?',
        texto: 'Se borra todo lo que cargaste en este formulario, incluidos los planos adjuntos.',
        aceptar: 'Sí, borrar todo',
        cancelar: 'Seguir con lo cargado'
      }).then((si) => {
        if (!si) return;
        empezarDeNuevo();
        $('#s1-t').focus();
        E.anunciar('Se borraron los datos. El formulario está vacío.');
      });
    });
  };

  const irA = (id) => {
    let el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'FIELDSET') el = el.querySelector('input:checked') || el.querySelector('input') || el;
    const objetivo = el.closest('.campo, .casilla, fieldset, section') || el;
    objetivo.scrollIntoView({ block: 'start', behavior: preferenciaMovimiento() });
    el.focus({ preventScroll: true });
  };

  const preferenciaMovimiento = () => (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  const pintarTodo = () => {
    pintarCampos();
    pintarTramos();
    pintarMapa();
    pintarArchivos([]);
    pintarErrores();
  };

  // ---------- Pantallas ----------

  const TITULOS = {
    form: 'Nueva solicitud de interferencias | EPEN',
    revision: 'Revisá tu solicitud | EPEN',
    enviada: 'Solicitud enviada | EPEN'
  };

  const mostrar = (nombre, enfocar) => {
    pantalla = nombre;
    E.ocultarAviso();
    $$('[data-pantalla]').forEach((p) => (p.hidden = p.dataset.pantalla !== nombre));
    const orden = ['form', 'revision', 'enviada'];
    const idx = orden.indexOf(nombre);
    $$('#pasos li').forEach((li, i) => {
      const e = i < idx ? 'hecho' : i === idx ? 'actual' : 'pendiente';
      li.dataset.estado = e;
      if (e === 'actual') li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      $('.pasos__n', li).innerHTML = e === 'hecho' ? E.icono.tildeChico : String(i + 1);
    });
    document.title = nombre === 'enviada' && enviado ? 'Solicitud enviada ' + enviado.numero + ' | EPEN' : TITULOS[nombre];
    if (enfocar) {
      $('#pasos').scrollIntoView({ block: 'start' });
      const destino = document.querySelector('[data-pantalla="' + nombre + '"] h2[tabindex]');
      if (destino) destino.focus({ preventScroll: true });
    }
  };

  const revisar = () => {
    const err = validar(st);
    if (Object.keys(err).length) {
      st.intento = true;
      pintarErrores();
      const caja = $('#resumen-errores');
      caja.scrollIntoView({ block: 'start' });
      caja.focus({ preventScroll: true });
      return;
    }
    pintarRevision();
    history.pushState({ pantalla: 'revision' }, '', '#revision');
    mostrar('revision', true);
  };

  const datosRevision = () => {
    const f = st.f;
    const solicitante = st.quien === 'persona'
      ? [['La solicitud la hace', 'Una persona'], ['DNI', f.dni], ['Nombre y apellido', f.nombre]]
      : [['La solicitud la hace', 'Una empresa o entidad'], ['CUIT', f.cuit], ['Razón social', f.razon], ['Tipo de entidad', f.tipoEntidad], ['Domicilio fiscal', f.domicilio], ['Representante', f.repNombre + ' (DNI ' + f.repDni + ')']];
    return {
      solicitante,
      contacto: [['Correo electrónico', f.correo], ['Teléfono', f.tel]],
      obra: [['Tipo de trabajo', f.tipoTrabajo], ['Proyecto', f.proyecto], ['Ejecuta los trabajos', f.ejecuta], ['Fechas', E.fecha(f.inicio) + ' al ' + E.fecha(f.fin)], ['Método de excavación', f.metodo], ['Profundidad máxima', E.metros(f.prof)]],
      ubicacion: [['Localidad', f.localidad], ['Zona en el mapa', E.mapa.resumen(zonaValida())]]
    };
  };

  // Un área con menos de 3 vértices no se envía.
  const zonaValida = () => {
    const z = zonaActual();
    if (z && z.tipo === 'area' && z.puntos.length < 3) return null;
    return z;
  };

  const dl = (pares) =>
    '<dl class="datos">' + pares.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>';

  const tarjetaRevision = (titulo, seccion, cuerpo, conBoton) =>
    '<div class="tarjeta">' +
    '<div class="tarjeta__cab tarjeta__cab--entre"><h3>' + esc(titulo) + '</h3>' +
    (conBoton ? '<button class="boton boton--borde boton--chico no-imprimir" type="button" data-corregir="' + seccion + '" aria-label="Corregir: ' + esc(titulo) + '">Corregir</button>' : '') +
    '</div><div class="tarjeta__cuerpo">' + cuerpo + '</div></div>';

  const resumenHTML = (conBotones) => {
    const d = datosRevision();
    const zona = zonaValida();
    const tramos =
      '<ol class="filas-tramos" aria-label="Calles o tramos">' +
      st.tramos
        .map(
          (t, i) =>
            '<li><div><span>Tramo</span><strong>' + (i + 1) + '</strong></div>' +
            '<div><span>Barrio</span><strong>' + esc(t.barrio) + '</strong></div>' +
            '<div><span>Calle, ruta o camino</span><strong>' + esc(t.calle) + '</strong></div>' +
            '<div><span>Altura o entre calles</span><strong>' + esc(E.altura(t.altura) || 'Sin indicar') + '</strong></div></li>'
        )
        .join('') +
      '</ol>';
    const mapa = zona
      ? '<div class="mapa mapa--lectura"><div class="mapa__lienzo">' + E.mapa.lienzo(zona) + '</div></div>'
      : '';
    const archivos = st.archivos.length
      ? '<ul style="margin:0;padding-left:20px">' + st.archivos.map((a) => '<li><strong>' + esc(a.nombre) + '</strong> <span class="texto-2">(' + E.tam(a.bytes) + ')</span></li>').join('') + '</ul>'
      : '<p class="texto-2" style="margin:0">Sin planos adjuntos.</p>';
    return (
      tarjetaRevision('Quién hace la solicitud', 's1', dl(d.solicitante), conBotones) +
      tarjetaRevision('Contacto', 's2', dl(d.contacto), conBotones) +
      tarjetaRevision('La obra', 's3', dl(d.obra), conBotones) +
      tarjetaRevision('Dónde es la obra', 's4', dl(d.ubicacion) + tramos + mapa, conBotones) +
      tarjetaRevision('Descripción y planos', 's5', '<p style="margin:0;white-space:pre-line;overflow-wrap:anywhere">' + esc(st.f.descripcion) + '</p>' + archivos, conBotones)
    );
  };

  const pintarRevision = () => {
    $('[data-pantalla="revision"]').innerHTML =
      '<h2 id="rev-t" tabindex="-1">Revisá tu solicitud antes de enviarla</h2>' +
      '<p class="texto-2" style="margin:8px 0 0">Si algo no está bien, tocá «Corregir» en esa parte. Cuando esté todo, confirmá el envío.</p>' +
      resumenHTML(true) +
      '<div class="recuadro recuadro--gris" style="margin-top:18px;padding:18px 22px"><h3 style="font-size:18px">Confirmaste que</h3><ul>' +
      '<li>las notificaciones al correo declarado son válidas y fehacientes;</li>' +
      '<li>recibís la nota y los planos en formato digital;</li>' +
      '<li>hacés exploraciones manuales previas y asumís la responsabilidad por daños.</li></ul></div>' +
      '<div class="botonera" style="margin-top:26px">' +
      '<button class="boton boton--verde boton--grande" type="button" id="confirmar-envio">Confirmar y enviar</button>' +
      '<button class="boton boton--borde boton--grande" type="button" id="volver-editar">Volver a editar</button></div>';
  };

  const enviar = (boton) => {
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    const f = st.f;
    const solicitante = st.quien === 'persona'
      ? { tipo: 'persona', dni: E.soloDig(f.dni), nombre: f.nombre.trim() }
      : {
          tipo: 'entidad',
          cuit: E.formatoCuit(f.cuit),
          razonSocial: f.razon.trim(),
          tipoEntidad: f.tipoEntidad,
          domicilioFiscal: f.domicilio.trim(),
          representante: { dni: E.soloDig(f.repDni), nombre: f.repNombre.trim() }
        };
    const t = E.datos.crear({
      solicitante,
      contacto: { correo: f.correo.trim(), telefono: f.tel.trim() },
      obra: {
        tipoTrabajo: f.tipoTrabajo, proyecto: f.proyecto.trim(), ejecuta: f.ejecuta.trim(), inicio: f.inicio, fin: f.fin,
        metodo: f.metodo, profundidad: String(f.prof).trim().replace('.', ','), descripcion: f.descripcion.trim()
      },
      localidad: f.localidad,
      tramos: st.tramos.map((x) => ({ barrio: x.barrio.trim(), calle: x.calle.trim(), altura: x.altura.trim() })),
      zona: zonaValida(),
      adjuntos: st.archivos.map((a) => ({ id: a.id, nombre: a.nombre, bytes: a.bytes })),
      aceptaciones: { notificaciones: true, formatoDigital: true, exploracionManual: true }
    });
    enviado = { numero: t.numero, creada: t.creada, correo: t.contacto.correo, resumen: resumenHTML(false) };
    clearTimeout(temporizadorBorrador);
    E.guardado.borrar('borrador');
    st = nuevoEstado();
    visibles = new Set();
    $('#aviso-borrador').hidden = true;
    pintarTodo();
    pintarEnviada();
    history.replaceState({ pantalla: 'enviada' }, '', '#enviada');
    mostrar('enviada', true);
  };

  const pintarEnviada = () => {
    const n = enviado.numero;
    $('[data-pantalla="enviada"]').innerHTML =
      '<section class="confirmacion" aria-labelledby="ok-t">' +
      '<span class="confirmacion__ok" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24"><path d="M5 12.5 L10 17.5 L19 7"></path></svg></span>' +
      '<h2 id="ok-t" tabindex="-1">Recibimos tu solicitud</h2>' +
      '<div><span class="texto-2" style="font-size:15px">Número de trámite</span>' +
      '<div class="confirmacion__numero"><p class="numero-grande" id="numero-tramite">' + esc(n) + '</p>' +
      '<button class="boton boton--borde boton--chico no-imprimir" type="button" id="copiar-numero">' + E.icono.copiar + 'Copiar el número</button></div></div>' +
      '<p style="font-size:18px">Enviada el ' + esc(E.fechaHoraLarga(enviado.creada)) + '. La copia llega a <strong style="overflow-wrap:anywhere">' + esc(enviado.correo) + '</strong>.</p>' +
      '<p class="aviso-prototipo">Prototipo: la solicitud quedó guardada en este navegador para la demostración. No se envió a EPEN ni se mandó ningún correo.</p>' +
      '<div class="recuadro recuadro--gris" style="padding:20px 22px"><h3 style="font-size:19px">Qué sigue</h3><ol>' +
      '<li>El Sector Técnico revisa las instalaciones de EPEN en cada tramo.</li>' +
      '<li>Si falta algo, te escribimos a ese correo.</li>' +
      '<li>Te enviamos la nota, con el plano cuando corresponde, dentro de las 72 horas hábiles.</li></ol></div>' +
      '<p class="texto-2">Guardá el número: con él y tu correo podés consultar el estado cuando quieras.</p>' +
      '<details class="acordeon" id="detalle-enviado"><summary><span>Ver los datos que enviaste</span><svg class="acordeon__flecha" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"></circle><path d="M12 7 V16"></path><path d="M8.5 12.5 L12 16 L15.5 12.5"></path></svg></summary>' +
      '<div class="acordeon__cuerpo revision" style="margin:0;max-width:none">' + enviado.resumen + '</div></details>' +
      '<div class="botonera no-imprimir">' +
      '<a class="boton boton--verde" href="seguimiento.html?n=' + encodeURIComponent(E.numeroAUrl(n)) + '">Consultar el estado</a>' +
      '<button class="boton boton--borde solo-local" type="button" id="imprimir-comprobante">' + E.icono.imprimir + 'Imprimir el comprobante</button>' +
      '<a class="boton boton--borde" href="index.html">Volver a Interferencias</a>' +
      '<button class="boton boton--texto" type="button" id="otra-solicitud">Hacer otra solicitud</button></div>' +
      '</section>';
  };

  const iniciarPantallas = () => {
    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('button');
      if (!t) return;
      if (t.dataset.corregir) {
        irDespues = t.dataset.corregir + '-t';
        history.back();
      } else if (t.id === 'volver-editar') {
        history.back();
      } else if (t.id === 'confirmar-envio') {
        enviar(t);
      } else if (t.id === 'copiar-numero') {
        E.copiar(enviado.numero).then((ok) => E.avisar(ok ? 'Copiaste el número ' + enviado.numero + '.' : 'No se pudo copiar. Anotá el número: ' + enviado.numero + '.'));
      } else if (t.id === 'imprimir-comprobante') {
        window.print();
      } else if (t.id === 'otra-solicitud') {
        enviado = null;
        empezarDeNuevo();
        history.replaceState(null, '', location.pathname + location.search);
        mostrar('form', true);
        $('#s1-t').focus();
      }
    });

    // El botón Atrás del navegador vuelve de la revisión al formulario sin perder nada.
    window.addEventListener('popstate', (ev) => {
      const destino = ev.state && ev.state.pantalla;
      if (pantalla === 'enviada') {
        enviado = null;
        empezarDeNuevo();
        mostrar('form', true);
      } else if (destino === 'revision' && !Object.keys(validar(st)).length) {
        pintarRevision();
        mostrar('revision', true);
      } else if (pantalla !== 'form') {
        if (irDespues) {
          mostrar('form');
          irA(irDespues);
          irDespues = null;
        } else {
          mostrar('form', true);
        }
      }
    });

    window.addEventListener('beforeprint', () => {
      const d = $('#detalle-enviado');
      if (d) d.open = true;
    });
  };

  // ---------- Inicio ----------

  E.alIniciar(() => {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    iniciarFormulario();
    iniciarMapa();
    iniciarArchivos();
    iniciarPantallas();

    if (E.param('ejemplo') === '1') {
      st = estadoDeEjemplo();
    } else {
      recuperarBorrador();
    }
    pintarTodo();

    E.accionPrototipo('Cargar datos de ejemplo', () => {
      if (pantalla !== 'form') mostrar('form');
      empezarDeNuevo(estadoDeEjemplo());
      guardarBorrador();
      E.avisar('Cargamos datos de ejemplo válidos. Ya podés revisar y enviar.');
    });
  });
})();
