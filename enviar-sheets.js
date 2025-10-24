// ==========================================
// 🧾 RECOLECTAR Y ENVIAR PEDIDO A GOOGLE SHEETS
// ==========================================

// Recolecta los datos desde el objeto "pedido" que ya generas en domicilio.js
function recolectarDatosParaSheets(pedido) {
  // 🛒 Convertir productos a texto con formato legible
  const productosFormateados = (pedido.productos || [])
    .map(p => {
      const instrucciones = p.instrucciones ? ` (${p.instrucciones})` : "";
      return `${p.nombre} x${p.cantidad} - $${p.precio}${instrucciones}`;
    })
    .join("\n");

  // Convertir a números para evitar concatenaciones de strings
  const totalProductos = Number(pedido.subtotal || 0);
  const costoDomicilio = Number(pedido.costoDomicilio || 0);

  // Calcular total a pagar
  const totalPagar = totalProductos + costoDomicilio;

  // 🧮 Crear objeto limpio con las columnas esperadas por el Apps Script
  const datos = {
    tipoEntrega: pedido.tipoEntrega || "",
    numeroFactura: pedido.factura || "",
    fecha: pedido.fecha || "",
    hora: pedido.hora || "",
    nombre: pedido.cliente?.nombre || "",
    telefono: pedido.cliente?.telefono || "",
    mesa: pedido.cliente?.mesa || "",
    direccion: pedido.direccion || "",
    puntoReferencia: pedido.referencia || "",
    productos: productosFormateados || "",
    totalProductos: totalProductos,
    costoDomicilio: costoDomicilio,
    totalPagar: totalPagar,
    metodoPago: pedido.metodoPago || "No especificado",
    ubicacionGoogleMaps: pedido.ubicacion || "",
    observaciones: pedido.observaciones || ""
  };

  return datos;
}


// ==========================================
// 🚀 ENVIAR DATOS A GOOGLE SHEETS
// ==========================================

async function enviarPedidoASheets(pedido) {
  const datos = recolectarDatosParaSheets(pedido);

  // ✅ URL de tu Apps Script publicado como web app
  const scriptURL =
    "https://script.google.com/macros/s/AKfycbwez78KX4oEXCGWV_olvy_J1C8YwURxN-1YaZiYYqQJPVLAJuaRI_5EVl4v14OMjonM/exec";

  try {
    await fetch(scriptURL, {
      method: "POST",
      mode: "no-cors", // 👈 evita errores CORS en navegador
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datos),
    });

    console.log("✅ Pedido enviado correctamente a Google Sheets");
  } catch (err) {
    console.error("❌ Error al enviar pedido a Sheets:", err);
  }
}
