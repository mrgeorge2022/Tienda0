// ===============================
// CONFIGURACIÓN
// ===============================
const SCHEDULE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOCBCR_1CsQJz9YljFyiL3YxgnvlUy_eEQMSmmIf9jvsCt0aO0RjoUD0yfTbq1_liXXQ/exec';

const defaultSchedule = [
    { day: 'Lunes', open: '00:00', close: '23:59', estado: true },
    { day: 'Martes', open: '00:00', close: '23:59', estado: true },
    { day: 'Miércoles', open: '00:00', close: '23:59', estado: true },
    { day: 'Jueves', open: '00:00', close: '23:59', estado: true },
    { day: 'Viernes', open: '00:00', close: '23:59', estado: true },
    { day: 'Sábado', open: '00:00', close: '23:59', estado: true },
    { day: 'Domingo', open: '00:00', close: '23:59', estado: true }
];

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
    const statusHeader = document.getElementById('status-header');
    showCurrentDay();

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
function showCurrentDay() {
    const statusHeader = document.getElementById('status-header');
    const today = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDay = days[today.getDay()];
    statusHeader.innerHTML = `<div class="status-text">${currentDay}</div>`;
}

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
        setClosed(statusHeader, 'Hoy la tienda está cerrada.');
        return;
    }

    const [openHour, openMinute] = todaySchedule.open.split(':').map(Number);
    const [closeHour, closeMinute] = todaySchedule.close.split(':').map(Number);
    const openTime = new Date(); openTime.setHours(openHour, openMinute, 0, 0);
    const closeTime = new Date(); closeTime.setHours(closeHour, closeMinute, 0, 0);

    if (now >= openTime && now <= closeTime) {
        const timeUntilClose = closeTime - now;
        const hours = Math.floor(timeUntilClose / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilClose % (1000 * 60 * 60)) / (1000 * 60));
        const closeText = hours > 0 ? `Cierra en ${hours} hora(s) ${minutes} minuto(s)` :
            minutes > 0 ? `Cierra en ${minutes} minuto(s)` : `Cierra pronto.`;
        setOpen(statusHeader, '¡La tienda está abierta!', closeText);
    } else {
        const nextOpen = new Date(openTime);
        if (now > openTime) nextOpen.setDate(nextOpen.getDate() + 1);
        const timeUntilOpen = nextOpen - now;
        const hours = Math.floor(timeUntilOpen / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60));
        const openText = hours > 0 ? `Abre en ${hours}h ${minutes}m` :
            minutes > 0 ? `Abre en ${minutes} minuto(s)` : `Abre pronto.`;
        setClosed(statusHeader, 'La tienda está cerrada.', openText);
    }
}

// ===============================
// ESTILOS VISUALES DE ESTADO
// ===============================
function setOpen(el, text, subtext = '') {
    el.classList.remove('closed');
    el.classList.add('open');
    el.innerHTML = `
        <div class="status-text">${text}</div>
        <div class="status-text time-remaining">${subtext}</div>
    `;
}

function setClosed(el, text, subtext = '') {
    el.classList.remove('open');
    el.classList.add('closed');
    el.innerHTML = `
        <div class="status-text">${text}</div>
        ${subtext ? `<div class="status-text time-remaining">${subtext}</div>` : ''}
    `;
}

// ===============================
// EJECUCIÓN AUTOMÁTICA
// ===============================
document.addEventListener('DOMContentLoaded', loadSchedule);
