// ============================================
// 📩 ENVIAR PEDIDO A WHATSAPP (CON FORMATO)
// ============================================

function enviarPedidoWhatsApp(pedido) {
  const {
    tipoEntrega,
    factura,
    fecha,
    hora,
    cliente,
    direccion,
    referencia,
    productos,
    subtotal,
    costoDomicilio,
    total,
    metodoPago,
    propina,
    totalConPropina,
    observaciones,
    ubicacion,
  } = pedido;

  // 💰 Formato pesos colombiano
  const formatoPesos = (valor) =>
    `$${valor?.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;

  // 🧾 CABECERA
  let msg = `*${tipoEntrega.toUpperCase()}*\n\n`;
  msg += `*FACTURA Nº:* ${factura}\n\n`;
  msg += `*FECHA:* ${fecha}\n`;
  msg += `*HORA:* ${hora}\n\n`;

  // 👤 DATOS DEL USUARIO
  msg += `*DATOS DEL USUARIO:*\n`;
  msg += `*NOMBRE:* ${cliente?.nombre || "Sin nombre"}\n`;
  msg += `*TELÉFONO:* ${cliente?.telefono || "Sin teléfono"}\n\n`;

  // 🏠 Datos adicionales solo si es domicilio
  if (tipoEntrega === "Domicilio") {
    msg += `*DIRECCIÓN:* ${direccion || "Sin dirección"}\n`;
    msg += `*PUNTO DE REFERENCIA:* ${referencia || "Sin referencia"}\n\n`;
  }

  // 🛒 PRODUCTOS
  msg += `*PRODUCTOS SELECCIONADOS:*\n\n`;
  productos.forEach((p) => {
    const lineaProducto = `*x${p.cantidad} - ${p.nombre} - ${formatoPesos(
      p.precio
    )} = ${formatoPesos(p.precio * p.cantidad)}*`;
    msg += `${lineaProducto}\n`;

    if (p.instrucciones && p.instrucciones.trim() !== "") {
      msg += `_${p.instrucciones.trim()}_\n\n`;
    } else {
      msg += `__\n`; // Si no hay instrucciones
    }
  });

  // 💵 TOTALES
  msg += `\n*TOTAL PRODUCTOS:* ${formatoPesos(subtotal)}\n`;
  if (costoDomicilio)
    msg += `*COSTO DE DOMICILIO:* ${formatoPesos(costoDomicilio)}\n\n`;

  msg += `*TOTAL A PAGAR:* ${formatoPesos(total)}\n`;
  msg += `*MÉTODO DE PAGO:* ${metodoPago}\n\n`;

  msg += `*PROPINA VOLUNTARIA (10%):* ${formatoPesos(propina)}\n`;
  msg += `*TOTAL CON PROPINA:* ${formatoPesos(totalConPropina)}\n\n`;

  // 📝 Observaciones
  msg += `*OBSERVACIONES:*\n${observaciones || "____"}\n\n`;

  // 📍 Ubicación
  if (ubicacion) {
    msg += `*Ubicación en Google Maps:*\n${ubicacion}\n\n`;
  }

  msg += `*Envía tu pedido aqui --------->*`;

  // ✅ Número de WhatsApp de la tienda
  const numeroWhatsApp = "573022666530";

  const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");




// ✅ Guardar pedido
  localStorage.setItem("lastPedido", JSON.stringify(pedido));

  // ✅ Mostrar modal
  mostrarModalFactura();
}

// ============================================
// 🪟 MODAL: ¿Desea imprimir la factura?
// ============================================

function mostrarModalFactura() {
  // Crear modal
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,0.6)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  modal.innerHTML = `
    <div style="
      background:#fff;
      border-radius:12px;
      padding:20px;
      width:300px;
      text-align:center;
      font-family:Arial,sans-serif;
      box-shadow:0 4px 10px rgba(0,0,0,0.3);
      animation:fadeIn .3s ease;">
      <h3 style="margin-bottom:12px;color:#222">✅ Pedido enviado</h3>
      <p style="font-size:14px;color:#555;margin-bottom:20px">
        ¿Deseas imprimir la factura o volver al inicio?
      </p>
      <button id="btn-factura" style="
        background:#000;
        color:#fff;
        border:none;
        padding:8px 14px;
        border-radius:6px;
        cursor:pointer;
        margin-right:10px;">
        🖨️ Imprimir
      </button>
      <button id="btn-inicio" style="
        background:#f0f0f0;
        border:none;
        padding:8px 14px;
        border-radius:6px;
        cursor:pointer;">
        🏠 Inicio
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Acción: imprimir factura
  modal.querySelector("#btn-factura").addEventListener("click", () => {
    window.open("factura.html", "_blank");
    modal.remove();
  });

  // Acción: volver al inicio y limpiar todo
  modal.querySelector("#btn-inicio").addEventListener("click", () => {
    modal.remove();

    // 🧹 Limpiar completamente el localStorage y sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log("🧹 Todo el almacenamiento fue limpiado correctamente.");
    } catch (e) {
      console.warn("⚠️ Error al limpiar localStorage:", e);
    }

    // 🔄 Redirigir al inicio
    window.location.href = "index.html";
  });
}
