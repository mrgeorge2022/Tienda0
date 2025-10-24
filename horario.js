// =====================================
// CONFIGURACIÓN
// =====================================
const SCHEDULE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOCBCR_1CsQJz9YljFyiL3YxgnvlUy_eEQMSmmIf9jvsCt0aO0RjoUD0yfTbq1_liXXQ/exec';
window.tiendaAbierta = false;

// =====================================
// UTILIDADES
// =====================================
function parseHour(value) {
  if (!value) return null;
  if (typeof value === "number") {
    const hh = Math.floor(value);
    const mm = Math.round((value - hh) * 60);
    return { h: hh, m: mm };
  }

  const s = String(value).trim();
  const match = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (match) {
    return { h: parseInt(match[1]), m: parseInt(match[2] || "0") };
  }
  return null;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// =====================================
// CARGAR DESDE GOOGLE SHEETS
// =====================================
async function loadSchedule() {
  try {
    const res = await fetch(SCHEDULE_APPS_SCRIPT_URL, {
      cache: "no-cache",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) throw new Error("No se pudo conectar con Google Sheets");

    const data = await res.json();

    const schedule = data.map(item => ({
      day: capitalize(item.dia),
      open: parseHour(item.apertura),
      close: parseHour(item.cierre),
      estado: item.estado === true || String(item.estado).toLowerCase() === "true"
    }));

    displaySchedule(schedule);
  } catch (err) {
    console.error("❌ Error al cargar horarios:", err);
    // Si falla, mostrar mensaje claro
    const el = document.getElementById("status-header");
    el.textContent = "No se pudo cargar el horario, intenta recargar la página.";
    el.style.background = "#e67e22";
  }
}

// =====================================
// DETERMINAR ESTADO ACTUAL
// =====================================
function displaySchedule(schedule) {
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const now = new Date();

  // Aseguramos que use horario Colombia (UTC-5)
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const currentDay = days[localNow.getDay()];
  const today = schedule.find(s => s.day === currentDay);

  if (!today || !today.estado) {
    setClosed("Hoy la tienda está cerrada.");
    window.tiendaAbierta = false;
    return;
  }

  const open = new Date(localNow);
  open.setHours(today.open.h, today.open.m, 0, 0);

  const close = new Date(localNow);
  close.setHours(today.close.h, today.close.m, 0, 0);

  // Si cierra pasada la medianoche (ej. 00:00)
  if (close <= open) close.setDate(close.getDate() + 1);

  if (localNow >= open && localNow <= close) {
    window.tiendaAbierta = true;
    const diffMin = Math.floor((close - localNow) / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    const closeText = h > 0
      ? `Cierra en ${h} hora(s) ${m} minuto(s)`
      : `Cierra en ${m} minuto(s)`;
    setOpen("¡La tienda está abierta!", closeText);
  } else {
    window.tiendaAbierta = false;
    const tomorrow = schedule[(localNow.getDay() + 1) % 7];
    const nextText = today.close.h < today.open.h
      ? `Abre más tarde hoy a las ${formatTime(today.open)}`
      : tomorrow && tomorrow.estado
      ? `Abre mañana a las ${formatTime(tomorrow.open)}`
      : `Abre próximamente`;
    setClosed("La tienda está cerrada.", nextText);
  }
}

function formatTime({ h, m }) {
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2,"0")} ${period}`;
}

// =====================================
// VISUALIZACIÓN
// =====================================
function setOpen(title, subtitle = "") {
  const header = document.getElementById("status-header");
  const sub = document.getElementById("status-subtext");
  header.style.background = "#27ae27";
  header.style.color = "#fff";
  header.textContent = title;
  sub.textContent = subtitle;
}

function setClosed(title, subtitle = "") {
  const header = document.getElementById("status-header");
  const sub = document.getElementById("status-subtext");
  header.style.background = "#e74c3c";
  header.style.color = "#fff";
  header.textContent = title;
  sub.textContent = subtitle;
}

// =====================================
// AUTOEJECUCIÓN Y REFRESCO
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  loadSchedule();
  // Refresca cada 1 min por si el horario cambia en Sheets
  setInterval(loadSchedule, 1 * 60 * 1000);
});
