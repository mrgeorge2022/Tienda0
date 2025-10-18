// ===============================
// CONFIGURACIÓN
// ===============================
const SCHEDULE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOCBCR_1CsQJz9YljFyiL3YxgnvlUy_eEQMSmmIf9jvsCt0aO0RjoUD0yfTbq1_liXXQ/exec';

const defaultSchedule = [
    { day: 'Lunes', open: '11:00', close: '00:00', estado: true },
    { day: 'Martes', open: '11:00', close: '00:00', estado: true },
    { day: 'Miércoles', open: '11:00', close: '00:00', estado: false },
    { day: 'Jueves', open: '11:00', close: '00:00', estado: true },
    { day: 'Viernes', open: '11:00', close: '00:00', estado: true },
    { day: 'Sábado', open: '11:00', close: '00:00', estado: true },
    { day: 'Domingo', open: '11:00', close: '00:00', estado: true }
];

// ===============================
// VARIABLE GLOBAL COMPARTIDA
// ===============================
window.tiendaAbierta = false; // <- esta variable se usará en script.js

// ===============================
// UTILIDADES
// ===============================
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function parseHour(v) {
    if (v === undefined || v === null) return '00:00';
    if (typeof v === 'number' && !isNaN(v)) {
        const hh = Math.floor(v) % 24;
        let mm = Math.round((v - hh) * 60);
        if (mm === 60) mm = 0;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }

    let s = String(v).trim().replace(',', '.');
    if (/^\d{1,2}\.\d+$/.test(s)) {
        const f = parseFloat(s);
        const hh = Math.floor(f) % 24;
        let mm = Math.round((f - hh) * 60);
        if (mm === 60) mm = 0;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }

    const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    if (m) {
        const hh = parseInt(m[1], 10) % 24;
        const mm = m[2] ? parseInt(m[2], 10) : 0;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }

    return '00:00';
}

// ===============================
// FUNCIÓN PRINCIPAL
// ===============================
async function loadSchedule() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(SCHEDULE_APPS_SCRIPT_URL, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-cache',
            headers: { 'Accept': 'application/json' }
        });

        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Error al conectar con Google Sheets: ${response.status}`);

        const rawData = await response.json();

        const scheduleData = rawData.map(item => ({
            day: capitalize(item.dia),
            open: parseHour(item.apertura),
            close: parseHour(item.cierre),
            estado: item.estado === true || String(item.estado).toLowerCase() === 'true' || String(item.estado) === '1'
        }));

        displaySchedule(scheduleData);
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        displaySchedule(defaultSchedule);
    }
}

// ===============================
// VISUALIZACIÓN DE ESTADO
// ===============================
function displaySchedule(scheduleData) {
    const today = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDay = days[today.getDay()];
    updateStatus(scheduleData, currentDay);
}

function updateStatus(scheduleData, currentDay) {
    const statusHeader = document.getElementById('status-header');
    const now = new Date();
    const todaySchedule = scheduleData.find(item => item.day === currentDay);

    if (!todaySchedule || !todaySchedule.estado) {
        window.tiendaAbierta = false;
        setClosed(statusHeader, 'Hoy la tienda está cerrada.');
        return;
    }

    const [openHour, openMinute] = todaySchedule.open.split(':').map(Number);
    const [closeHour, closeMinute] = todaySchedule.close.split(':').map(Number);
    const openTime = new Date();
    openTime.setHours(openHour, openMinute, 0, 0);
    const closeTime = new Date();
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    // Está abierta
    if (now >= openTime && now <= closeTime) {
        window.tiendaAbierta = true;
        const timeUntilClose = closeTime - now;
        const hours = Math.floor(timeUntilClose / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilClose % (1000 * 60 * 60)) / (1000 * 60));
        const closeText =
            hours > 0
                ? `Cierra en ${hours} hora${hours > 1 ? 's' : ''} ${minutes} minuto${minutes !== 1 ? 's' : ''}`
                : minutes > 0
                ? `Cierra en ${minutes} minuto${minutes !== 1 ? 's' : ''}`
                : `Cierra pronto.`;
        setOpen(statusHeader, '¡La tienda está abierta!', closeText);
    } else {
        window.tiendaAbierta = false;
        const nextOpen = new Date(openTime);
        if (now > openTime) nextOpen.setDate(nextOpen.getDate() + 1);

        let openHours = openHour % 12 || 12;
        const openMinutes = String(openMinute).padStart(2, '0');
        const period = openHour >= 12 ? 'PM' : 'AM';
        const openFormatted = `${openHours}:${openMinutes} ${period}`;

        const openText =
            now > closeTime
                ? `Abre mañana a las ${openFormatted}`
                : `Abre a las ${openFormatted}`;
        setClosed(statusHeader, 'La tienda está cerrada.', openText);
    }
}

// ===============================
// ESTILOS VISUALES DE ESTADO
// ===============================
function setOpen(el, title, subtitle = '') {
    const subtext = document.getElementById('status-subtext');
    el.style.setProperty('--status-bg', '#2ecc71');
    el.style.setProperty('--text-color', '#fff');
    el.textContent = title;
    subtext.textContent = subtitle;
}

function setClosed(el, title, subtitle = '') {
    const subtext = document.getElementById('status-subtext');
    el.style.setProperty('--status-bg', '#e74c3c');
    el.style.setProperty('--text-color', '#fff');
    el.textContent = title;
    subtext.textContent = subtitle;
}

// ===============================
// EJECUCIÓN AUTOMÁTICA
// ===============================
document.addEventListener('DOMContentLoaded', loadSchedule);
