/*
  EPEN · Solicitud de Interferencias
  Utilidades compartidas: formato, validaciones, guardado en el navegador,
  archivos adjuntos y piezas de interfaz (menú, avisos, diálogos).
*/
(function () {
  'use strict';

  document.documentElement.classList.add('js');
  if (!document.documentElement.lang) document.documentElement.lang = 'es-AR';

  const EPEN = (window.EPEN = window.EPEN || {});

  // Publicado como página de claude.ai, el sitio corre dentro de un marco que no
  // deja imprimir ni abrir o descargar archivos. Abierto con doble clic, sí.
  EPEN.enMarco = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();
  if (EPEN.enMarco) document.documentElement.classList.add('en-marco');

  // ---------- Texto y formato ----------

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const p2 = (n) => String(n).padStart(2, '0');

  EPEN.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  EPEN.p2 = p2;

  // Fecha local en formato ISO (aaaa-mm-dd), sin pasar por UTC.
  EPEN.isoFecha = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  EPEN.isoFechaHora = (d) => EPEN.isoFecha(d) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  EPEN.hoyISO = () => EPEN.isoFecha(new Date());
  EPEN.ahoraISO = () => EPEN.isoFechaHora(new Date());
  EPEN.sumarDias = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return EPEN.isoFecha(d);
  };

  const partes = (iso) => {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    return m ? { a: m[1], m: m[2], d: m[3], h: m[4], min: m[5] } : null;
  };
  EPEN.fecha = (iso) => {
    const x = partes(iso);
    return x ? x.d + '/' + x.m + '/' + x.a : '';
  };
  EPEN.fechaHora = (iso) => {
    const x = partes(iso);
    if (!x) return '';
    return x.h ? x.d + '/' + x.m + '/' + x.a + ', ' + x.h + ':' + x.min + ' h' : x.d + '/' + x.m + '/' + x.a;
  };
  EPEN.fechaHoraLarga = (iso) => {
    const x = partes(iso);
    if (!x) return '';
    return x.h ? x.d + '/' + x.m + '/' + x.a + ' a las ' + x.h + ':' + x.min + ' h' : x.d + '/' + x.m + '/' + x.a;
  };
  EPEN.fechaLarga = (iso) => {
    const x = partes(iso);
    return x ? Number(x.d) + ' de ' + MESES[Number(x.m) - 1] + ' de ' + x.a : '';
  };
  EPEN.diasDesde = (iso) => {
    const x = partes(iso);
    if (!x) return 0;
    const desde = new Date(Number(x.a), Number(x.m) - 1, Number(x.d));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((hoy - desde) / 86400000));
  };
  EPEN.haceDias = (iso) => {
    const n = EPEN.diasDesde(iso);
    return n === 0 ? 'Hoy' : n === 1 ? 'Ayer' : 'Hace ' + n + ' días';
  };

  EPEN.tam = (b) =>
    b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round((b || 0) / 1024)) + ' KB';

  EPEN.metros = (v) => String(v == null ? '' : v).trim().replace('.', ',') + ' m';

  EPEN.mayus = (s) => String(s || '').toLocaleUpperCase('es-AR');

  // Una altura escrita solo con números se muestra como "N° 1010", como en la nota.
  EPEN.altura = (a) => {
    const v = String(a || '').trim();
    return /^\d+$/.test(v) ? 'N° ' + v : v;
  };
  EPEN.calleCompleta = (t) => [String(t.calle || '').trim(), EPEN.altura(t.altura)].filter(Boolean).join(' ');

  // ---------- Validaciones ----------

  EPEN.soloDig = (v) => String(v || '').replace(/\D/g, '');
  EPEN.vacio = (v) => !String(v == null ? '' : v).trim();
  EPEN.correoOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  EPEN.cuitOk = (v) => {
    const d = EPEN.soloDig(v);
    if (d.length !== 11) return false;
    const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) suma += Number(d[i]) * m[i];
    let ver = 11 - (suma % 11);
    if (ver === 11) ver = 0;
    if (ver === 10) return false;
    return ver === Number(d[10]);
  };
  // Escribe el CUIT con guiones a medida que se tipea: 30-71234567-1.
  EPEN.formatoCuit = (v) => {
    const d = EPEN.soloDig(v).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 10) return d.slice(0, 2) + '-' + d.slice(2);
    return d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10);
  };

  // Acepta "INT 148/26", "148/26", "INT-148-26", "int148" o "148".
  EPEN.normalizarNumero = (txt) => {
    const g = String(txt || '').match(/\d+/g);
    if (!g) return null;
    const n = Number(g[0]);
    if (!n) return null;
    let a = g[1] ? Number(g[1]) % 100 : new Date().getFullYear() % 100;
    return 'INT ' + n + '/' + p2(a);
  };
  EPEN.numeroAUrl = (num) => String(num || '').replace(/\s+/g, '-').replace('/', '-');

  EPEN.param = (k) => {
    try {
      return new URLSearchParams(location.search).get(k);
    } catch (e) {
      return null;
    }
  };

  // ---------- Guardado en el navegador ----------
  // Todo lo que se guarda queda solo en este navegador. Si el navegador no
  // permite guardar (modo privado estricto), el sitio sigue funcionando en memoria.

  const PREFIJO = 'epen-interferencias:';
  const memoria = {};
  EPEN.guardado = {
    leer(clave, porDefecto) {
      try {
        const v = localStorage.getItem(PREFIJO + clave);
        return v == null ? porDefecto : JSON.parse(v);
      } catch (e) {
        return clave in memoria ? memoria[clave] : porDefecto;
      }
    },
    escribir(clave, valor) {
      memoria[clave] = valor;
      try {
        localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
        return true;
      } catch (e) {
        return false;
      }
    },
    borrar(clave) {
      delete memoria[clave];
      try {
        localStorage.removeItem(PREFIJO + clave);
      } catch (e) {
        /* sin acceso al almacenamiento */
      }
    },
    borrarTodo() {
      Object.keys(memoria).forEach((k) => delete memoria[k]);
      try {
        Object.keys(localStorage)
          .filter((k) => k.indexOf(PREFIJO) === 0)
          .forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        /* sin acceso al almacenamiento */
      }
    }
  };

  // ---------- Archivos adjuntos (IndexedDB) ----------
  // Los archivos se guardan en el navegador para que el Sector Técnico pueda
  // abrirlos desde la bandeja. Si IndexedDB no está disponible, se guarda solo
  // el nombre y el tamaño.

  const BASE = 'epen-interferencias-archivos';
  let abriendo = null;
  const abrirBase = () => {
    if (abriendo) return abriendo;
    abriendo = new Promise((ok, mal) => {
      try {
        const pedido = indexedDB.open(BASE, 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore('archivos');
        pedido.onsuccess = () => ok(pedido.result);
        pedido.onerror = () => mal(pedido.error);
      } catch (e) {
        mal(e);
      }
    }).catch(() => null);
    return abriendo;
  };
  const operar = (modo, fn) =>
    abrirBase().then(
      (db) =>
        new Promise((ok) => {
          if (!db) return ok(null);
          try {
            const tx = db.transaction('archivos', modo);
            const r = fn(tx.objectStore('archivos'));
            tx.oncomplete = () => ok(r && 'result' in r ? r.result : true);
            tx.onerror = () => ok(null);
            tx.onabort = () => ok(null);
          } catch (e) {
            ok(null);
          }
        })
    );
  const nuevoId = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  EPEN.archivos = {
    guardar(file) {
      const id = nuevoId();
      return operar('readwrite', (s) => s.put(file, id)).then((r) => (r ? id : null));
    },
    obtener(id) {
      if (!id) return Promise.resolve(null);
      return operar('readonly', (s) => s.get(id)).then((r) => (r instanceof Blob ? r : null));
    },
    borrar(id) {
      if (!id) return Promise.resolve(null);
      return operar('readwrite', (s) => s.delete(id));
    },
    borrarTodo() {
      return operar('readwrite', (s) => s.clear());
    },
    // Abre el archivo en otra pestaña (PDF, imágenes) o lo descarga (DWG, KMZ...).
    abrir(id, nombre) {
      if (EPEN.enMarco) {
        EPEN.avisar('En esta vista publicada los archivos no se abren. En la versión real se descargan desde acá.');
        return Promise.resolve(false);
      }
      const ventana = /\.(pdf|png|jpe?g)$/i.test(nombre || '') ? window.open('', '_blank') : null;
      return EPEN.archivos.obtener(id).then((blob) => {
        if (!blob) {
          if (ventana) ventana.close();
          EPEN.avisar('Este archivo es de ejemplo: en el prototipo no hay un archivo real para abrir.');
          return false;
        }
        const url = URL.createObjectURL(blob);
        if (ventana) {
          ventana.location.href = url;
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = nombre || 'archivo';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
      });
    }
  };

  EPEN.FORMATOS = ['pdf', 'dwg', 'dxf', 'kmz', 'kml', 'jpg', 'jpeg', 'png'];
  EPEN.MAX_BYTES = 20 * 1024 * 1024;
  EPEN.extension = (nombre) => (String(nombre).indexOf('.') >= 0 ? String(nombre).split('.').pop().toLowerCase() : '');

  // Revisa una lista de archivos con las reglas del trámite y devuelve
  // los aceptados y los avisos para mostrar.
  EPEN.filtrarArchivos = (lista, actuales, opciones) => {
    const o = Object.assign({ formatos: EPEN.FORMATOS, maximo: 10 }, opciones || {});
    const aceptados = [];
    const avisos = [];
    const nombres = actuales.map((a) => a.nombre);
    Array.from(lista || []).forEach((file) => {
      const nombre = String((file && file.name) || '');
      if (!nombre) return;
      if (o.formatos.indexOf(EPEN.extension(nombre)) < 0) {
        avisos.push('«' + nombre + '» no se adjuntó: ese formato no está admitido.');
        return;
      }
      if (file.size > EPEN.MAX_BYTES) {
        avisos.push('«' + nombre + '» no se adjuntó: pesa más de 20 MB.');
        return;
      }
      if (nombres.indexOf(nombre) >= 0) return;
      if (nombres.length >= o.maximo) {
        if (avisos.indexOf('Podés adjuntar hasta ' + o.maximo + ' archivos.') < 0) avisos.push('Podés adjuntar hasta ' + o.maximo + ' archivos.');
        return;
      }
      nombres.push(nombre);
      aceptados.push(file);
    });
    return { aceptados, avisos };
  };

  // ---------- Íconos ----------

  EPEN.icono = {
    archivo: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="M6 3 H14 L19 8 V21 H6 Z"></path><path d="M14 3 V8 H19"></path></svg>',
    tilde: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M5 12.5 L10 17.5 L19 7"></path></svg>',
    tildeChico: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24"><path d="M5 12.5 L10 17.5 L19 7"></path></svg>',
    descargar: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M12 4 V15"></path><path d="M7.5 10.5 L12 15 L16.5 10.5"></path><path d="M5 20 H19"></path></svg>',
    nota: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M6 3 H14 L19 8 V21 H6 Z"></path><path d="M14 3 V8 H19"></path><path d="M9 13 H15 M9 17 H13"></path></svg>',
    subir: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M12 15 V4"></path><path d="M7.5 8.5 L12 4 L16.5 8.5"></path><path d="M4 15 V20 H20 V15"></path></svg>',
    copiar: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="1.5"></rect><path d="M16 8 V5.5 A1.5 1.5 0 0 0 14.5 4 H5.5 A1.5 1.5 0 0 0 4 5.5 V14.5 A1.5 1.5 0 0 0 5.5 16 H8"></path></svg>',
    imprimir: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M7 9 V3.5 H17 V9"></path><rect x="3.5" y="9" width="17" height="8" rx="1.5"></rect><path d="M7 14 H17 V20.5 H7 Z"></path></svg>',
    volver: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M15 5 L8 12 L15 19"></path></svg>'
  };

  // ---------- Avisos para lectores de pantalla y avisos flotantes ----------

  let vivo = null;
  EPEN.anunciar = (texto) => {
    if (!vivo) {
      vivo = document.createElement('div');
      vivo.className = 'visualmente-oculto';
      vivo.setAttribute('aria-live', 'polite');
      document.body.appendChild(vivo);
    }
    vivo.textContent = '';
    setTimeout(() => {
      vivo.textContent = texto;
    }, 60);
  };

  let flotante = null;
  let temporizador = null;
  EPEN.ocultarAviso = () => {
    if (flotante) flotante.classList.remove('aviso-flotante--visible');
  };
  EPEN.avisar = (texto) => {
    if (!flotante) {
      flotante = document.createElement('div');
      flotante.className = 'aviso-flotante';
      flotante.setAttribute('role', 'status');
      document.body.appendChild(flotante);
    }
    flotante.textContent = texto;
    flotante.classList.add('aviso-flotante--visible');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => flotante.classList.remove('aviso-flotante--visible'), 4200);
  };

  // ---------- Diálogo de confirmación ----------

  EPEN.confirmar = (o) =>
    new Promise((resolver) => {
      const d = document.createElement('dialog');
      d.className = 'dialogo';
      d.setAttribute('aria-labelledby', 'dialogo-titulo');
      d.innerHTML =
        '<form method="dialog" class="dialogo__in">' +
        '<h2 id="dialogo-titulo">' + EPEN.esc(o.titulo) + '</h2>' +
        (o.texto ? '<p>' + EPEN.esc(o.texto) + '</p>' : '') +
        '<div class="botonera">' +
        '<button class="boton boton--verde" value="si">' + EPEN.esc(o.aceptar || 'Aceptar') + '</button>' +
        '<button class="boton boton--borde" value="no">' + EPEN.esc(o.cancelar || 'Cancelar') + '</button>' +
        '</div></form>';
      document.body.appendChild(d);
      const cerrar = () => {
        resolver(d.returnValue === 'si');
        d.remove();
      };
      d.addEventListener('close', cerrar);
      if (typeof d.showModal === 'function') {
        d.showModal();
      } else {
        d.remove();
        resolver(window.confirm(o.titulo + (o.texto ? '\n\n' + o.texto : '')));
      }
    });

  // ---------- Copiar al portapapeles ----------

  EPEN.copiar = (texto) => {
    const alternativa = () => {
      const t = document.createElement('textarea');
      t.value = texto;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      t.remove();
      return ok;
    };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(() => true, () => alternativa());
    }
    return Promise.resolve(alternativa());
  };

  // ---------- Menú en celulares ----------

  const iniciarMenu = () => {
    const nav = document.querySelector('.nav');
    const boton = nav && nav.querySelector('.nav__boton');
    if (!boton) return;
    const poner = (abierto) => {
      nav.dataset.abierto = abierto ? 'true' : 'false';
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    };
    boton.addEventListener('click', () => poner(nav.dataset.abierto !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.dataset.abierto === 'true') {
        poner(false);
        boton.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (nav.dataset.abierto === 'true' && !nav.contains(e.target)) poner(false);
    });
  };

  // ---------- Franja de prototipo ----------
  // Cada página puede sumar acciones propias con EPEN.accionPrototipo().

  EPEN.accionPrototipo = (texto, fn) => {
    const caja = document.querySelector('[data-acciones-prototipo]');
    if (!caja) return null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'prototipo__accion';
    b.textContent = texto;
    b.addEventListener('click', fn);
    caja.insertBefore(b, caja.firstChild);
    return b;
  };

  // Guía para quien recibe el link: el trámite completo, de los dos lados.
  EPEN.mostrarGuia = () => {
    const d = document.createElement('dialog');
    d.className = 'dialogo';
    d.setAttribute('aria-labelledby', 'guia-titulo');
    d.innerHTML =
      '<form method="dialog" class="dialogo__in guia">' +
      '<h2 id="guia-titulo">Cómo recorrer el prototipo</h2>' +
      '<p>Probá el trámite completo, del lado de quien lo pide y del lado del Sector Técnico. Lleva unos cinco minutos.</p>' +
      '<ol class="guia__pasos">' +
      '<li><strong>Pedí una solicitud.</strong> Entrá a <a href="solicitud.html">Nueva solicitud</a>, tocá «Cargar datos de ejemplo» en la franja de arriba, revisala y enviala.</li>' +
      '<li><strong>Respondela como Sector Técnico.</strong> En la <a href="bandeja.html">bandeja interna</a>, elegí tu solicitud, marcá el resultado de cada tramo y enviá la nota.</li>' +
      '<li><strong>Mirá lo que recibe quien la pidió.</strong> En <a href="seguimiento.html">Consultar el estado</a> la ves respondida, con la nota armada con el modelo del Sector Técnico.</li>' +
      '</ol>' +
      '<p class="guia__pie">Es un prototipo: nada llega a EPEN y todo queda guardado solo en este navegador. «Restablecer el prototipo» vuelve a los trámites de ejemplo.</p>' +
      '<div class="botonera"><button class="boton boton--verde" value="ok">Entendido</button></div>' +
      '</form>';
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    if (typeof d.showModal === 'function') d.showModal();
    else d.remove();
  };

  const iniciarPrototipo = () => {
    const caja = document.querySelector('[data-acciones-prototipo]');
    if (!caja) return;
    const guia = document.createElement('button');
    guia.type = 'button';
    guia.className = 'prototipo__accion';
    guia.textContent = 'Cómo recorrerlo';
    guia.addEventListener('click', EPEN.mostrarGuia);
    caja.appendChild(guia);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'prototipo__accion';
    b.textContent = 'Restablecer el prototipo';
    b.addEventListener('click', () => {
      EPEN.confirmar({
        titulo: '¿Restablecer el prototipo?',
        texto: 'Se borran las solicitudes, respuestas y archivos que cargaste en este navegador, y vuelven los seis trámites de ejemplo.',
        aceptar: 'Sí, restablecer',
        cancelar: 'Cancelar'
      }).then((si) => {
        if (!si) return;
        EPEN.guardado.borrarTodo();
        EPEN.archivos.borrarTodo().then(() => {
          location.href = location.pathname;
        });
      });
    });
    caja.appendChild(b);
  };

  EPEN.alIniciar = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  EPEN.alIniciar(() => {
    iniciarMenu();
    iniciarPrototipo();
  });
})();
