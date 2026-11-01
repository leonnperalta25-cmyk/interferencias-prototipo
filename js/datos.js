/*
  EPEN · Solicitud de Interferencias
  Datos del prototipo: trámites de ejemplo, guardado de trámites nuevos,
  etapas del seguimiento, nota de respuesta (texto literal del modelo del
  Sector Técnico) y mapa esquemático.

  Los trámites se guardan en el navegador (localStorage). Así lo que se carga
  en el formulario aparece en la bandeja y en el seguimiento, como sería con un
  servidor real. Estructura según docs/CONTEXTO-COMPLETO.md §9.
*/
(function () {
  'use strict';

  const EPEN = window.EPEN;
  const VERSION = 4;

  // Correo de los trámites de ejemplo, para poder consultarlos en el seguimiento.
  EPEN.CORREO_EJEMPLO = 'prueba@example.com';

  EPEN.LOCALIDADES = [
    'Aluminé', 'Andacollo', 'Añelo', 'Bajada del Agrio', 'Barrancas', 'Buta Ranquil', 'Caviahue/Copahue', 'Centenario',
    'Chorriaca', 'Chos Malal', 'Cutral-Co', 'El Cholar', 'El Huecú', 'Huinganco', 'Junín de los Andes', 'Las Coloradas',
    'Las Lajas', 'Las Ovejas', 'Loncopué', 'Los Miches', 'Manzano Amargo', 'Mariano Moreno', 'Neuquén Capital', 'Paso Aguerre',
    'Picún Leufú', 'Piedra del Águila', 'Rincón de los Sauces', 'San Martín de los Andes', 'San Patricio del Chañar',
    'Santo Tomás', 'Senillosa', 'Taquimilán', 'Tricao Malal', 'Varvarco', 'Villa El Chocón', 'Villa La Angostura',
    'Villa Pehuenia', 'Villa Traful', 'Vista Alegre Sur', 'Zapala'
  ];

  EPEN.ESTADOS = {
    recibida: { publico: 'Recibida', interno: 'Nueva' },
    revision: { publico: 'En revisión técnica', interno: 'En revisión' },
    falta_info: { publico: 'Falta información', interno: 'Falta información' },
    respondida: { publico: 'Respondida', interno: 'Respondida' }
  };

  const entidad = (razon, tipoEntidad) => ({
    tipo: 'entidad',
    cuit: '[CUIT]',
    razonSocial: razon,
    tipoEntidad: tipoEntidad || '',
    domicilioFiscal: '[Domicilio fiscal]',
    representante: { dni: '[DNI]', nombre: '[Nombre del representante]' }
  });
  const contacto = () => ({ correo: EPEN.CORREO_EJEMPLO, telefono: '[teléfono]' });
  const acepta = () => ({ notificaciones: true, formatoDigital: true, exploracionManual: true });

  // Las fechas de los ejemplos se cuentan desde hoy, en días hábiles hacia atrás,
  // para que la demostración se vea siempre al día: pedidos recientes y obras
  // que todavía no empezaron.
  const habilAtras = (n) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    let quedan = n;
    while (quedan > 0) {
      d.setDate(d.getDate() - 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) quedan--;
    }
    return EPEN.isoFecha(d);
  };
  const hace = (n, hora) => habilAtras(n) + (hora ? 'T' + hora : '');
  const enDias = (n) => EPEN.sumarDias(n);

  const EJEMPLOS = [
    {
      numero: 'INT 148/26',
      estado: 'recibida',
      creada: hace(1, '16:05'),
      solicitante: { tipo: 'persona', dni: '[DNI]', nombre: '[Particular]' },
      contacto: contacto(),
      obra: {
        tipoTrabajo: 'Construcción o edificación', proyecto: 'Vivienda unifamiliar', ejecuta: '[Constructora]',
        inicio: enDias(16), fin: enDias(75), metodo: 'Con máquina', profundidad: '1,8',
        descripcion: 'Excavación para bases y conexión cloacal en el frente del lote.'
      },
      localidad: 'Villa La Angostura',
      tramos: [{ barrio: 'Puerto Manzano', calle: '[Calle]', altura: 'N° [altura]' }],
      zona: { tipo: 'area', puntos: [[300, 58], [384, 58], [384, 104], [300, 104]] },
      adjuntos: [{ nombre: 'Plano de obra.pdf', bytes: 1258291 }],
      aceptaciones: acepta(),
      historial: [{ fecha: hace(1, '16:05'), tipo: 'recibida' }],
      pedidosInfo: [],
      respuesta: null
    },
    {
      numero: 'INT 147/26',
      estado: 'revision',
      creada: hace(1, '11:20'),
      solicitante: entidad('[Empresa de telecomunicaciones]'),
      contacto: contacto(),
      obra: {
        tipoTrabajo: 'Telecomunicaciones o fibra óptica', proyecto: 'Tendido de fibra óptica', ejecuta: '[Empresa contratista]',
        inicio: enDias(9), fin: enDias(27), metodo: 'Con máquina', profundidad: '0,8',
        descripcion: 'Zanjeo por vereda para tendido de fibra óptica, con cruces de calle por perforación dirigida.'
      },
      localidad: 'Villa La Angostura',
      tramos: [
        { barrio: 'El Once', calle: '[Calle]', altura: 'entre [calle] y [calle]' },
        { barrio: 'El Once', calle: '[Calle]', altura: 'N° [altura]' }
      ],
      zona: { tipo: 'area', puntos: [[140, 188], [610, 188], [610, 222], [400, 222], [400, 300], [372, 300], [372, 222], [140, 222]] },
      adjuntos: [{ nombre: 'Traza fibra óptica.pdf', bytes: 2516582 }, { nombre: 'Traza fibra óptica.kmz', bytes: 122880 }],
      aceptaciones: acepta(),
      historial: [{ fecha: hace(1, '11:20'), tipo: 'recibida' }, { fecha: hace(1, '12:40'), tipo: 'revision' }],
      pedidosInfo: [],
      respuesta: null
    },
    {
      numero: 'INT 146/26',
      estado: 'recibida',
      creada: hace(1, '09:30'),
      solicitante: entidad('Municipalidad de Villa La Angostura', 'Municipio o comisión de fomento'),
      contacto: contacto(),
      obra: {
        tipoTrabajo: 'Pavimento u obra vial', proyecto: 'Cordón cuneta', ejecuta: 'Municipalidad de Villa La Angostura',
        inicio: enDias(20), fin: enDias(45), metodo: 'Con máquina', profundidad: '0,5',
        descripcion: 'Construcción de cordón cuneta en ambas veredas.'
      },
      localidad: 'Villa La Angostura',
      tramos: [{ barrio: '[Barrio]', calle: '[Calle]', altura: 'entre [calle] y [calle]' }],
      zona: null,
      adjuntos: [],
      aceptaciones: acepta(),
      historial: [{ fecha: hace(1, '09:30'), tipo: 'recibida' }],
      pedidosInfo: [],
      respuesta: null
    },
    {
      numero: 'INT 145/26',
      estado: 'falta_info',
      creada: hace(2, '16:40'),
      solicitante: entidad('[Constructora]'),
      contacto: contacto(),
      obra: {
        tipoTrabajo: 'Construcción o edificación', proyecto: 'Vivienda unifamiliar', ejecuta: '[Constructora]',
        inicio: enDias(12), fin: enDias(55), metodo: 'Con máquina', profundidad: '2',
        descripcion: 'Excavación para platea y conexiones domiciliarias.'
      },
      localidad: 'Villa La Angostura',
      tramos: [{ barrio: 'Puerto Manzano', calle: '[Calle]', altura: 'N° [altura]' }],
      zona: { tipo: 'area', puntos: [[440, 230], [520, 230], [520, 280], [440, 280]] },
      adjuntos: [],
      aceptaciones: acepta(),
      historial: [{ fecha: hace(2, '16:40'), tipo: 'recibida' }, { fecha: hace(1, '09:15'), tipo: 'falta_info' }],
      pedidosInfo: [{ fecha: hace(1), texto: 'el plano del proyecto con la traza de la excavación', respondido: false }],
      respuesta: null
    },
    {
      numero: 'INT 143/26',
      estado: 'revision',
      creada: hace(2, '12:10'),
      solicitante: entidad('[Cooperativa de servicios]', 'Cooperativa de servicios'),
      contacto: contacto(),
      obra: {
        tipoTrabajo: 'Agua o cloacas', proyecto: 'Renovación de red cloacal', ejecuta: '[Cooperativa de servicios]',
        inicio: enDias(6), fin: enDias(24), metodo: 'Con máquina', profundidad: '1,6',
        descripcion: 'Reemplazo de colectora cloacal por calzada.'
      },
      localidad: 'Villa La Angostura',
      tramos: [{ barrio: 'Cumelén', calle: '[Calle]', altura: 'entre [calle] y [calle]' }],
      zona: { tipo: 'area', puntos: [[130, 66], [390, 66], [390, 94], [130, 94]] },
      adjuntos: [{ nombre: 'Proyecto red cloacal.pdf', bytes: 3250586 }],
      aceptaciones: acepta(),
      historial: [{ fecha: hace(2, '12:10'), tipo: 'recibida' }, { fecha: hace(1, '08:50'), tipo: 'revision' }],
      pedidosInfo: [],
      respuesta: null
    },
    {
      numero: 'INT 142/26',
      estado: 'respondida',
      creada: hace(5, '08:15'),
      solicitante: entidad('[Empresa contratista]'),
      contacto: contacto(),
      obra: {
        tipoTrabajo: 'Agua o cloacas', proyecto: 'Extensión de red de agua potable', ejecuta: '[Empresa contratista]',
        inicio: enDias(3), fin: enDias(21), metodo: 'Con máquina', profundidad: '1,5',
        descripcion: 'Extensión de red de agua potable por vereda.'
      },
      localidad: 'Villa La Angostura',
      tramos: [
        { barrio: 'Las Balsas', calle: '[Calle]', altura: 'N° [altura]' },
        { barrio: 'Las Balsas', calle: '[Calle]', altura: 'entre [calle] y [calle]' }
      ],
      zona: { tipo: 'area', puntos: [[150, 190], [380, 190], [380, 220], [150, 220]] },
      adjuntos: [{ nombre: 'Proyecto red de agua.pdf', bytes: 1887437 }],
      aceptaciones: acepta(),
      historial: [
        { fecha: hace(5, '08:15'), tipo: 'recibida' },
        { fecha: hace(4, '09:00'), tipo: 'revision' },
        { fecha: hace(3, '13:30'), tipo: 'respondida', detalle: 'Nota N° 249/2026' }
      ],
      pedidosInfo: [],
      respuesta: {
        notaNumero: '249/2026',
        fecha: hace(3),
        resultados: ['si', 'no'],
        plano: { nombre: 'Plano de interferencias INT 142-26.pdf', detalle: 'PDF, 1 página' }
      }
    }
  ];

  const copia = (x) => JSON.parse(JSON.stringify(x));
  const g = EPEN.guardado;

  const cargar = () => {
    let lista = g.leer('tramites', null);
    if (!Array.isArray(lista) || g.leer('version', 0) !== VERSION) {
      lista = copia(EJEMPLOS);
      g.escribir('tramites', lista);
      g.escribir('version', VERSION);
      g.escribir('recientes', ['INT 142/26', 'INT 145/26', 'INT 148/26']);
    }
    return lista;
  };

  const numeroPartes = (num) => {
    const m = String(num || '').match(/(\d+)\/(\d+)/);
    return m ? { n: Number(m[1]), a: Number(m[2]) } : { n: 0, a: 0 };
  };

  const oracion = (s) => {
    const t = String(s || '').trim().replace(/[.\s]+$/, '');
    return t ? t + '.' : '';
  };
  EPEN.oracion = oracion;

  EPEN.datos = {
    todos() {
      return cargar()
        .slice()
        .sort((x, y) => {
          const a = numeroPartes(x.numero);
          const b = numeroPartes(y.numero);
          return b.a - a.a || b.n - a.n;
        });
    },
    obtener(numero) {
      const n = EPEN.normalizarNumero(numero);
      return cargar().find((t) => t.numero === n) || null;
    },
    guardar(t) {
      const lista = cargar();
      const i = lista.findIndex((x) => x.numero === t.numero);
      if (i >= 0) lista[i] = t;
      else lista.push(t);
      g.escribir('tramites', lista);
      return t;
    },
    siguienteNumero() {
      const anio = new Date().getFullYear() % 100;
      const max = cargar().reduce((m, t) => {
        const p = numeroPartes(t.numero);
        return p.a === anio ? Math.max(m, p.n) : m;
      }, 0);
      return 'INT ' + (max + 1) + '/' + EPEN.p2(anio);
    },
    // Sugiere el próximo número de nota del año a partir de las notas ya enviadas.
    // El Sector Técnico lo puede cambiar: la numeración real es la del sector.
    sugerirNotaNumero() {
      const anio = new Date().getFullYear();
      const max = cargar().reduce((m, t) => {
        if (!t.respuesta || !t.respuesta.notaNumero) return m;
        const p = numeroPartes(t.respuesta.notaNumero);
        return p.a === anio ? Math.max(m, p.n) : m;
      }, 0);
      return max ? max + 1 + '/' + anio : '';
    },
    crear(sol) {
      const t = Object.assign(
        {
          numero: EPEN.datos.siguienteNumero(),
          estado: 'recibida',
          creada: EPEN.ahoraISO(),
          historial: [],
          pedidosInfo: [],
          respuesta: null
        },
        sol
      );
      t.historial = [{ fecha: t.creada, tipo: 'recibida' }];
      EPEN.datos.guardar(t);
      EPEN.datos.recordar(t.numero);
      return t;
    },
    nombre(t) {
      return t.solicitante.tipo === 'persona' ? t.solicitante.nombre : t.solicitante.razonSocial;
    },
    esPersona(t) {
      return t.solicitante.tipo === 'persona';
    },
    barrios(t) {
      return t.tramos.map((x) => x.barrio).filter((b, i, a) => a.indexOf(b) === i).join(', ');
    },
    // Estado tal como lo ve el solicitante.
    etiquetaPublica(t) {
      if (t.estado === 'revision' && EPEN.datos.documentacionNueva(t)) return 'Documentación recibida';
      return EPEN.ESTADOS[t.estado].publico;
    },
    documentacionNueva(t) {
      const h = t.historial || [];
      return h.length > 0 && h[h.length - 1].tipo === 'documentacion';
    },
    excavacion(t) {
      return t.obra.metodo + ', hasta ' + EPEN.metros(t.obra.profundidad);
    },
    fechasObra(t) {
      return EPEN.fecha(t.obra.inicio) + ' al ' + EPEN.fecha(t.obra.fin);
    },
    // Trámites consultados en este dispositivo, del más reciente al más viejo.
    recientes() {
      cargar();
      return g.leer('recientes', []).filter((n) => EPEN.datos.obtener(n));
    },
    // Un trámite nuevo entra primero; uno que ya estaba no cambia de lugar.
    recordar(numero) {
      const l = g.leer('recientes', []);
      if (l.indexOf(numero) >= 0) return;
      l.unshift(numero);
      g.escribir('recientes', l.slice(0, 5));
    },
    // Etapas de la línea de tiempo del seguimiento.
    etapas(t) {
      const h = t.historial || [];
      const ultimo = (tipo) => h.filter((x) => x.tipo === tipo).pop();
      const out = [];
      out.push({
        titulo: 'Solicitud recibida',
        fecha: EPEN.fechaHora(t.creada),
        nota: 'Se asignó el número de trámite y se envió la copia por correo.',
        e: t.estado === 'recibida' ? 'actual' : 'hecho'
      });
      (t.pedidosInfo || []).forEach((p) => {
        const pendiente = !p.respondido;
        out.push({
          titulo: 'Falta información',
          fecha: EPEN.fecha(p.fecha),
          nota: pendiente ? 'El Sector Técnico pidió: ' + oracion(p.texto) : 'Recibimos la documentación el ' + EPEN.fecha(p.respondidoEl) + '.',
          e: pendiente ? 'alerta' : 'hecho'
        });
      });
      const rev = ultimo('revision');
      const doc = ultimo('documentacion');
      if (t.estado === 'revision') {
        const desde = doc && (!rev || doc.fecha >= rev.fecha) ? doc : rev;
        out.push({
          titulo: 'Revisión técnica',
          fecha: 'En curso desde el ' + EPEN.fecha(desde ? desde.fecha : t.creada),
          nota: EPEN.datos.documentacionNueva(t) ? 'El Sector Técnico retomó la revisión.' : 'El Sector Técnico está revisando las instalaciones de EPEN en cada tramo.',
          e: 'actual'
        });
      } else if (t.estado === 'respondida') {
        out.push({
          titulo: 'Revisión técnica',
          fecha: EPEN.fecha(rev ? rev.fecha : t.respuesta.fecha),
          nota: 'El Sector Técnico revisó las instalaciones de EPEN en cada tramo.',
          e: 'hecho'
        });
      } else {
        out.push({ titulo: 'Revisión técnica', fecha: 'Pendiente', nota: '', e: 'pendiente' });
      }
      if (t.estado === 'respondida') {
        out.push({
          titulo: 'Respuesta enviada',
          fecha: EPEN.fecha(t.respuesta.fecha),
          nota: 'Nota S.T. S.E.V.L.A. N° ' + t.respuesta.notaNumero + (t.respuesta.plano ? ', con el plano adjunto.' : '.'),
          e: 'hecho'
        });
      } else {
        out.push({ titulo: 'Respuesta', fecha: 'Pendiente', nota: '', e: 'pendiente' });
      }
      return out;
    },
    // Historial completo, para la bandeja interna.
    eventos(t) {
      const TXT = {
        recibida: 'Ingresó la solicitud',
        revision: 'Pasó a revisión técnica',
        falta_info: 'Se pidió más información',
        documentacion: 'El solicitante envió documentación',
        respondida: 'Se envió la nota de respuesta'
      };
      return (t.historial || []).map((x) => ({ fecha: EPEN.fechaHora(x.fecha), texto: TXT[x.tipo] || x.tipo, detalle: x.detalle || '' }));
    }
  };

  // ---------- Línea de tiempo (HTML compartido) ----------

  EPEN.lineaTiempo = (etapas) =>
    '<ol class="linea-tiempo">' +
    etapas
      .map((p, i) => {
        const punto = p.e === 'hecho' ? EPEN.icono.tilde : p.e === 'alerta' ? '!' : '';
        const estadoTxt = { hecho: 'Hecho', actual: 'Etapa actual', alerta: 'Requiere tu acción', pendiente: 'Pendiente' }[p.e];
        return (
          '<li data-e="' + p.e + '">' +
          '<div class="linea-tiempo__marca"><span class="linea-tiempo__punto" aria-hidden="true">' + punto + '</span>' +
          (i < etapas.length - 1 ? '<span class="linea-tiempo__linea" aria-hidden="true"></span>' : '') +
          '</div>' +
          '<div class="linea-tiempo__texto">' +
          '<h4>' + EPEN.esc(p.titulo) + '<span class="visualmente-oculto">. ' + estadoTxt + '.</span></h4>' +
          '<p class="linea-tiempo__fecha">' + EPEN.esc(p.fecha) + '</p>' +
          (p.nota ? '<p class="linea-tiempo__nota">' + EPEN.esc(p.nota) + '</p>' : '') +
          '</div></li>'
        );
      })
      .join('') +
    '</ol>';

  EPEN.pildora = (t, opciones) => {
    const o = opciones || {};
    const texto = o.interno ? EPEN.ESTADOS[t.estado].interno : EPEN.datos.etiquetaPublica(t);
    return '<span class="estado estado--' + t.estado + (o.chica ? ' estado--chica' : '') + '">' + EPEN.esc(texto) + '</span>';
  };

  // ---------- Nota de respuesta ----------
  // Texto literal de docs/nota-modelo-interferencias.md. No cambiar la redacción.

  EPEN.nota = {
    html(t, opciones) {
      const o = Object.assign({ numero: '', fecha: EPEN.hoyISO(), resultados: [], borrador: false }, opciones || {});
      const e = EPEN.esc;
      const persona = EPEN.datos.esPersona(t);
      const anio = String(o.fecha).slice(0, 4);
      const numero = o.numero ? o.numero : '____/' + anio;
      const filas = t.tramos
        .map((x, i) => {
          const v = o.resultados[i];
          const obs =
            v === 'si'
              ? '<td class="nota-hoja__obs">EXISTEN INTERFERENCIAS SUBTERRÁNEAS SE ADJUNTA PLANO.</td>'
              : v === 'no'
                ? '<td class="nota-hoja__obs">NO EXISTEN INTERFERENCIAS SUBTERRÁNEAS.</td>'
                : '<td class="nota-hoja__falta">[FALTA INDICAR EL RESULTADO]</td>';
          return (
            '<tr><td>' + e(EPEN.mayus(oracion(t.obra.proyecto))) + '</td>' +
            '<td>' + e(EPEN.mayus(oracion(x.barrio))) + '</td>' +
            '<td>' + e(EPEN.mayus(EPEN.calleCompleta(x))) + '</td>' + obs + '</tr>'
          );
        })
        .join('');
      return (
        '<article class="nota-hoja" aria-label="Nota S.T. S.E.V.L.A. N° ' + e(numero) + '">' +
        (o.borrador ? '<p class="nota-hoja__borrador">Vista previa: la nota todavía no se envió.</p>' : '') +
        '<img class="nota-hoja__logo" src="img/logo-epen.png" alt="EPEN, Ente Provincial de Energía del Neuquén" width="190" height="53">' +
        '<p class="nota-hoja__fecha">Villa La Angostura, ' + e(EPEN.fechaLarga(o.fecha)) + '</p>' +
        '<p class="nota-hoja__numero">Nota S.T. S.E.V.L.A. N° ' + e(numero) + '</p>' +
        '<p class="nota-hoja__destino">' + (persona ? 'Sr./Sra.' : 'Sres.') + '<br>' + e(EPEN.mayus(EPEN.datos.nombre(t))) +
        '<br><em>' + e(t.localidad) + '</em><br>__________________</p>' +
        '<p class="nota-hoja__ref">Ref.: Solicitud de Interferencias. Trámite ' + e(t.numero) + '</p>' +
        '<p class="nota-hoja__cuerpo">De acuerdo a lo solicitado me dirijo a Ud. y a quien corresponda a fin de comunicarle las interferencias en la zona descripta en la tabla siguiente: <strong><em>se recomienda ejecutar en todos los casos exploraciones previas de uso manual hasta descubrir los conductores subterráneos, estando prohibido el uso de máquinas excavadoras y/o cualquier otro medio mecánico:</em></strong></p>' +
        '<div class="nota-hoja__tabla-caja" tabindex="0" role="region" aria-label="Tabla de tramos de la nota"><table><thead><tr><th scope="col">Proyecto</th><th scope="col">Barrio</th><th scope="col">Calle</th><th scope="col">Observaciones</th></tr></thead><tbody>' +
        filas +
        '</tbody></table></div>' +
        '<p class="nota-hoja__nota"><strong>NOTA:</strong> Las cotas de profundidades, tapadas de los planos y distancias a Línea Municipal u otra referencia, fueron tomadas al momento de ejecutarse las obras. Considerando que, con el transcurso del tiempo, hechos de terceros podría eventualmente haber modificado estas cotas originales, <strong>se recomienda ejecutar en todos los casos exploraciones previas</strong> de uso manual hasta descubrir los conductores subterráneos, estando <strong>prohibido el uso de máquinas excavadoras y/o cualquier otro medio mecánico</strong>.</p>' +
        '<p class="nota-hoja__clausula">QUEDA ACLARADO EXPRESAMENTE QUE LOS DAÑOS QUE SE CAUSAREN A TERCEROS Y/O A ESTE ENTE, TENDRÁ COMO ÚNICO RESPONSABLE ' +
        (persona ? 'AL SOLICITANTE' : 'A ESA EMPRESA') +
        ', POR LO QUE SE DEBERÁN TENER EN CUENTA LOS RECAUDOS PERTINENTES.</p>' +
        '<p class="nota-hoja__cierre">Sin otro particular, saludo a Ud. atentamente.</p>' +
        '<div class="nota-hoja__firma"><p>[Firma y sello]</p><p>Sector Técnico</p><p>Servicio Eléctrico Villa La Angostura</p><p>EPEN</p></div>' +
        '<div class="nota-hoja__pie"><p>Nahuel Huapi N° 98 | Villa la Angostura</p><p>www.epen.gov.ar</p></div>' +
        '</article>'
      );
    }
  };

  // ---------- Mapa esquemático ----------
  // No es un mapa real: es un esquema de calles. Las coordenadas son
  // aproximadas y ficticias, centradas en -40,7623 / -71,6461.

  const ANCHO = 800;
  const ALTO = 360;
  const BASE_SVG =
    '<rect x="0" y="0" width="800" height="360" fill="#EEF0EC"></rect>' +
    '<path d="M560 360 C600 300 690 280 800 292 V360 Z" fill="#D5E5EE"></path>' +
    '<rect x="430" y="96" width="150" height="92" fill="#DCE7D3"></rect>' +
    '<g fill="none" stroke="#FFFFFF" stroke-width="20"><path d="M0 80 H800"></path><path d="M0 205 H800"></path><path d="M130 0 V360"></path><path d="M390 0 V360"></path><path d="M620 0 V280"></path></g>' +
    '<path d="M0 320 L560 250" fill="none" stroke="#FFFFFF" stroke-width="30"></path>' +
    '<g fill="none" stroke="#D3D9DD" stroke-width="1.5"><path d="M0 80 H800"></path><path d="M0 205 H800"></path><path d="M130 0 V360"></path><path d="M390 0 V360"></path><path d="M620 0 V280"></path></g>' +
    '<g fill="none" stroke="#2B3E4C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M762 54 L762 22"></path><path d="M752 34 L762 20 L772 34"></path></g>' +
    '<text x="756" y="72" fill="#2B3E4C" font-family="Manrope, sans-serif" font-size="16" font-weight="800">N</text>' +
    '<path d="M24 336 V344 H124 V336" fill="none" stroke="#2B3E4C" stroke-width="2.5"></path>' +
    '<text x="56" y="328" fill="#2B3E4C" font-family="Manrope, sans-serif" font-size="14" font-weight="700">50 m</text>';

  const pct = (v, total) => ((v / total) * 100).toFixed(2) + '%';
  const fmt = (v) => v.toFixed(4).replace('.', ',');

  EPEN.mapa = {
    ANCHO,
    ALTO,
    coord(x, y) {
      return 'lat. ' + fmt(-40.7623 + (180 - y) * 0.0000045) + ', long. ' + fmt(-71.6461 + (x - 400) * 0.0000059);
    },
    resumen(zona) {
      if (!zona) return 'Sin marcar';
      if (zona.tipo === 'punto' && zona.punto) return 'Un punto, en ' + EPEN.mapa.coord(zona.punto[0], zona.punto[1]);
      const p = zona.puntos || [];
      if (p.length >= 3) {
        const cx = p.reduce((a, q) => a + q[0], 0) / p.length;
        const cy = p.reduce((a, q) => a + q[1], 0) / p.length;
        return 'Área de ' + p.length + ' vértices, centro en ' + EPEN.mapa.coord(cx, cy);
      }
      return 'Sin marcar';
    },
    // HTML del lienzo: esquema, área o punto y, si corresponde, la mira del teclado.
    lienzo(zona, o) {
      const opc = o || {};
      const puntos = zona && zona.tipo === 'area' ? zona.puntos || [] : [];
      let figura = '';
      if (puntos.length >= 3) {
        figura =
          '<polygon points="' + puntos.map((p) => p[0] + ',' + p[1]).join(' ') +
          '" fill="rgba(135,184,103,0.5)" stroke="#47752A" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polygon>';
      } else if (puntos.length === 2) {
        figura =
          '<polyline points="' + puntos.map((p) => p[0] + ',' + p[1]).join(' ') +
          '" fill="none" stroke="#47752A" stroke-width="2.5" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"></polyline>';
      }
      let html = '<svg viewBox="0 0 800 360" aria-hidden="true" focusable="false" preserveAspectRatio="none">' + BASE_SVG + figura + '</svg>';
      if (opc.vertices !== false) {
        html += puntos
          .map(
            (p) =>
              '<span aria-hidden="true" style="position:absolute;left:' + pct(p[0], ANCHO) + ';top:' + pct(p[1], ALTO) +
              ';width:14px;height:14px;margin:-7px 0 0 -7px;background:#FFFFFF;border:3px solid #2B3E4C;pointer-events:none"></span>'
          )
          .join('');
      }
      if (zona && zona.tipo === 'punto' && zona.punto) {
        html +=
          '<svg aria-hidden="true" width="34" height="44" viewBox="0 0 34 44" style="position:absolute;left:' + pct(zona.punto[0], ANCHO) +
          ';top:' + pct(zona.punto[1], ALTO) + ';margin:-42px 0 0 -17px;pointer-events:none"><path d="M17 2 C8.7 2 2 8.7 2 17 C2 28 17 42 17 42 C17 42 32 28 32 17 C32 8.7 25.3 2 17 2 Z" fill="#2B3E4C" stroke="#FFFFFF" stroke-width="2"></path><circle cx="17" cy="17" r="6" fill="#87B867"></circle></svg>';
      }
      if (opc.mira) {
        html +=
          '<span aria-hidden="true" style="position:absolute;left:' + pct(opc.mira[0], ANCHO) + ';top:' + pct(opc.mira[1], ALTO) +
          ';width:30px;height:30px;margin:-15px 0 0 -15px;border:2px solid #2B3E4C;border-radius:50%;box-shadow:0 0 0 2px #FFFFFF;pointer-events:none">' +
          '<span style="position:absolute;left:50%;top:-8px;bottom:-8px;width:2px;margin-left:-1px;background:#2B3E4C"></span>' +
          '<span style="position:absolute;top:50%;left:-8px;right:-8px;height:2px;margin-top:-1px;background:#2B3E4C"></span></span>';
      }
      if (opc.vacio) {
        html += '<p class="mapa__ayuda">' + EPEN.esc(opc.vacio) + '</p>';
      }
      return html;
    }
  };
})();
