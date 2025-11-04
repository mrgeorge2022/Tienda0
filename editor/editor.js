// ============================================================================
// 🧩 EDITOR DE CONFIGURACIÓN - TIENDA
// Archivo: editor.js
// Descripción: Editor visual para modificar config.json y descargar cambios.
// ============================================================================

// ============================================================================
// 🔹 VARIABLES GLOBALES
// ============================================================================
let originalConfig = {};
let configModificado = false;

// ============================================================================
// 🚀 INICIALIZACIÓN PRINCIPAL
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("editor-container");
  const btn = document.getElementById("btn-action");

  try {
    const res = await fetch("../config.json");
    if (!res.ok) throw new Error("No se pudo cargar config.json");
    originalConfig = await res.json();
  } catch (err) {
    container.innerHTML = `<p style="color:red;text-align:center;">❌ Error al cargar config.json: ${err.message}</p>`;
    return;
  }

  renderEditor(originalConfig);
  actualizarBoton(false);

  btn.addEventListener("click", () => {
    if (configModificado) {
      const updatedConfig = collectConfig();
      downloadJSON(updatedConfig);
    } else {
      alert("✅ Configuración aceptada sin cambios.");
    }
  });
});

// ============================================================================
// 🧱 RENDERIZAR EDITOR COMPLETO
// ============================================================================
function renderEditor(config) {
  const c = document.getElementById("editor-container");
  c.innerHTML = `
    <!-- 🏠 INFORMACIÓN GENERAL -->
    <div id="seccion-general" class="section">
      <h2 id="titulo-general">🏠 Información General</h2>
      <div id="general-contenido">
        ${renderInput("tituloPagina", config.tituloPagina, "Título de la pestaña", "Texto que aparece en la pestaña del navegador y buscadores.")}
        ${renderInput("nombreRestaurante", config.nombreRestaurante, "Nombre del Restaurante", "Nombre visible de la tienda.")}
        ${renderInput("logo", config.logo, "Logo principal", "Ruta o URL del logo mostrado en la cabecera.")}
        ${renderInput("footerLogo", config.footerLogo, "Logo del pie de página", "Logo mostrado en el footer.")}
        ${renderInput("footerQR", config.footerQR, "Código QR del footer", "Imagen del código QR en el pie de página.")}
        ${renderInput("numeroWhatsAppMensajes", config.numeroWhatsAppMensajes, "Número de WhatsApp para mensajes", "Número al cual se enviarán los pedidos de WhatsApp.")}
        ${renderInput("crearTienda", config.crearTienda, "Enlace 'Crear Tienda'", "URL que se abre al pulsar el botón 'Crea tu tienda aquí'.")}
      </div>
    </div>

    <!-- 🎨 COLORES -->
    <div id="seccion-colores" class="section">
      <h2 id="titulo-colores">🎨 Colores del Tema</h2>
      <div id="contenedor-colores">
        ${Object.entries(config.colores || {}).map(([k, v]) =>
          renderColorInput(`color-${k}`, v, k, obtenerDescripcionColor(k))
        ).join('')}
      </div>
    </div>

    <!-- 🍽️ CATEGORÍAS -->
    <div id="seccion-categorias" class="section">
      <h2 id="titulo-categorias">🍽️ Categorías del Menú</h2>
      <p id="descripcion-categorias" style="color:#666;font-size:0.9rem;margin-top:-5px;">
        Cada categoría representa una sección de productos en el menú (por ejemplo: Almuerzos, Bebidas...).
      </p>
      <div id="categorias-container">
        ${(config.categorias || []).map((cat, i) => renderCategoria(cat, i)).join('')}
      </div>
      <button id="btn-agregar-categoria" onclick="addCategory()">➕ Agregar Categoría</button>
    </div>

    <!-- 🌐 REDES SOCIALES -->
    <div id="seccion-redes" class="section">
      <h2 id="titulo-redes">🌐 Redes Sociales</h2>
      <div id="contenedor-redes">
        ${Object.entries(config.redes || {}).map(([k, v]) =>
          renderInput(`red-${k}`, v, k, `URL de tu ${k}.`)
        ).join('')}
      </div>
    </div>

    <!-- 🏢 SEDE -->
    <div id="seccion-sede" class="section">
      <h2 id="titulo-sede">🏢 Información de la Sede</h2>
      <div id="contenedor-sede">
        ${renderInput("sede-nombre", config.sede?.nombre, "Nombre de la sede", "Nombre o descripción corta.")}
        ${renderInput("sede-direccion", config.sede?.direccion, "Dirección", "Dirección completa del restaurante.")}
        ${renderInput("sede-telefono", config.sede?.telefono, "Teléfono", "Número de contacto del restaurante.")}
        ${renderInput("sede-lat", config.coordenadasSede?.[0], "Latitud", "Coordenada de latitud.")}
        ${renderInput("sede-lng", config.coordenadasSede?.[1], "Longitud", "Coordenada de longitud.")}
      </div>
    </div>

    <!-- 🔗 APIs -->
    <div id="seccion-apis" class="section">
      <h2 id="titulo-apis">🔗 Enlaces a APIs</h2>
      <div id="contenedor-apis">
        ${Object.entries(config.apiUrls || {}).map(([k, v]) =>
          renderInput(`api-${k}`, v, k, descripcionApi(k))
        ).join('')}
      </div>
    </div>
  `;

  // Escuchar cambios
  c.querySelectorAll("input, textarea, input[type=color]").forEach(input => {
    input.addEventListener("input", () => handleChange(input));
  });
}

// ============================================================================
// 🧩 RENDERIZADORES DE CAMPOS
// ============================================================================

// 🔹 Campos normales
function renderInput(id, value = "", label = "", descripcion = "") {
  return `
    <div class="campo" id="campo-${id}">
      ${label ? `<label for="${id}" class="etiqueta">${label}</label>` : ""}
      <input id="${id}" class="input" value="${value || ""}">
      ${descripcion ? `<small class="descripcion">${descripcion}</small>` : ""}
    </div>
  `;
}

// 🔹 Campos de color (simples o especiales)
function renderColorInput(id, value = "", label = "", descripcion = "") {
  const key = id.replace("color-", "");
  const isSpecial = ["--bg-body", "--card-bg", "--accent"].includes(key);
  const isSimpleColor = /^#|^rgb/i.test(value.trim());

  // 🎨 Campos normales
  if (!isSpecial) {
    return `
      <div class="color-row">
        <label>${label}</label>
        <div class="color-picker-container">
          ${isSimpleColor ? `<input type="color" id="${id}-picker" value="${parseColor(value)}">` : ""}
          <input id="${id}" value="${value || ""}" style="width:${isSimpleColor ? "70%" : "100%"};">
          <div class="preview" id="${id}-preview" style="background:${value};"></div>
        </div>
        ${descripcion ? `<small>${descripcion}</small>` : ""}
      </div>
    `;
  }

  // 🧠 Campos especiales (Color / Degradado / Imagen)
  return `
    <div class="color-row especial-bg">
      <div class="color-header">
        <label>${label}</label>
        <div class="color-options">
          <label><input type="radio" name="${id}-type" value="color" checked> Color</label>
          <label><input type="radio" name="${id}-type" value="gradient"> Degradado</label>
          <label><input type="radio" name="${id}-type" value="image"> Imagen</label>
        </div>
      </div>
      <div class="color-picker-container">
        <input type="color" id="${id}-color" value="${parseColor(value)}" style="display:none;">
        <textarea id="${id}-gradient" placeholder="Ej: linear-gradient(135deg, #FFD700, #000000)" style="display:none;width:70%;height:40px;">${value.includes('gradient') ? value : ''}</textarea>
        <input type="text" id="${id}-image" placeholder="Ej: url('img/fondo.jpg')" value="${value.includes('url(') ? value : ''}" style="display:none;width:70%;">
        <div class="preview" id="${id}-preview" style="background:${value};"></div>
      </div>
      ${descripcion ? `<small>${descripcion}</small>` : ""}
    </div>
  `;
}

// ============================================================================
// 🎨 EVENTOS DE COLOR EN VIVO Y TIPOS (color, gradient, image)
// ============================================================================
document.addEventListener("change", e => {
  if (e.target.name && e.target.name.endsWith("-type")) {
    const baseId = e.target.name.replace("-type", "");
    const tipo = e.target.value;
    ["color", "gradient", "image"].forEach(t => {
      document.getElementById(`${baseId}-${t}`).style.display = tipo === t ? "inline-block" : "none";
    });
    actualizarVistaPreviaBG(baseId);
  }
});

document.addEventListener("input", e => {
  if (e.target.id.startsWith("color---bg-body") || e.target.id.startsWith("color---card-bg") || e.target.id.startsWith("color---accent")) {
    const baseId = e.target.id.split(/-(color|gradient|image)/)[0];
    actualizarVistaPreviaBG(baseId);
  }
});

function actualizarVistaPreviaBG(baseId) {
  const tipo = document.querySelector(`input[name="${baseId}-type"]:checked`)?.value;
  const preview = document.getElementById(`${baseId}-preview`);
  let valor = "";

  if (tipo === "color") valor = document.getElementById(`${baseId}-color`).value;
  if (tipo === "gradient") valor = document.getElementById(`${baseId}-gradient`).value;
  if (tipo === "image") valor = document.getElementById(`${baseId}-image`).value;

  preview.style.background = valor;
  document.getElementById(baseId).value = valor;
}

// ============================================================================
// 🎨 UTILIDADES DE COLOR Y DESCRIPCIÓN
// ============================================================================
function parseColor(value) {
  if (value.startsWith("#")) return value;
  const rgbMatch = value.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  return "#000000";
}

function obtenerDescripcionColor(nombre) {
  const map = {
    "--bg-body": "Fondo principal de la página. Puede ser color, degradado o imagen.",
    "--card-bg": "Fondo de las tarjetas de producto.",
    "--accent": "Color de acento y botones.",
    "--muted": "Color de texto secundario.",
    "--primary-1": "Color principal del tema.",
    "--primary-2": "Variante oscura del color principal.",
    "--primary-3": "Variante clara del color principal.",
    "--text-color": "Color del texto principal.",
    "--textarea": "Color del fondo de áreas de texto.",
    "--quantitymodaltext": "Color del texto dentro del modal de cantidad."
  };
  return map[nombre] || "Variable de color personalizada.";
}

function descripcionApi(nombre) {
  const map = {
    productos: "URL del script que carga los productos.",
    horario: "URL del script que obtiene los horarios.",
    envioBaseDatos: "URL del script que guarda los pedidos.",
    cocina: "URL del script que gestiona los pedidos en cocina (actualiza estados)."
    
  };
  return map[nombre] || "URL de una API personalizada.";
}

// ============================================================================
// 🍽️ CATEGORÍAS DEL MENÚ
// ============================================================================
function renderCategoria(cat, i) {
  return `
    <div class="category-row" data-index="${i}">
      <input placeholder="ID" value="${cat.id}">
      <input placeholder="Emoji" value="${cat.emoji}">
      <input placeholder="Nombre" value="${cat.nombre}">
      <button onclick="removeCategory(${i})">✖</button>
    </div>
  `;
}

function addCategory() {
  const c = document.getElementById("categorias-container");
  const div = document.createElement("div");
  div.className = "category-row";
  div.innerHTML = `
    <input placeholder="ID">
    <input placeholder="Emoji">
    <input placeholder="Nombre">
    <button onclick="this.parentElement.remove()">✖</button>
  `;
  c.appendChild(div);
  configModificado = true;
  actualizarBoton(true);
}

function removeCategory(i) {
  document.querySelector(`[data-index="${i}"]`)?.remove();
  configModificado = true;
  actualizarBoton(true);
}

// ============================================================================
// 🟩 DETECCIÓN Y GUARDADO DE CAMBIOS
// ============================================================================
function handleChange(input) {
  const id = input.id || "";
  const valorActual = input.value.trim();
  const original = buscarValorOriginal(id);

  if (valorActual !== original) {
    input.style.background = "#d4edda";
    configModificado = true;
  } else {
    input.style.background = "";
    verificarSiTodoIgual();
  }
  actualizarBoton(configModificado);
}

function buscarValorOriginal(id) {
  if (id.startsWith("color-")) return originalConfig.colores?.[id.replace("color-", "")] || "";
  if (id.startsWith("red-")) return originalConfig.redes?.[id.replace("red-", "")] || "";
  if (id.startsWith("api-")) return originalConfig.apiUrls?.[id.replace("api-", "")] || "";
  const mapa = {
    "tituloPagina": originalConfig.tituloPagina,
    "nombreRestaurante": originalConfig.nombreRestaurante,
    "logo": originalConfig.logo,
    "footerLogo": originalConfig.footerLogo,
    "footerQR": originalConfig.footerQR,
    "crearTienda": originalConfig.crearTienda,
    "sede-nombre": originalConfig.sede?.nombre,
    "sede-direccion": originalConfig.sede?.direccion,
    "sede-telefono": originalConfig.sede?.telefono,
    "sede-lat": originalConfig.coordenadasSede?.[0]?.toString(),
    "sede-lng": originalConfig.coordenadasSede?.[1]?.toString(),
    "numeroWhatsAppMensajes": originalConfig.numeroWhatsAppMensajes,

  };
  return mapa[id] ?? "";
}

function verificarSiTodoIgual() {
  const inputs = document.querySelectorAll("input, textarea");
  const iguales = Array.from(inputs).every(inp => inp.style.background === "");
  configModificado = !iguales;
}

function actualizarBoton(hayCambios) {
  const btn = document.getElementById("btn-action");
  if (hayCambios) {
    btn.textContent = "💾 Descargar JSON actualizado";
    btn.classList.add("cambios");
  } else {
    btn.textContent = "✅ Aceptar configuración";
    btn.classList.remove("cambios");
  }
}

// ============================================================================
// 💾 RECOLECCIÓN Y DESCARGA DEL JSON
// ============================================================================
function collectConfig() {
  const cfg = structuredClone(originalConfig);
  const get = id => document.getElementById(id)?.value || "";

  // --- Información general
  cfg.tituloPagina = get("tituloPagina");
  cfg.nombreRestaurante = get("nombreRestaurante");
  cfg.logo = get("logo");
  cfg.footerLogo = get("footerLogo");
  cfg.footerQR = get("footerQR");
  cfg.crearTienda = get("crearTienda");
  cfg.numeroWhatsAppMensajes = get("numeroWhatsAppMensajes");


  // --- Colores
  cfg.colores = {};
  document.querySelectorAll("[id^='color-']").forEach(el => {
    if (!el.id.endsWith("-picker")) cfg.colores[el.id.replace("color-", "")] = el.value;
  });

  // --- Redes sociales
  cfg.redes = {};
  document.querySelectorAll("[id^='red-']").forEach(el => cfg.redes[el.id.replace("red-", "")] = el.value);

  // --- Sede
  cfg.sede = {
    nombre: get("sede-nombre"),
    direccion: get("sede-direccion"),
    telefono: get("sede-telefono")
  };
  cfg.coordenadasSede = [
    parseFloat(get("sede-lat")) || 0,
    parseFloat(get("sede-lng")) || 0
  ];

  // --- APIs
  cfg.apiUrls = {};
  document.querySelectorAll("[id^='api-']").forEach(el => cfg.apiUrls[el.id.replace("api-", "")] = el.value);

  // --- Categorías
  cfg.categorias = Array.from(document.querySelectorAll("#categorias-container .category-row")).map(row => {
    const [id, emoji, nombre] = row.querySelectorAll("input");
    return { id: id.value, emoji: emoji.value, nombre: nombre.value };
  });

  return cfg;
}

function downloadJSON(obj) {
  const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
  const a = document.createElement("a");
  a.href = dataStr;
  a.download = "config.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============================================================================
// 🎨 PREVIEW EN VIVO DE COLORES (GENERAL)
// ============================================================================
document.addEventListener("input", e => {
  if (e.target.id?.startsWith("color-")) {
    const id = e.target.id;
    const preview = document.getElementById(id + "-preview");
    if (preview) preview.style.background = e.target.value;
  }
  if (e.target.id?.endsWith("-picker")) {
    const idBase = e.target.id.replace("-picker", "");
    const inputTexto = document.getElementById(idBase);
    const preview = document.getElementById(idBase + "-preview");
    if (inputTexto) inputTexto.value = e.target.value;
    if (preview) preview.style.background = e.target.value;
  }
});
