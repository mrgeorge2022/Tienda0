// ================================
// 🗺️ MAPA LEAFLET - DOMICILIO CON RUTA, COSTO Y BUSCADOR INTELIGENTE + ICONOS PERSONALIZADOS
// ================================
let map, markerUsuario, routingControl;
const tiendaCoords = [10.373750, -75.473580]; // 📍 Coordenadas de la tienda
let costoDomicilio = 0;

// ================================
// 🎨 ÍCONOS PERSONALIZADOS
// ================================
const tiendaIcon = L.icon({
  iconUrl: "img/icono_tienda.png",
  iconSize: [40, 40],       // ancho y alto reales de tu imagen
  iconAnchor: [20, 40],     // mitad del ancho, base de la imagen
  popupAnchor: [0, -40],    // igual altura pero negativa para que el popup no se sobreponga
});


const usuarioIcon = L.icon({
  iconUrl: "iconos/pinubicacion.png",
  iconSize: [45, 45],
  iconAnchor: [22.5, 45],   // mitad del ancho, base de la imagen
  popupAnchor: [0, -45],
});


// ================================
// 🗺️ INICIALIZAR MAPA
// ================================
function initMap() {
  map = L.map("map").setView(tiendaCoords, 13);

  // 🌍 Capa base moderna - Carto Light
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> | <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  // 🗺️ Mover controles de zoom
  map.zoomControl.setPosition("bottomleft");

  // 🏪 Marcador de la tienda
  const markerTienda = L.marker(tiendaCoords, { icon: tiendaIcon }).addTo(map);
  markerTienda.bindPopup("<b>Mr. George</b><br>📍 Tienda principal");

  // 👤 Marcador del usuario (creado pero NO agregado al mapa aún)
  markerUsuario = L.marker(tiendaCoords, {
    icon: usuarioIcon,
    draggable: true,
  });

  // Evento: mover marcador del usuario
  markerUsuario.on("dragend", async () => {
    const { lat, lng } = markerUsuario.getLatLng();
    await detectarDireccion(lat, lng);
    calcularRutaYCostos([lat, lng]);
  });

  // Evento: clic en el mapa → mover marcador usuario
  map.on("click", async (e) => {
    const { lat, lng } = e.latlng;
    await mostrarMarcadorUsuario(lat, lng);
    await detectarDireccion(lat, lng);
    calcularRutaYCostos([lat, lng]);
  });
}

// ================================
// 🟢 FUNCION: Mostrar marcador del usuario
// ================================
async function mostrarMarcadorUsuario(lat, lng) {
  markerUsuario.setLatLng([lat, lng]);
  if (!map.hasLayer(markerUsuario)) {
    markerUsuario.addTo(map);
  }
}

// ================================
// 📍 BOTÓN: UBICACIÓN ACTUAL
// ================================
document.getElementById("btn-ubicacion").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);
      await mostrarMarcadorUsuario(latitude, longitude);
      await detectarDireccion(latitude, longitude);
      calcularRutaYCostos([latitude, longitude]);
    },
    () => alert("No se pudo obtener la ubicación actual.")
  );
});

// ================================
// 🔍 BUSCADOR INTELIGENTE
// ================================
const searchInput = document.getElementById("buscar");
const suggestionsEl = document.getElementById("suggestions");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();
  suggestionsEl.innerHTML = "";
  if (!query) {
    suggestionsEl.style.display = "none";
    return;
  }

  const coords = extraerCoordenadas(query);
  if (coords) {
    const { lat, lon } = coords;
    const div = document.createElement("div");
    div.textContent = `📍 Ir a coordenadas: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    div.addEventListener("click", async () => {
      searchInput.value = `${lat}, ${lon}`;
      suggestionsEl.style.display = "none";
      map.setView([lat, lon], 16);
      await mostrarMarcadorUsuario(lat, lon);
      detectarDireccion(lat, lon);
      calcularRutaYCostos([lat, lon]);
    });
    suggestionsEl.appendChild(div);
  }

  if (query.length > 3 && !coords) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ", Cartagena"
        )}`
      );
      const data = await res.json();
      data.slice(0, 4).forEach((place) => {
        const div = document.createElement("div");
        div.textContent = `📍 ${place.display_name}`;
        div.addEventListener("click", async () => {
          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);
          searchInput.value = place.display_name;
          suggestionsEl.style.display = "none";
          map.setView([lat, lon], 15);
          await mostrarMarcadorUsuario(lat, lon);
          detectarDireccion(lat, lon);
          calcularRutaYCostos([lat, lon]);
        });
        suggestionsEl.appendChild(div);
      });
    } catch (error) {
      console.warn("🌐 Error con Nominatim:", error);
    }
  }

  suggestionsEl.style.display = "block";
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".overlay")) suggestionsEl.style.display = "none";
});

// ================================
// 🧠 DETECTAR DIRECCIÓN REAL
// ================================
async function detectarDireccion(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    const data = await res.json();

    if (data && data.display_name) {
      const input = document.getElementById("buscar");
      input.value = data.display_name;

      const popupContent = `
        <div style="position: relative; padding-right: 20px;">
          <span id="closePopupBtn" 
            style="position: absolute; right: 0; top: 0; cursor: pointer; color: #555; font-weight: bold;">
            ✖
          </span>
          <div style="margin-top: 5px;">
            📍 <b>${data.address.road || "Dirección"}</b><br>
            ${data.display_name}
          </div>
        </div>
      `;

      const popup = L.popup({
        offset: [0, -10],
        closeButton: false,
        autoClose: true,
      })
        .setLatLng([lat, lon])
        .setContent(popupContent)
        .openOn(map);

      setTimeout(() => {
        const closeBtn = document.getElementById("closePopupBtn");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            map.closePopup(popup);
          });
        }
      }, 100);
    }
  } catch (error) {
    console.error("❌ Error al detectar dirección:", error);
  }
}

// ================================
// 📏 FUNCIÓN: Extraer coordenadas
// ================================
function extraerCoordenadas(texto) {
  const limpio = texto
    .replace(/[^\d.,@-]/g, "")
    .replace("@", "")
    .replace("[", "")
    .replace("]", "")
    .trim();

  const partes = limpio.split(/[, ]+/).filter(Boolean);
  if (partes.length >= 2) {
    const lat = parseFloat(partes[0].replace(",", "."));
    const lon = parseFloat(partes[1].replace(",", "."));
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }
  return null;
}

// ================================
// 🚗 CALCULAR RUTA Y COSTOS
// ================================
function calcularRutaYCostos(destino) {
  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(tiendaCoords[0], tiendaCoords[1]),
      L.latLng(destino[0], destino[1]),
    ],
    lineOptions: {
      styles: [
        { color: "rgba(255,255,255,0.25)", weight: 8 },
        { color: "#007bff", weight: 5, opacity: 0.8 },
      ],
    },
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    createMarker: () => null,
    show: false,
  })
    .on("routesfound", (e) => {
      const distanciaKm = e.routes[0].summary.totalDistance / 1000;
      let costo = Math.round(distanciaKm * 1000);
      if (costo < 3000) costo = 3000;
      costoDomicilio = costo;
      actualizarCostos();
    })
    .addTo(map);

  const style = document.createElement("style");
  style.innerHTML = `.leaflet-routing-container { display: none !important; }`;
  document.head.appendChild(style);
}

// ================================
// 💰 ACTUALIZAR COSTOS
// ================================
function actualizarCostos() {
  const subtotal = Number(localStorage.getItem("cartTotal")) || 0;
  const total = subtotal + costoDomicilio;

  const formatoPesos = (valor) =>
    valor.toLocaleString("es-CO", { minimumFractionDigits: 0 });

  document.getElementById("subtotal").textContent = `$${formatoPesos(subtotal)}`;
  document.getElementById("domicilio-cost").textContent = costoDomicilio
    ? `$${formatoPesos(costoDomicilio)}`
    : "$0";
  document.getElementById("total").textContent = `$${formatoPesos(total)}`;
}

// ================================
// 🧾 FINALIZAR PEDIDO
// ================================
function finalizarPedido() {
  const ref = document.getElementById("referencia").value.trim();
  const { lat, lng } = markerUsuario.getLatLng();
  alert(`✅ Dirección confirmada\nLat: ${lat}\nLng: ${lng}\nRef: ${ref}`);
}

// ================================
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  actualizarCostos();
});
