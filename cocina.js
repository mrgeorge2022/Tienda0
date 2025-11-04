let API_URL = ""; // ← se cargará dinámicamente desde config.json
let pedidosGlobal = [];
let ultimaVersion = "";

// ================================
// 🔹 1. CARGAR CONFIG Y EMPEZAR
// ================================
async function init() {
  try {
    const res = await fetch("config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar config.json");

    const config = await res.json();
    API_URL = config.apiUrls.cocina || config.apiUrls.envioBaseDatos; // fallback si no existe "cocina"

    console.log("✅ API de cocina cargada:", API_URL);

    // Cargar pedidos iniciales
    cargarPedidos();
    setInterval(cargarPedidos, 2000);
  } catch (err) {
    console.error("⚠️ Error cargando configuración:", err);
  }
}

// ================================
// 🔹 2. CARGAR PEDIDOS
// ================================
async function cargarPedidos() {
  const contenedor = document.getElementById("lista-pedidos");

  try {
    const res = await fetch(`${API_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

    const pedidos = await res.json();
    const versionActual = JSON.stringify(pedidos);

    // Evita redibujar si no hay cambios
    if (versionActual === ultimaVersion) return;
    ultimaVersion = versionActual;

    // Formatea fecha
    pedidosGlobal = pedidos.map(p => {
      if (p.fecha && typeof p.fecha !== "string") {
        const d = new Date(p.fecha);
        const dia = String(d.getDate()).padStart(2, "0");
        const mes = String(d.getMonth() + 1).padStart(2, "0");
        const año = d.getFullYear();
        p.fecha = `${dia}/${mes}/${año}`;
      }
      return p;
    });

    filtrarPorFecha();
  } catch (err) {
    console.error("⚠️ Error cargando pedidos:", err);
    contenedor.innerHTML = `<p style="color:#ff7a00;">Error al cargar los pedidos, intenta recargar la página.</p>`;
  }
}

// ================================
// 🔹 3. FILTRAR POR FECHA
// ================================
function filtrarPorFecha() {
  const contenedor = document.getElementById("lista-pedidos");
  const resumenContenedor = document.getElementById("resumen-pedidos");
  contenedor.innerHTML = "";
  resumenContenedor.innerHTML = "";

  const valorFecha = document.getElementById("fecha").value;
  if (!valorFecha) return;

  const [año, mes, dia] = valorFecha.split("-");
  const fechaSeleccionada = `${dia}/${mes}/${año}`;
  const pedidosFiltrados = pedidosGlobal.filter(p => p.fecha === fechaSeleccionada);

  // 🔹 Totales por tipo
  const totales = { domicilio: 0, mesa: 0, recoger: 0 };
  pedidosFiltrados.forEach(p => {
    const tipo = (p.tipoEntrega || "").toLowerCase();
    if (tipo.includes("domicilio")) totales.domicilio++;
    else if (tipo.includes("mesa")) totales.mesa++;
    else if (tipo.includes("recoger")) totales.recoger++;
  });

  // 🔹 Mostrar resumen antes de la lista
  resumenContenedor.innerHTML = `
    <div class="resumen-item" style="--color:#66bb6a;">
      <span class="resumen-circulo"></span>
      Recoger: <strong>${totales.recoger}</strong>
    </div>
    <div class="resumen-item" style="--color:#29b6f6;">
      <span class="resumen-circulo"></span>
      Mesa: <strong>${totales.mesa}</strong>
    </div>
    <div class="resumen-item" style="--color:#ff7043;">
      <span class="resumen-circulo"></span>
      Domicilio: <strong>${totales.domicilio}</strong>
    </div>
    <div class="resumen-item total-general">
      Total: <strong>${pedidosFiltrados.length}</strong>
    </div>
  `;

  // 🔹 Sin pedidos
  if (!pedidosFiltrados.length) {
    contenedor.innerHTML = `<p>No hay pedidos para el ${fechaSeleccionada}.</p>`;
    return;
  }

  // 🔹 Mostrar pedidos
  const fragment = document.createDocumentFragment();
  pedidosFiltrados.slice().reverse().forEach(p => {
    const tipo = (p.tipoEntrega || "").toLowerCase();
    let claseTipo = "", icono = "📦 Otro";
    if (tipo.includes("domicilio")) { claseTipo = "domicilio"; icono = "Domicilio"; }
    else if (tipo.includes("mesa")) { claseTipo = "mesa"; icono = "Mesa"; }
    else if (tipo.includes("recoger")) { claseTipo = "recoger"; icono = "Recoger"; }

    const div = document.createElement("div");
    div.className = `pedido ${claseTipo}`;

    function extraerCantidad(producto) {
      const match = producto.match(/x\d+/i);
      return match ? match[0] : "";
    }

    let productosHTML = "";
    if (p.productos) {
      const productos = p.productos.split("\n");
      productos.forEach(prod => {
        let cantidad = extraerCantidad(prod);
        cantidad = cantidad.replace(/x/i, "");
        const resto = prod.replace(extraerCantidad(prod), "").trim();
        productosHTML += `
          <div class="cantidadproducto">
            <div class="producto-cantidad">${cantidad}</div>
            <div class="producto-detalle">${resto}</div>
          </div>
        `;
      });
    } else {
      productosHTML = "<div class='producto-item'>Sin productos</div>";
    }

    div.innerHTML = `
      <div class="tipo-entrega ${claseTipo}">${icono}</div>
      <div class="pedido-header">
        <div class="pedido-datos">
          <div class="pedido-numero"><strong>${p.numeroFactura || "Sin número"}</strong></div>
          <div class="pedido-hora">${p.hora || "--:--:--"}</div>
        </div>
      </div>

      <div class="pedido-cliente"><strong>Cliente:</strong> <span>${p.nombre || "Sin nombre"}</span></div>
      ${p.mesa ? `<div class="pedido-mesa"><strong>Mesa:</strong> <span>${p.mesa}</span></div>` : ""}
      <div class="pedido-productos productos">${productosHTML}</div>
      ${p.observaciones ? `
        <div class="pedido-observaciones observaciones">
          <em>OBSERVACIONES:</em> <span>${p.observaciones}</span>
        </div>` : ""}
    `;

    fragment.appendChild(div);
  });

  contenedor.appendChild(fragment);
}

// ================================
// 🔹 4. ACTUALIZAR ESTADO
// ================================
async function actualizarEstado(numeroFactura, tipo) {
  try {
    const payload = { accion: "actualizar", numeroFactura, tipo };
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) alert(`✅ Pedido ${numeroFactura} enviado (${tipo.toUpperCase()})`);
    else alert("❌ Error: " + (data.error || "Desconocido"));
  } catch (err) {
    alert("⚠️ No se pudo comunicar con el servidor");
    console.error(err);
  }
}

// ================================
// 🔹 5. FECHA POR DEFECTO
// ================================
const hoy = new Date();
const año = hoy.getFullYear();
const mes = String(hoy.getMonth() + 1).padStart(2, "0");
const dia = String(hoy.getDate()).padStart(2, "0");

const fechaInput = document.getElementById("fecha");
fechaInput.value = `${año}-${mes}-${dia}`;
fechaInput.addEventListener("change", filtrarPorFecha);

// ✅ Iniciar todo
init();
