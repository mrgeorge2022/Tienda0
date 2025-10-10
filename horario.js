// URL de tu Google Apps Script (para horarios) - nombre cambiado para evitar colisión global
    const SCHEDULE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOCBCR_1CsQJz9YljFyiL3YxgnvlUy_eEQMSmmIf9jvsCt0aO0RjoUD0yfTbq1_liXXQ/exec';
        
        // Horarios por defecto en formato 24h (siempre abierto por defecto)
        const defaultSchedule = [
            { day: 'Lunes', open: '00:00', close: '23:59', estado: true },
            { day: 'Martes', open: '00:00', close: '23:59', estado: true },
            { day: 'Miércoles', open: '00:00', close: '23:59', estado: true },
            { day: 'Jueves', open: '00:00', close: '23:59', estado: true },
            { day: 'Viernes', open: '00:00', close: '23:59', estado: true },
            { day: 'Sábado', open: '00:00', close: '23:59', estado: true },
            { day: 'Domingo', open: '00:00', close: '23:59', estado: true }
        ];

        function capitalize(text) {
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        }

        // Convierte diferentes formatos de hora a 'HH:MM'
        function parseHour(v) {
            if (v === undefined || v === null) return '00:00';
            // si es número (11 o 22.5)
            if (typeof v === 'number' && !isNaN(v)) {
                const hh = Math.floor(v) % 24;
                let mm = Math.round((v - Math.floor(v)) * 60);
                if (mm === 60) { mm = 0; }
                return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
            }
            let s = String(v).trim();
            // aceptar coma decimal
            s = s.replace(',', '.');
            // decimal like 22.5
            if (/^\d{1,2}\.\d+$/.test(s)) {
                const f = parseFloat(s);
                const hh = Math.floor(f) % 24;
                let mm = Math.round((f - Math.floor(f)) * 60);
                if (mm === 60) { mm = 0; }
                return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
            }
            // hh:mm or hh
            const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
            if (m) {
                const hh = parseInt(m[1],10) % 24;
                const mm = m[2] ? parseInt(m[2],10) : 0;
                return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
            }
            return '00:00';
        }

        async function loadSchedule() {
            const statusHeader = document.getElementById('status-header');

            // Mostrar solo el día actual inmediatamente
            showCurrentDay();

            try {
                // Configurar timeout más corto y optimizar fetch
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos máximo

                const response = await fetch(SCHEDULE_APPS_SCRIPT_URL, {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-cache',
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) throw new Error('Error al conectar con Google Sheets: ' + response.status);
                const rawData = await response.json();

                // Mapea los datos del script al formato que usa tu web
                const scheduleData = rawData.map(item => {
                    const openHour = parseHour(item.apertura);
                    const closeHour = parseHour(item.cierre);
                    const estado = (item.estado === true || String(item.estado).toLowerCase() === 'true' || String(item.estado) === '1');
                    return {
                        day: capitalize(item.dia),
                        open: openHour,
                        close: closeHour,
                        hours: `${openHour} - ${closeHour}`,
                        estado: estado
                    };
                });

                // Actualizar con datos de Google Sheets
                displaySchedule(scheduleData);
                
            } catch (error) {
                console.error('Error al cargar horarios:', error);
                // Usar horarios por defecto si falla Google Sheets
                displaySchedule(defaultSchedule);
            }
        }

        function showCurrentDay() {
            const statusHeader = document.getElementById('status-header');
            const today = new Date();
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const currentDay = dayNames[today.getDay()];
            
            statusHeader.innerHTML = `
                <div class="status-text">${currentDay}</div>
            `;
        }

        function displaySchedule(scheduleData) {
            // Obtener día actual
            const today = new Date();
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const currentDay = dayNames[today.getDay()];
            
            // Actualizar estado en el header
            updateStatus(scheduleData, currentDay);
        }

        function updateStatus(scheduleData, currentDay) {
            const statusHeader = document.getElementById('status-header');
            const now = new Date();
            const currentTime = now.getHours() * 100 + now.getMinutes();
            
            // Encontrar horario del día actual
            const todaySchedule = scheduleData.find(item => item.day === currentDay);
            
            if (!todaySchedule) {
                statusHeader.innerHTML = `
                    <div class="status-text">La tienda está cerrada.</div>
                    <div class="status-text">Cerrado hoy</div>
                `;
                return;
            }
            
            // Verificar si la tienda está cerrada manualmente (checkbox desmarcado)
            if (todaySchedule.estado === false || todaySchedule.estado === 'false' || todaySchedule.estado === 'cerrado') {
                statusHeader.innerHTML = `
                    <div class="status-text">La tienda está cerrada.</div>
                    <div class="status-text">Cerrado temporalmente</div>
                `;
                return;
            }
            
            // Convertir horarios a números para comparar
            const openHour = parseInt(todaySchedule.open.split(':')[0]);
            const openMinute = parseInt(todaySchedule.open.split(':')[1]);
            const closeHour = parseInt(todaySchedule.close.split(':')[0]);
            const closeMinute = parseInt(todaySchedule.close.split(':')[1]);
            
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Crear objetos Date para comparar
            const openTime = new Date();
            openTime.setHours(openHour, openMinute, 0, 0);
            
            const closeTime = new Date();
            closeTime.setHours(closeHour, closeMinute, 0, 0);
            
            const currentTimeObj = new Date();
            currentTimeObj.setHours(currentHour, currentMinute, 0, 0);
            
            if (currentTimeObj >= openTime && currentTimeObj <= closeTime) {
                // Calcular tiempo hasta cerrar
                const timeUntilClose = closeTime - currentTimeObj;
                const hoursUntilClose = Math.floor(timeUntilClose / (1000 * 60 * 60));
                const minutesUntilClose = Math.floor((timeUntilClose % (1000 * 60 * 60)) / (1000 * 60));

                let closeText;
                if (hoursUntilClose <= 0 && minutesUntilClose > 0) {
                    closeText = `Cierra en ${minutesUntilClose} minuto(s).`;
                } else if (hoursUntilClose <= 0 && minutesUntilClose <= 0) {
                    closeText = `Cierra pronto.`;
                } else {
                    closeText = `Cierra en ${hoursUntilClose} hora(s) y ${minutesUntilClose} minuto(s).`;
                }

                statusHeader.innerHTML = `
                    <div class="status-text">La tienda está abierta.</div>
                    <div class="status-text time-remaining">${closeText}</div>
                `;
            } else {
                // Calcular tiempo hasta abrir
                let timeUntilOpen;
                if (currentTimeObj < openTime) {
                    // Abre hoy
                    timeUntilOpen = openTime - currentTimeObj;
                } else {
                    // Abre mañana
                    const tomorrowOpen = new Date(openTime);
                    tomorrowOpen.setDate(tomorrowOpen.getDate() + 1);
                    timeUntilOpen = tomorrowOpen - currentTimeObj;
                }

                const hoursUntilOpen = Math.floor(timeUntilOpen / (1000 * 60 * 60));
                const minutesUntilOpen = Math.floor((timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60));

                let openText;
                if (hoursUntilOpen <= 0 && minutesUntilOpen > 0) {
                    openText = `Abre en ${minutesUntilOpen} minuto(s).`;
                } else if (hoursUntilOpen <= 0 && minutesUntilOpen <= 0) {
                    openText = `Abre en unos instantes.`;
                } else {
                    openText = `Abre en ${hoursUntilOpen} hora(s) y ${minutesUntilOpen} minuto(s).`;
                }

                statusHeader.innerHTML = `
                    <div class="status-text">La tienda está cerrada.</div>
                    <div class="status-text time-remaining">${openText}</div>
                `;
            }
        }

        // Cargar horarios al iniciar la página
        document.addEventListener('DOMContentLoaded', loadSchedule);