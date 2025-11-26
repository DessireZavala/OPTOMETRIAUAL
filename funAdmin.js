// funAdmin.js - VERSIÓN CORREGIDA

const API_BASE_URL = 'http://127.0.0.1:5000';

// Variables globales
let currentDate = new Date();
let selectedCalendarDate = null;
let allCitas = [];


// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando panel de administración...');
    initializeAdminPanel();
    
    // Asignar evento al formulario de terapia visual
    const terapiaForm = document.getElementById('terapiaVisualForm');
    if (terapiaForm) {
        terapiaForm.addEventListener('submit', handleTerapiaVisualSubmit);
    }
});

// funcion de navegacion
// ==================== NAVEGACIÓN CORREGIDA ====================

function showSection(sectionName) {
    console.log(`🔄 Mostrando sección: ${sectionName}`);
    
    // Ocultar todas las secciones admin
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remover activo de todos los botones
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    if (sectionName === 'reportes') {
        loadReporteSemanal(); // Cargar datos al mostrar la sección
    }

    // Activar el botón correspondiente
    const clickedButton = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
        btn.textContent.toLowerCase().includes(sectionName.toLowerCase())
    );
    
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    console.log(`✅ Sección ${sectionName} mostrada correctamente`);
}

async function handleTerapiaVisualSubmit(event) {
    event.preventDefault();
    
    console.log("🔄 Iniciando envío de terapia visual...");
    
    // Obtener y validar datos
    const nombrePaciente = document.getElementById('terapiaNombre').value;
    const fechaInput = document.getElementById('terapiaFecha').value;
    const horaSelect = document.getElementById('terapiaHora');
    const horaValor = horaSelect.options[horaSelect.selectedIndex].value;
    
    if (!nombrePaciente || !fechaInput || !horaValor) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }
    
    // Validar formato de fecha (debe ser YYYY-MM-DD)
    let fechaFormateada = fechaInput;
    
    // Si el input type="date" funciona correctamente, ya vendrá en formato YYYY-MM-DD
    console.log(`📊 Datos a enviar:`, {
        nombrePaciente,
        fechaInput,
        fechaFormateada,
        horaValor
    });
    
    // Verificar disponibilidad final antes de enviar
    const disponibilidad = await verificarDisponibilidadEnTiempoReal(fechaInput, horaValor);
    if (!disponibilidad.disponible) {
        alert(`❌ No se puede agendar: ${disponibilidad.message}`);
        return;
    }

    const recurrenteCheckbox = document.getElementById('terapiaRecurrente');
    const esRecurrente = recurrenteCheckbox ? recurrenteCheckbox.checked : true;
    
    const formData = {
        nombre_paciente: nombrePaciente,
        fecha_inicio: fechaFormateada,
        hora: horaValor,
        edad: document.getElementById('terapiaEdad').value || null,
        telefono: document.getElementById('terapiaTelefono').value || null,
        notas: document.getElementById('terapiaNotas').value || '',
        es_recurrente: esRecurrente
    };
    
    const messageEl = document.getElementById('terapiaMessage');
    messageEl.innerHTML = '<div style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">Agendando terapia visual...</div>';
    
    try {
        console.log("📤 Enviando solicitud al servidor...");
        
        // ✅ CORRECCIÓN: Usar la ruta correcta para terapia visual
        const response = await fetch(`${API_BASE_URL}/api/citas/agendar_terapia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        console.log(`📡 Respuesta del servidor: ${response.status}`);
        
        const data = await response.json();
        console.log("📨 Datos de respuesta:", data);
        
        if (response.ok) {
            let mensajeExito = `✅ Terapia visual agendada exitosamente para ${formData.nombre_paciente}`;
            
            if (esRecurrente && data.total_citas) {
                mensajeExito += `<br>📅 Se crearon ${data.total_citas} citas hasta el ${data.fecha_fin}`;
            }
            
            messageEl.innerHTML = `<div style="color: #155724; background: #d4edda; padding: 10px; border-radius: 5px;">
                ${mensajeExito}
            </div>`;
            
            // Limpiar formulario
            document.getElementById('terapiaVisualForm').reset();
            
            // Restaurar fecha actual
            const today = new Date().toISOString().split('T')[0];
            const fechaInputEl = document.getElementById('terapiaFecha');
            if (fechaInputEl) fechaInputEl.value = today;
            
            // Actualizar estadísticas y calendario
            await loadCitas();
            updateStats();
            updateCalendar();
            
        } else {
            console.error("❌ Error del servidor:", data);
            messageEl.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">
                ❌ Error: ${data.message || 'Error desconocido del servidor'}
            </div>`;
        }
        
    } catch (error) {
        console.error('💥 Error de conexión:', error);
        messageEl.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">
            ❌ Error de conexión con el servidor: ${error.message}
        </div>`;
    }
}

// En la función initializeAdminPanel, asegurar que se llame setupTerapiaVisualForm
async function initializeAdminPanel() {
   try {
        console.log('🔧 Inicializando panel de administración...');
        
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            console.log('❌ No autenticado, deteniendo inicialización');
            return;
        }
        
        console.log('✅ Autenticación verificada, cargando datos...');
        
        await loadCitas();
        initializeEventListeners();
        initializeMiniCalendar(); 
        
        showSection('dashboard');
        
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        selectedCalendarDate = today;
        
        // Pequeño delay para asegurar que el calendario se renderice
        setTimeout(() => {
            updateCalendar(); 
            
            const todayElement = document.querySelector(`.calendar-date[data-date="${todayString}"]`);
            if (todayElement) {
                document.querySelectorAll('.calendar-date').forEach(date => {
                    date.classList.remove('selected');
                });
                todayElement.classList.add('selected');
            }
            
            updateSelectedDate(selectedCalendarDate);
            updateStats();
            updateScheduleForDate(selectedCalendarDate);
            updatePatientCardsForDate(selectedCalendarDate);
        }, 300);
        
        setupTerapiaVisualForm();
        
        console.log('✅ Panel de administración inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando panel:', error);
    }
}
// ==================== VERIFICACIÓN DE SESIÓN CORREGIDA ====================

async function checkAuth() {
    try {
        console.log('🔐 Verificando sesión...');
        
        // PRIMERO: Verificar debug session
        console.log('🔧 Verificando estado de sesión...');
        const debugResponse = await fetch(`${API_BASE_URL}/api/debug/session`, {
            method: 'GET',
            credentials: 'include', // ¡CRÍTICO! Incluir cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('🔧 Debug session status:', debugResponse.status);
        
        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('🔧 Debug session data:', debugData);
            
            if (debugData.current_user_authenticated) {
                console.log('✅ Sesión activa encontrada');
                return true;
            }
        }
        
        // SEGUNDO: Verificar usuario actual
        console.log('👤 Verificando usuario actual...');
        const response = await fetch(`${API_BASE_URL}/api/user/current`, {
            method: 'GET',
            credentials: 'include', // ¡CRÍTICO! Incluir cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Estado de verificación:', response.status);
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Usuario autenticado:', userData);
            return true;
        } else {
            console.log('❌ No autenticado, redirigiendo al login');
            window.location.href = 'login.html';
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        console.log('⚠️  Redirigiendo al login por error de conexión');
        window.location.href = 'login.html';
        return false;
    }
}


function initializeEventListeners() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', previousMonth);
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', nextMonth);

    const closeModalBtn = document.querySelector('#appointment-modal .close');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('appointment-modal')) {
            closeModal();
        }
    });

    const modalActions = document.querySelector('.modal-actions');
    if (modalActions) {
        const editBtn = modalActions.querySelector('.btn-primary');
        const printBtn = modalActions.querySelector('.btn-secondary');
        const cancelBtn = modalActions.querySelector('.btn-danger');
        
        if (editBtn) editBtn.addEventListener('click', editAppointment);
        if (printBtn) printBtn.addEventListener('click', printAppointment);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelAppointment);
    }

    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const refreshReportBtn = document.getElementById('refreshReportBtn');
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            const fecha = new Date().toISOString().split('T')[0];
            exportTableToExcel('reporteTable', `reporte_semanal_${fecha}.xlsx`);
        });
    }

    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => {
            const fecha = new Date().toISOString().split('T')[0];
            exportTableToCSV('reporteTable', `reporte_semanal_${fecha}.csv`);
        });
    }

    if (refreshReportBtn) {
        refreshReportBtn.addEventListener('click', loadReporteSemanal);
    }

    // ❌ REMOVIDO: initializeMiniCalendar();  (evita ejecución prematura)
}


// ⭐ Lógica del formulario de Terapia Visual ⭐

async function cargarHorariosDisponibles(fecha) {
    try {
        console.log(`📅 Cargando horarios disponibles para: ${fecha}`);
        
        const response = await fetch(`${API_BASE_URL}/api/terapia/horarios_disponibles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ fecha: fecha })
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🕒 Horarios disponibles:', data.horarios_disponibles);
        
        return data.horarios_disponibles;
        
    } catch (error) {
        console.error('❌ Error cargando horarios:', error);
        // Fallback a los horarios restringidos
        return ['12:30:00', '13:30:00', '14:30:00', '15:30:00'];
    }
}

function actualizarSelectHorarios(horariosDisponibles) {
    const selectHora = document.getElementById('terapiaHora');
    const horaSeleccionada = selectHora.value;
    
    // Guardar opción actual si existe
    const opcionActual = horariosDisponibles.includes(horaSeleccionada) ? horaSeleccionada : '';
    
    // Limpiar select (mantener primera opción vacía)
    selectHora.innerHTML = '<option value="">Selecciona hora</option>';
    
    // Mapeo de horas a formato legible
    const formatoHora = {
        '12:30:00': '12:30 PM',
        '13:30:00': '1:30 PM',
        '14:30:00': '2:30 PM',
        '15:30:00': '3:30 PM'
    };
    
    // Agregar horarios disponibles
    horariosDisponibles.forEach(hora => {
        const option = document.createElement('option');
        option.value = hora;
        option.textContent = formatoHora[hora] || hora;
        selectHora.appendChild(option);
    });
    
    // Restaurar selección anterior si sigue disponible
    if (opcionActual && horariosDisponibles.includes(opcionActual)) {
        selectHora.value = opcionActual;
    }
    
    // Mostrar mensaje si no hay horarios disponibles
    const messageEl = document.getElementById('terapiaMessage');
    if (horariosDisponibles.length === 0) {
        messageEl.innerHTML = `<div style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">
            ⚠️ No hay horarios disponibles para esta fecha. Por favor selecciona otra fecha.
        </div>`;
    } else {
        messageEl.innerHTML = '';
    }
}

async function verificarDisponibilidadEnTiempoReal(fecha, hora) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/terapia/disponibilidad`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                fecha: fecha,
                hora: hora 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            throw new Error('Error verificando disponibilidad');
        }
        
    } catch (error) {
        console.error('❌ Error verificando disponibilidad:', error);
        return { disponible: true, message: 'Asumiendo disponible por error de conexión' };
    }
}

function setupTerapiaVisualForm() {
    const terapiaForm = document.getElementById('terapiaVisualForm');
    if (!terapiaForm) return;
    
    const fechaInput = document.getElementById('terapiaFecha');
    const horaSelect = document.getElementById('terapiaHora');
    const messageEl = document.getElementById('terapiaMessage');
    
    if (fechaInput) {
        // Establecer fecha mínima como hoy
        const today = new Date().toISOString().split('T')[0];
        fechaInput.min = today;
        fechaInput.value = today;
        
        // Cargar horarios disponibles al cambiar fecha
        fechaInput.addEventListener('change', async function() {
            const fecha = this.value;
            if (fecha) {
                messageEl.innerHTML = '<div style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">Cargando horarios disponibles...</div>';
                
                const horariosDisponibles = await cargarHorariosDisponibles(fecha);
                actualizarSelectHorarios(horariosDisponibles);
            }
        });
        
        // Cargar horarios disponibles inicialmente
        setTimeout(async () => {
            const horariosDisponibles = await cargarHorariosDisponibles(fechaInput.value);
            actualizarSelectHorarios(horariosDisponibles);
        }, 500);
    }
    
    // Verificar disponibilidad al cambiar hora
    if (horaSelect) {
        horaSelect.addEventListener('change', async function() {
            const fecha = fechaInput.value;
            const hora = this.value;
            
            if (fecha && hora) {
                const disponibilidad = await verificarDisponibilidadEnTiempoReal(fecha, hora);
                
                if (!disponibilidad.disponible) {
                    messageEl.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">
                        ❌ ${disponibilidad.message}
                    </div>`;
                } else {
                    messageEl.innerHTML = `<div style="color: #155724; background: #d4edda; padding: 10px; border-radius: 5px;">
                        ✅ ${disponibilidad.message}
                    </div>`;
                }
            }
        });
    }
}
// ⭐ Fin Lógica del formulario de Terapia Visual ⭐


// ==================== FUNCIONES DE LA API CORREGIDAS ====================

async function loadCitas() {
    try {
        console.log('📅 Cargando citas desde API (incluyendo recurrentes)...');
        
        let response = await fetch(`${API_BASE_URL}/api/citas/todas`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Respuesta de citas todas:', response.status);
        
        if (!response.ok) {
            // Si falla, intentar la ruta alternativa
            console.log('🔄 Ruta todas falló, intentando ruta admin completo...');
            response = await fetch(`${API_BASE_URL}/api/citas/admin_completo`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (!response.ok) {
            // Si falla, intentar la ruta original con autenticación
            console.log('🔄 Rutas nuevas fallaron, intentando ruta admin original...');
            response = await fetch(`${API_BASE_URL}/api/citas/admin`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
        }
        
        console.log('📡 Estado final de citas:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        allCitas = await response.json();
        console.log('✅ Citas cargadas correctamente:', allCitas.length, 'citas');
        
        // DEBUG: Mostrar información sobre citas recurrentes
        const citasConFecha = allCitas.filter(c => c.fecha);
        const fechasUnicas = [...new Set(citasConFecha.map(c => c.fecha))];
        console.log('📅 Fechas con citas:', fechasUnicas);
        
        const hoy = new Date().toISOString().split('T')[0];
        const citasHoy = allCitas.filter(c => c.fecha === hoy);
        console.log(`📋 Citas para hoy (${hoy}):`, citasHoy.length);
        
        return allCitas;
        
    } catch (error) {
        console.error('❌ Error cargando citas:', error);
        
        // Para desarrollo, mostrar datos de demo INCLUYENDO recurrentes
        console.log('⚠️ Usando datos de demo para desarrollo (con recurrentes)');
        allCitas = getDemoCitasConRecurrentes();
        return allCitas;
    }
}

// ==================== DATOS DE DEMO MEJORADOS ====================

function getDemoCitasConRecurrentes() {
    const today = new Date();
    const hoy = today.toISOString().split('T')[0];
    
    // Calcular fechas futuras para simular recurrencia
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    const twoWeeksStr = twoWeeks.toISOString().split('T')[0];
    
    return [
        // Cita original de terapia visual
        {
            id_cita: 1,
            fecha: hoy,
            hora: '12:30:00',
            paciente: { nombre: 'María', apellido: 'García López', edad: 25, telefono: '555-0101' },
            motivo: 'Terapia Visual',
            gabinete: 'Gabinete 1',
            estado: 'Programada',
            es_recurrente: true
        },
        // Citas recurrentes generadas
        {
            id_cita: 2,
            fecha: nextWeekStr,
            hora: '13:30:00',
            paciente: { nombre: 'María', apellido: 'García López', edad: 25, telefono: '555-0101' },
            motivo: 'Terapia Visual',
            gabinete: 'Gabinete 2',
            estado: 'Programada',
            es_recurrente: true
        },
        {
            id_cita: 3,
            fecha: twoWeeksStr,
            hora: '14:30:00',
            paciente: { nombre: 'María', apellido: 'García López', edad: 25, telefono: '555-0101' },
            motivo: 'Terapia Visual',
            gabinete: 'Gabinete 3',
            estado: 'Programada',
            es_recurrente: true
        },
        // Otras citas normales
        {
            id_cita: 4,
            fecha: hoy,
            hora: '15:30:00',
            paciente: { nombre: 'Juan Carlos', apellido: 'Martínez Rodríguez', edad: 30, telefono: '555-0102' },
            motivo: 'Lentes de contacto',
            gabinete: 'Gabinete 2',
            estado: 'Programada'
        },
        {
            id_cita: 5,
            fecha: hoy,
            hora: '12:30:00',
            paciente: { nombre: 'Laura', apellido: 'Perez Diaz', edad: 40, telefono: '555-0103' },
            motivo: 'Lentes de contacto',
            gabinete: 'Gabinete 3',
            estado: 'Completada'
        },
    ];
}

async function updateAppointmentStatus(citaId, nuevoEstado) {
    try {
        // Usamos la ruta de edición completa para asegurar la auditoría, aunque solo cambiemos el estado.
        const response = await fetch(`${API_BASE_URL}/api/citas/${citaId}/editar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ¡CRÍTICO! Incluir cookies
            body: JSON.stringify({ 
                estado: nuevoEstado,
                // Auditoría simulada para cancelación rápida
                matricula_editor: 'QUICKEDIT', 
                tipo_modificacion: 'cancelar',
                motivo_modificacion: 'Cancelación rápida desde panel',
                detalle_motivo: 'Cancelado por el usuario del panel de admin',
                fecha_modificacion: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            await loadCitas(); // Recargar datos
            updateCalendar(); // Vuelve a dibujar el calendario con los nuevos puntos
            updateScheduleForDate(selectedCalendarDate || new Date());
            updatePatientCardsForDate(selectedCalendarDate || new Date());
            updateStats();
            closeModal();
            alert('Estado de cita actualizado correctamente a: ' + nuevoEstado);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar cita');
        }
    } catch (error) {
        console.error('Error actualizando cita:', error);
        alert('Error al actualizar el estado de la cita: ' + error.message);
    }
}

// ==================== FUNCIONALIDAD DEL CALENDARIO CORREGIDA ====================

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
}

function updateCalendar() {
    const monthYearElement = document.querySelector('.calendar-header h3');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    monthYearElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    // ⭐ LLAMADA CRÍTICA: DIBUJAR LA CUADRÍCULA CON LAS FECHAS CORRECTAS
    renderCalendarGrid(); 
    
    // Marcar días con citas (debe ir DESPUÉS de renderizar la cuadrícula)
    markDaysWithAppointments();
    
    // Re-seleccionar el día si está visible
    if (selectedCalendarDate && 
        selectedCalendarDate.getMonth() === currentDate.getMonth() && 
        selectedCalendarDate.getFullYear() === currentDate.getFullYear()) {
            
        // Formato para buscar el elemento: YYYY-MM-DD
        const dateString = selectedCalendarDate.toISOString().split('T')[0];
        const dayElement = document.querySelector(`.calendar-date[data-date="${dateString}"]`);
        if (dayElement) {
            // Asegurar que solo el día actual tenga la clase 'selected'
            document.querySelectorAll('.calendar-date').forEach(d => d.classList.remove('selected'));
            dayElement.classList.add('selected');
        }
    } else {
        // Si cambiamos de mes, actualizamos la vista para el día 1
        const dayOne = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        selectedCalendarDate = dayOne;
        updateSelectedDate(selectedCalendarDate);
        updateScheduleForDate(selectedCalendarDate);
        updatePatientCardsForDate(selectedCalendarDate);
        
        // Seleccionar el día 1 en el calendario
        const dayElement = document.querySelector('.calendar-date[data-day="1"]:not(.other-month)');
        if(dayElement) {
            document.querySelectorAll('.calendar-date').forEach(d => d.classList.remove('selected'));
            dayElement.classList.add('selected');
        }
    }
}

function markDaysWithAppointments() {
    console.log('📅 Marcando días con citas en el calendario...');
    
    // Limpiar marcadores anteriores
    document.querySelectorAll('.has-appointments').forEach(el => {
        el.classList.remove('has-appointments');
    });
    
    // Obtener mes y año actuales del calendario visible
    const currentMonth = currentDate.getMonth(); // 0-11
    const currentYear = currentDate.getFullYear();

    allCitas.forEach(cita => {
        // La fecha viene como "YYYY-MM-DD" desde la API (string)
        if (!cita.fecha) return;

        const parts = cita.fecha.split('-'); 
        const citaYear = parseInt(parts[0]);
        const citaMonth = parseInt(parts[1]) - 1; // Restamos 1 porque en JS los meses son 0-11
        const citaDay = parseInt(parts[2]);

        // Comparamos si la cita pertenece al mes y año que estamos viendo
        if (citaYear === currentYear && citaMonth === currentMonth) {
            // Buscar por el atributo de fecha (la forma más segura después de renderizar)
            const dateString = cita.fecha;
            const dayElement = document.querySelector(`.calendar-date[data-date="${dateString}"]`);
            
            if (dayElement) {
                dayElement.classList.add('has-appointments');
            }
        }
    });
}
function initializeCalendarEvents() {
    // Re-bindear eventos al actualizar el calendario
    // Solo necesitamos los días del mes actual
    const calendarDates = document.querySelectorAll('.calendar-grid .calendar-date:not(.other-month):not(.weekend)');
    calendarDates.forEach(date => {
        // Eliminar listeners antiguos para evitar duplicados
        date.removeEventListener('click', handleDateSelectionWrapper); 
        // Usar un wrapper para poder usar removeEventListener si fuera necesario
        date.addEventListener('click', handleDateSelectionWrapper);
    });
}

function handleDateSelectionWrapper() {
    handleDateSelection(this);
}

function handleDateSelection(dateElement) {
    // 1. Obtener la fecha completa del atributo de datos
    const dateString = dateElement.getAttribute('data-date');
    if (!dateString) return;
    
    // Crear la fecha (sin restar zonas horarias)
    const parts = dateString.split('-');
    // Month is 0-indexed in Date constructor, so parse[1] - 1
    selectedCalendarDate = new Date(parts[0], parts[1] - 1, parts[2]); 
    
    // 2. Limpieza visual: Quitamos SOLO la clase 'selected' de los otros días
    document.querySelectorAll('.calendar-date').forEach(date => {
        date.classList.remove('selected'); 
    });
    
    // 3. Añadimos la clase 'selected' al nuevo día
    dateElement.classList.add('selected');
    
    // 4. Actualizar el resto del panel
    updateSelectedDate(selectedCalendarDate);
    updateScheduleForDate(selectedCalendarDate);
    updatePatientCardsForDate(selectedCalendarDate);
}
function updateSelectedDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('es-ES', options);
    
    document.querySelector('.selected-date').innerHTML = `
        <strong>Fecha seleccionada:</strong><br>
        ${formattedDate}
    `;
    
    document.querySelector('.schedule-header h2').innerHTML = 
        `<i class="fas fa-clock"></i> Horario del día - ${formattedDate}`;
}

// ==================== TABLA DE HORARIOS MEJORADA (SOLO TARDE) ====================

function updateScheduleForDate(date) {
    // Formato 'YYYY-MM-DD' para comparar con la BD
    const dateString = date.toISOString().split('T')[0];
    const citasDelDia = allCitas.filter(cita => cita.fecha === dateString);
    
    console.log(`🕒 Actualizando horario para ${dateString}:`, citasDelDia.length, 'citas');
    
    // Limpiar toda la tabla primero
    const tableCells = document.querySelectorAll('.schedule-table td');
    tableCells.forEach(cell => {
        if (!cell.classList.contains('time-slot')) {
            cell.innerHTML = 'Disponible';
            cell.classList.remove('has-appointment', 'completed', 'cancelled', 'programada', 'no-asistió');
            const oldAppointment = cell.querySelector('.appointment');
            if(oldAppointment) oldAppointment.removeEventListener('click', showAppointmentDetails);
        }
    });
    
    // Llenar tabla con citas del día
    citasDelDia.forEach(cita => {
        if (!cita.hora) {
            console.warn(`⚠️ Cita ${cita.id_cita} sin hora definida`);
            return;
        }

        const hora = cita.hora.substring(0, 5);
        const gabineteMatch = cita.gabinete ? cita.gabinete.match(/\d+/) : null;
        const gabineteNum = gabineteMatch ? parseInt(gabineteMatch[0]) : 0;
        
        if (gabineteNum >= 1 && gabineteNum <= 5) { 
            const timeSlotRow = findTimeSlotRow(hora);
            if (timeSlotRow) {
                const gabineteCell = timeSlotRow.cells[gabineteNum];
                if (gabineteCell) { 
                    gabineteCell.innerHTML = createAppointmentHTML(cita);
                    const statusClass = cita.estado ? cita.estado.toLowerCase().replace(' ', '-') : 'programada';
                    gabineteCell.classList.add('has-appointment', statusClass);
                    
                    const appointmentElement = gabineteCell.querySelector('.appointment');
                    if (appointmentElement) {
                        appointmentElement.addEventListener('click', () => showAppointmentDetails(cita));
                    }
                } 
            } 
        }
    });
    
    console.log(`✅ Tabla de horarios actualizada para ${dateString}`);
}

function findTimeSlotRow(hora) {
    const rows = document.querySelectorAll('.schedule-table tbody tr');
    for (let row of rows) {
        const timeCell = row.cells[0];
        if (!timeCell) continue;
        
        // Quita el símbolo y recorta a 5 caracteres (ej: "☐ 12:30" -> "12:30")
        const rowTime = timeCell.textContent.trim().substring(2).trim().substring(0, 5); 
        if (rowTime === hora) {
            return row;
        }
    }
    return null;
}

function createAppointmentHTML(cita) {
    const statusClass = cita.estado.toLowerCase().replace(' ', '-');
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    const shortName = nombreCompleto.length > 20 ? 
        nombreCompleto.substring(0, 20) + '...' : nombreCompleto;
    
    return `
        <div class="appointment ${statusClass}" 
             data-cita-id="${cita.id_cita}">
            <div class="patient-name">${shortName}</div>
            <div class="patient-info">Edad: ${cita.paciente.edad}</div>
            <div class="patient-info">${cita.motivo}</div>
            <span class="status ${statusClass}">${cita.estado}</span>
        </div>
    `;
}

// ==================== TARJETAS DE PACIENTES CON DATOS REALES ====================

function updatePatientCardsForDate(date) {
    // Formato 'YYYY-MM-DD' para comparar con la BD
    const dateString = date.toISOString().split('T')[0];
    const citasDelDia = allCitas.filter(cita => cita.fecha === dateString);
    const container = document.querySelector('.patient-cards');
    
    container.innerHTML = '';
    
    if (citasDelDia.length === 0) {
        container.innerHTML = '<div class="no-appointments">No hay citas programadas para esta fecha</div>';
        return;
    }
    
    citasDelDia.forEach(cita => {
        const card = document.createElement('div');
        card.className = 'patient-card';
        const statusClass = cita.estado.toLowerCase().replace(' ', '-');
        card.classList.add(statusClass); // Añadir clase de estado
        card.innerHTML = createPatientCardHTML(cita);
        card.addEventListener('click', () => showAppointmentDetails(cita));
        container.appendChild(card);
    });
}

function createPatientCardHTML(cita) {
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    const statusClass = cita.estado.toLowerCase().replace(' ', '-');
    
    return `
        <div class="patient-card-header">
            <div class="patient-card-name">${nombreCompleto}</div>
            <div class="gabinete-badge">${cita.gabinete}</div>
        </div>
        <div class="patient-card-info">Edad: ${cita.paciente.edad}</div>
        <div class="patient-card-info">Tel: ${cita.paciente.telefono}</div>
        <div class="patient-card-info">Hora: ${cita.hora.substring(0, 5)} hrs</div>
        <div class="patient-card-info">Servicio: ${cita.motivo}</div>
        <span class="status ${statusClass}">${cita.estado}</span>
    `;
}

// ==================== MODAL CON DETALLES REALES ====================

function showAppointmentDetails(cita) {
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    
    document.getElementById('modal-patient-name').textContent = nombreCompleto;
    document.getElementById('modal-patient-age').textContent = cita.paciente.edad;
    document.getElementById('modal-patient-phone').textContent = cita.paciente.telefono;
    document.getElementById('modal-gabinete').textContent = cita.gabinete;
    document.getElementById('modal-time').textContent = `${cita.hora.substring(0, 5)} hrs`;
    
    const statusElement = document.getElementById('modal-status');
    const statusClass = cita.estado.toLowerCase().replace(' ', '-');
    statusElement.textContent = cita.estado;
    statusElement.className = `status ${statusClass}`;
    
    // Actualizar notas con información real
    const notesElement = document.getElementById('modal-notes');
    notesElement.textContent = `Servicio: ${cita.motivo}. ${getAdditionalNotes(cita)}`;
    
    // Guardar ID de cita para acciones
    document.getElementById('appointment-modal').dataset.citaId = cita.id_cita;
    
    document.getElementById('appointment-modal').style.display = 'block';
}

function getAdditionalNotes(cita) {
    if (cita.motivo && cita.motivo.toLowerCase().includes('armazón')) {
        return 'Paciente requiere examen completo para lentes de armazón.';
    } else if (cita.motivo && cita.motivo.toLowerCase().includes('contacto')) {
        return 'Paciente interesado en lentes de contacto. Evaluar adaptación.';
    }
    return 'Examen de rutina. Verificar agudeza visual y salud ocular.';
}

function closeModal() {
    document.getElementById('appointment-modal').style.display = 'none';
}

// ==================== FUNCIONALIDAD MEJORADA DE EDICIÓN ====================

function editAppointment() {
    const citaId = document.getElementById('appointment-modal').dataset.citaId;
    if (!citaId) {
        alert('❌ No se pudo obtener el ID de la cita');
        return;
    }
    closeModal(); // Cerrar modal de detalles
    
    // Buscar la cita completa en el arreglo global para evitar un fetch adicional
    const cita = allCitas.find(c => c.id_cita == citaId);
    if (!cita) {
        alert('❌ Cita no encontrada en la memoria.');
        return;
    }
    
    showEditModal(cita); // Abrir modal de edición con los datos
}

function showEditModal(cita) {
    console.log("📝 Abriendo modal de edición para cita:", cita);
    
    // Verificar que la cita tenga todos los datos necesarios
    if (!cita || !cita.id_cita) {
        alert('❌ Error: Datos de cita incompletos');
        return;
    }
    const modalHTML = `
        <div id="edit-modal" class="modal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Editar Cita - ${cita.paciente.nombre} ${cita.paciente.apellido}</h2>
                    <span class="close" onclick="closeEditModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="edit-cita-form">
                        <input type="hidden" id="edit-cita-id" value="${cita.id_cita}">
                        
                        <div class="current-info" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-top: 0; color: #274e3b;">📋 Información Actual</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>Paciente:</strong> ${cita.paciente.nombre} ${cita.paciente.apellido}</div>
                                <div><strong>Teléfono:</strong> ${cita.paciente.telefono}</div>
                                <div><strong>Fecha Original:</strong> ${cita.fecha}</div>
                                <div><strong>Hora Original:</strong> ${cita.hora.substring(0,5)} hrs</div>
                                <div><strong>Gabinete:</strong> ${cita.gabinete}</div>
                                <div><strong>Servicio:</strong> ${cita.motivo}</div>
                                <div><strong>Estado:</strong> <span class="status ${cita.estado.toLowerCase().replace(' ', '-')}">${cita.estado}</span></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="edit-matricula"><i class="fas fa-id-card"></i> Tu Matrícula:</label>
                            <input type="text" id="edit-matricula" 
                                   placeholder="Ej: 2024001 o 99999" 
                                   pattern="[0-9]+"
                                   title="Solo números"
                                   required>
                            <small>Ingresa tu matrícula para registrar quién realizó el cambio</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-tipo-modificacion"><i class="fas fa-tag"></i> Tipo de Modificación:</label>
                            <select id="edit-tipo-modificacion" required>
                                <option value="">Selecciona el tipo de modificación</option>
                                <option value="reagendar">Reagendar Cita</option>
                                <option value="cancelar">Cancelar Cita</option>
                                <option value="cambio_estado">Cambiar Estado</option>
                            </select>
                        </div>

                        <div id="edit-fields-container">
                            <div class="form-group" id="reagendar-fields" style="display: none;">
                                <label for="edit-fecha">Nueva Fecha:</label>
                                <input type="date" id="edit-fecha" value="${cita.fecha}">
                            </div>
                            
                            <div class="form-group" id="reagendar-time-fields" style="display: none;">
                                <label for="edit-hora">Nueva Hora:</label>
                                <select id="edit-hora">
                                    <option value="">Selecciona una hora</option>
                                    <option value="12:30:00" ${cita.hora.includes('12:30') ? 'selected' : ''}>12:30 PM</option>
                                    <option value="13:30:00" ${cita.hora.includes('13:30') ? 'selected' : ''}>1:30 PM</option>
                                    <option value="14:30:00" ${cita.hora.includes('14:30') ? 'selected' : ''}>2:30 PM</option>
                                    <option value="15:30:00" ${cita.hora.includes('15:30') ? 'selected' : ''}>3:30 PM</option>
                                </select>
                            </div>

                            <div class="form-group" id="estado-fields" style="display: none;">
                                <label for="edit-estado">Nuevo Estado:</label>
                                <select id="edit-estado">
                                    <option value="Programada" ${cita.estado === 'Programada' ? 'selected' : ''}>Programada</option>
                                    <option value="Completada" ${cita.estado === 'Completada' ? 'selected' : ''}>Completada</option>
                                    <option value="Cancelada" ${cita.estado === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                                    <option value="No asistió" ${cita.estado === 'No asistió' ? 'selected' : ''}>No asistió</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-motivo-modificacion"><i class="fas fa-clipboard-list"></i> Motivo de la Modificación:</label>
                            <select id="edit-motivo-modificacion" required>
                                <option value="">Selecciona el motivo</option>
                                <option value="Completada">Completada</option>
                                <option value="Solicitud del paciente">Solicitud del paciente</option>
                                <option value="Disponibilidad de gabinete">Disponibilidad de gabinete</option>
                                <option value="Conflicto de horario">Conflicto de horario</option>
                                <option value="Emergencia">Emergencia</option>
                                <option value="Error en agendamiento">Error de agenda</option>
                                <option value="Otro">Otro motivo</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-detalle-motivo"><i class="fas fa-comment"></i> Detalle del Motivo:</label>
                            <textarea id="edit-detalle-motivo" 
                                      placeholder="Explica brevemente por qué se modifica la cita..."
                                      rows="3" required></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('edit-modal').style.display = 'block';
    
    // AGREGAR: Event listener para cerrar al hacer clic fuera del modal
    document.getElementById('edit-modal').addEventListener('click', function(event) {
        if (event.target === this) {
            closeEditModal();
        }
    });
    
    // Configurar eventos dinámicos
    setupEditModalEvents();
    document.getElementById('edit-cita-form').addEventListener('submit', handleEditFormSubmit);
}

function setupEditModalEvents() {
    // Mostrar/ocultar campos según tipo de modificación
    const tipoModificacion = document.getElementById('edit-tipo-modificacion');
    if (tipoModificacion) {
        tipoModificacion.addEventListener('change', function() {
            const tipo = this.value;
            
            // Ocultar todos los campos primero
            const reagendarFields = document.getElementById('reagendar-fields');
            const reagendarTimeFields = document.getElementById('reagendar-time-fields');
            const estadoFields = document.getElementById('estado-fields');
            
            if (reagendarFields) reagendarFields.style.display = 'none';
            if (reagendarTimeFields) reagendarTimeFields.style.display = 'none';
            if (estadoFields) estadoFields.style.display = 'none';
            
            // Mostrar campos según tipo
            if (tipo === 'reagendar') {
                if (reagendarFields) reagendarFields.style.display = 'block';
                if (reagendarTimeFields) reagendarTimeFields.style.display = 'block';
            } else if (tipo === 'cambio_estado' || tipo === 'cancelar') {
                if (estadoFields) estadoFields.style.display = 'block';
                if (tipo === 'cancelar') {
                    document.getElementById('edit-estado').value = 'Cancelada';
                }
            }
        });
    }
    
    // Validación de matrícula en tiempo real
    const matriculaInput = document.getElementById('edit-matricula');
    if (matriculaInput) {
        matriculaInput.addEventListener('input', function() {
            const value = this.value;
            // CORRECCIÓN: Validar que solo contenga NÚMEROS (no contenga letras)
            if (!/^[0-9]*$/.test(value)) { 
                this.setCustomValidity('La matrícula solo puede contener números');
            } else {
                this.setCustomValidity('');
            }
        });
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.remove();
    }
}


// ==================== HERRAMIENTAS DE DIAGNÓSTICO ====================
function debugElementosDashboard() {
    console.log('=== DEBUG ELEMENTOS DASHBOARD ===');
    
    // Verificar elementos críticos del dashboard
    const elementos = {
        dashboard: document.querySelector('.dashboard'),
        scheduleContainer: document.querySelector('.schedule-container'),
        patientDetails: document.querySelector('.patient-details'),
        terapiaSection: document.getElementById('terapiaVisualSection'),
        navButtons: document.querySelectorAll('.nav-btn'),
        calendar: document.querySelector('.calendar'),
        statsGrid: document.querySelector('.stats-grid')
    };
    
    console.log('Elementos encontrados:', elementos);
    
    // Verificar estilos de display
    for (const [nombre, elemento] of Object.entries(elementos)) {
        if (elemento) {
            const displayStyle = window.getComputedStyle(elemento).display;
            console.log(`${nombre}: display = ${displayStyle}`);
        } else {
            console.log(`${nombre}: NO ENCONTRADO`);
        }
    }
}

function debugCitasCompleto() {
    console.log('=== DEBUG COMPLETO DE CITAS ===');
    console.log('Total de citas:', allCitas.length);
    
    // Agrupar por fecha
    const citasPorFecha = {};
    allCitas.forEach(cita => {
        if (!citasPorFecha[cita.fecha]) {
            citasPorFecha[cita.fecha] = [];
        }
        citasPorFecha[cita.fecha].push(cita);
    });
    
    console.log('Citas por fecha:', citasPorFecha);
    
    // Verificar estructura de cada cita
    allCitas.forEach((cita, index) => {
        console.log(`Cita ${index + 1}:`, {
            id: cita.id_cita,
            fecha: cita.fecha,
            hora: cita.hora,
            paciente: cita.paciente,
            motivo: cita.motivo,
            gabinete: cita.gabinete,
            estado: cita.estado,
            es_recurrente: cita.es_recurrente || false
        });
    });
    
    // Mostrar en pantalla para fácil diagnóstico
    const hoy = new Date().toISOString().split('T')[0];
    const citasHoy = allCitas.filter(c => c.fecha === hoy);
    alert(`Diagnóstico:\nTotal citas: ${allCitas.length}\nCitas hoy: ${citasHoy.length}\nRevisa la consola para más detalles`);
}

async function handleEditFormSubmit(event) {
    event.preventDefault();
    
    console.log("🔄 Iniciando envío de formulario de edición...");
    
    const matricula = document.getElementById('edit-matricula').value;
    const tipoModificacion = document.getElementById('edit-tipo-modificacion').value;
    const motivoModificacion = document.getElementById('edit-motivo-modificacion').value;
    const detalleMotivo = document.getElementById('edit-detalle-motivo').value;
    
    // CORRECCIÓN: Validar matrícula (Solo números)
    if (!/^[0-9]+$/.test(matricula)) {
        alert('❌ La matrícula solo debe contener números');
        return;
    }
    
    if (!matricula) {
        alert('Por favor ingresa tu matrícula para registrar el cambio');
        return;
    }
    
    const formData = {
        id_cita: document.getElementById('edit-cita-id').value,
        // Información de auditoría
        matricula_editor: matricula,
        tipo_modificacion: tipoModificacion,
        motivo_modificacion: motivoModificacion,
        detalle_motivo: detalleMotivo,
        fecha_modificacion: new Date().toISOString()
    };
    
    // Agregar campos según tipo de modificación
    if (tipoModificacion === 'reagendar') {
        formData.fecha = document.getElementById('edit-fecha').value;
        formData.hora = document.getElementById('edit-hora').value;
        
        if (!formData.fecha || !formData.hora) {
            alert('Por favor completa la fecha y hora para reagendar');
            return;
        }
    }
    
    if (tipoModificacion === 'cambio_estado' || tipoModificacion === 'cancelar') {
        formData.estado = document.getElementById('edit-estado').value;
    }
    
    try {
        console.log('📤 Enviando datos de modificación:', formData);
        
        const response = await fetch(`${API_BASE_URL}/api/citas/${formData.id_cita}/editar`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        console.log('📡 Respuesta del servidor:', response.status);
        
        // ✅ CORRECCIÓN: Mejor manejo de la respuesta
        const result = await response.json();
        
        if (response.ok) {
            // Mostrar confirmación detallada
            let mensaje = `✅ Modificación realizada exitosamente\n`;
            mensaje += `📝 Registrado por: ${matricula}\n`;
            mensaje += `🎯 Tipo: ${tipoModificacion}\n`;
            mensaje += `📋 Motivo: ${motivoModificacion}`;
            
            alert(mensaje);
            closeEditModal();
            
            // Recargar datos
            await loadCitas();
            updateCalendar(); // Vuelve a dibujar el calendario con los nuevos puntos
            updateScheduleForDate(selectedCalendarDate || new Date());
            updatePatientCardsForDate(selectedCalendarDate || new Date());
            updateStats();
            
        } else {
            // ✅ CORRECCIÓN: Mostrar el mensaje específico del servidor
            console.error('❌ Error del servidor:', result);
            throw new Error(result.message || `Error ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Error actualizando cita:', error);
        // ✅ CORRECCIÓN: Mostrar mensaje de error más específico
        alert('❌ Error al modificar la cita: ' + error.message);
    }
}

function printAppointment() {
    const patientName = document.getElementById('modal-patient-name').textContent;
    const details = `
        Paciente: ${patientName}
        Edad: ${document.getElementById('modal-patient-age').textContent}
        Teléfono: ${document.getElementById('modal-patient-phone').textContent}
        Gabinete: ${document.getElementById('modal-gabinete').textContent}
        Hora: ${document.getElementById('modal-time').textContent}
        Estado: ${document.getElementById('modal-status').textContent}
        Notas: ${document.getElementById('modal-notes').textContent}
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Detalles de Cita - ${patientName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #274e3b; }
                    .detail { margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>Detalles de Cita</h1>
                <pre>${details}</pre>
                <script>window.print();</script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function cancelAppointment() {
    const citaId = document.getElementById('appointment-modal').dataset.citaId;
    if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
        // Se usa la función de edición completa con auditoría
        updateAppointmentStatus(citaId, 'Cancelada'); 
    }
}


// Función para generar la cuadrícula del calendario dinámicamente
function renderCalendarGrid() {
    const grid = document.querySelector('.calendar-grid');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 1. Limpiar la cuadrícula, dejando solo los encabezados
    grid.innerHTML = `
        <div class="calendar-day">Dom</div>
        <div class="calendar-day">Lun</div>
        <div class="calendar-day">Mar</div>
        <div class="calendar-day">Mié</div>
        <div class="calendar-day">Jue</div>
        <div class="calendar-day">Vie</div>
        <div class="calendar-day">Sáb</div>
    `;

    // 2. Calcular fechas clave
    const firstDayIndex = new Date(year, month, 1).getDay(); // Día semana del 1 (0=Dom, 1=Lun...)
    const lastDay = new Date(year, month + 1, 0).getDate();  // Último día del mes actual
    const prevLastDay = new Date(year, month, 0).getDate();  // Último día del mes anterior

    // 3. Días del mes anterior (Relleno inicial)
    for (let x = firstDayIndex; x > 0; x--) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-date', 'other-month');
        
        // ⭐ NO APLICA GUION A DÍAS DE OTRO MES, SOLO AL ACTUAL ⭐
        dayDiv.textContent = prevLastDay - x + 1;
        grid.appendChild(dayDiv);
    }

    // 4. Días del mes actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-date');
        
        const dayDate = new Date(year, month, i);
        const dayOfWeek = dayDate.getDay(); // 0 (Dom) a 6 (Sáb)
        const dateString = dayDate.toISOString().split('T')[0];
        
        // Añadir data attributes
        dayDiv.setAttribute('data-day', i);
        dayDiv.setAttribute('data-date', dateString);
        
        // ⭐ CÓDIGO DE CORRECCIÓN: Mostrar guion en Sábados (6) y Domingos (0) ⭐
        if (dayOfWeek === 0 || dayOfWeek === 6) { 
            dayDiv.textContent = '-';
            dayDiv.classList.add('weekend'); // Agregamos una clase para CSS
            dayDiv.style.cursor = 'not-allowed';
        } else {
            dayDiv.textContent = i;
        }
        // ⭐ FIN CÓDIGO DE CORRECCIÓN ⭐
        
        
        // Si es hoy, marcarlo
        if (dayDate.setHours(0, 0, 0, 0) === today.getTime()) {
            dayDiv.classList.add('today'); 
        }

        grid.appendChild(dayDiv);
    }

    // 5. Días del mes siguiente (Relleno final para completar cuadrícula)
    const totalCellsSoFar = firstDayIndex + lastDay;
    const cellsToFill = 42 - totalCellsSoFar; 

    for (let j = 1; j <= cellsToFill; j++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-date', 'other-month');
        dayDiv.textContent = j;
        grid.appendChild(dayDiv);
    }

    // 6. Re-inicializar los eventos de click porque son elementos nuevos
    initializeCalendarEvents();
}

// ==================== FUNCIONALIDAD DEL MINI CALENDARIO ====================

// Inicializar eventos del mini calendario
// ==================== MINI CALENDARIO SIMPLIFICADO ====================

let miniCalendarCurrentDate = new Date();

function initializeMiniCalendar() {
    console.log('🔧 Inicializando mini calendario...');
    
    const calendarToggle = document.getElementById('calendar-toggle');
    const miniCalendar = document.getElementById('mini-calendar');
    
    if (!calendarToggle || !miniCalendar) {
        console.error('❌ No se encontraron elementos del mini calendario');
        return;
    }
    
    // Mostrar/ocultar mini calendario
    calendarToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('📅 Abriendo mini calendario...');
        
        // Resetear a fecha actual
        miniCalendarCurrentDate = new Date();
        
        if (miniCalendar.style.display === 'block') {
            miniCalendar.style.display = 'none';
        } else {
            miniCalendar.style.display = 'block';
            renderMiniCalendar();
        }
    });
    
    // Cerrar con X
    const closeBtn = miniCalendar.querySelector('.close-mini-calendar');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            miniCalendar.style.display = 'none';
        });
    }
    
    // Navegación
    const prevBtn = miniCalendar.querySelector('.mini-calendar-prev');
    const nextBtn = miniCalendar.querySelector('.mini-calendar-next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            miniCalendarCurrentDate.setMonth(miniCalendarCurrentDate.getMonth() - 1);
            renderMiniCalendar();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            miniCalendarCurrentDate.setMonth(miniCalendarCurrentDate.getMonth() + 1);
            renderMiniCalendar();
        });
    }
    
    // Cerrar al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!miniCalendar.contains(e.target) && e.target !== calendarToggle) {
            miniCalendar.style.display = 'none';
        }
    });
    
    console.log('✅ Mini calendario inicializado');
}

function renderMiniCalendar() {
    const grid = document.querySelector('.mini-calendar-grid');
    const title = document.getElementById('mini-calendar-title');
    
    if (!grid || !title) {
        console.error('❌ No se encontró el grid o título del mini calendario');
        return;
    }
    
    const year = miniCalendarCurrentDate.getFullYear();
    const month = miniCalendarCurrentDate.getMonth();
    
    // Actualizar título
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    title.textContent = `${monthNames[month]} ${year}`;
    
    // Limpiar grid
    grid.innerHTML = '';
    
    // Días de la semana
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    dayNames.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'mini-calendar-day';
        dayDiv.textContent = day;
        grid.appendChild(dayDiv);
    });
    
    // Calcular días
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'mini-calendar-date other-month';
        dayDiv.textContent = prevMonthLastDay - startingDay + i + 1;
        grid.appendChild(dayDiv);
    }
    
    // Días del mes actual
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'mini-calendar-date';
        
        const date = new Date(year, month, day);
        const dateString = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        
        dayDiv.setAttribute('data-date', dateString);
        dayDiv.textContent = day;
        
        // Fin de semana
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayDiv.classList.add('weekend');
            dayDiv.textContent = '-';
            dayDiv.style.cursor = 'not-allowed';
        }
        
        // Días con citas
        const hasAppointments = allCitas.some(cita => cita.fecha === dateString);
        if (hasAppointments && dayOfWeek !== 0 && dayOfWeek !== 6) {
            dayDiv.classList.add('has-appointments');
        }
        
        // Día seleccionado
        if (selectedCalendarDate && selectedCalendarDate.toISOString().split('T')[0] === dateString) {
            dayDiv.classList.add('selected');
        }
        
        // Hoy
        if (dateString === todayString) {
            dayDiv.classList.add('today');
        }
        
        // Evento click para días laborables
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            dayDiv.style.cursor = 'pointer';
            dayDiv.addEventListener('click', function() {
                selectDateFromMiniCalendar(date);
            });
        }
        
        grid.appendChild(dayDiv);
    }
    
    // Completar grid
    const totalCells = 42;
    const cellsSoFar = startingDay + daysInMonth;
    for (let day = 1; day <= (totalCells - cellsSoFar); day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'mini-calendar-date other-month';
        dayDiv.textContent = day;
        grid.appendChild(dayDiv);
    }
    
    console.log('✅ Mini calendario renderizado');
}

function selectDateFromMiniCalendar(date) {
    console.log('📅 Fecha seleccionada desde mini calendario:', date);
    
    selectedCalendarDate = date;
    
    // Actualizar todo
    updateSelectedDate(date);
    updateScheduleForDate(date);
    updatePatientCardsForDate(date);
    
    // Ocultar mini calendario
    document.getElementById('mini-calendar').style.display = 'none';
    
    // Actualizar calendario principal si es necesario
    const currentMonth = currentDate.getMonth();
    const selectedMonth = date.getMonth();
    const currentYear = currentDate.getFullYear();
    const selectedYear = date.getFullYear();
    
    if (currentMonth !== selectedMonth || currentYear !== selectedYear) {
        currentDate = new Date(selectedYear, selectedMonth, 1);
        updateCalendar();
    }
    
    // Resaltar en calendario principal
    const dateString = date.toISOString().split('T')[0];
    const calendarDate = document.querySelector(`.calendar-date[data-date="${dateString}"]`);
    if (calendarDate) {
        document.querySelectorAll('.calendar-date').forEach(d => d.classList.remove('selected'));
        calendarDate.classList.add('selected');
    }
    
    console.log('✅ Fecha actualizada');
}

// ==================== ESTADÍSTICAS CON DATOS REALES ====================

function updateStats() {
    const totalCitas = allCitas.length;
    const completadas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'completada').length;
    const programadas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'programada').length;
    const canceladas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'cancelada').length;
    const noAsistio = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'no asistió').length;
    
    console.log('📊 Actualizando estadísticas:', { totalCitas, completadas, programadas, canceladas, noAsistio });
    
    // Actualizar estadísticas generales
    const statNumbers = document.querySelectorAll('.stats-grid .stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = totalCitas;
        statNumbers[1].textContent = completadas;
        statNumbers[2].textContent = programadas;
        statNumbers[3].textContent = canceladas + noAsistio; // Canceladas + No Asistió
    }
    
    // Actualizar estadísticas del día
    const today = new Date().toISOString().split('T')[0];
    const citasHoy = allCitas.filter(c => c.fecha === today);
    
    const atendidasHoy = citasHoy.filter(c => c.estado && c.estado.toLowerCase() === 'completada').length;
    const pendientesHoy = citasHoy.filter(c => c.estado && c.estado.toLowerCase() === 'programada').length;
    const noAtendidasHoy = citasHoy.filter(c => c.estado && (c.estado.toLowerCase() === 'cancelada' || c.estado.toLowerCase() === 'no asistió')).length;
    
    const dayStats = document.querySelectorAll('.day-stats-grid .stat-number');
    if (dayStats.length >= 3) {
        dayStats[0].textContent = atendidasHoy;
        dayStats[1].textContent = pendientesHoy;
        dayStats[2].textContent = noAtendidasHoy;
    }
}

// ==================== FUNCIONES UTILITARIAS Y DEBUG ====================

function getStatusClass(estado) {
    if (!estado) return '';
    
    switch(estado.toLowerCase()) {
        case 'completada': return 'completed';
        case 'cancelada': return 'cancelled';
        case 'no asistió': return 'cancelled'; // Se usa el mismo estilo para 'No asistió'
        default: return '';
    }
}

// funAdmin.js - Agregar estas funciones en la sección de funciones de API

async function loadReporteSemanal() {
    const tbody = document.querySelector('#reporteTable tbody');
    const messageEl = document.getElementById('reporteMessage');
    const fechaInicioEl = document.getElementById('reporteFechaInicio');
    const fechaFinEl = document.getElementById('reporteFechaFin');

    if (messageEl) messageEl.textContent = 'Cargando reportes...';
    if (tbody) tbody.innerHTML = '';

    try {
        console.log('📊 Solicitando reporte semanal...');
        const response = await fetch(`${API_BASE_URL}/api/reportes/semanal`, {
            method: 'GET',
            credentials: 'include',
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Estado de respuesta:', response.status);

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('El servidor no devolvió JSON. Posible error 404.');
        }

        const data = await response.json();

        if (response.ok) {
            if (fechaInicioEl) fechaInicioEl.textContent = data.fecha_inicio;
            if (fechaFinEl) fechaFinEl.textContent = data.fecha_fin;

            if (data.citas && data.citas.length === 0) {
                if (messageEl) messageEl.textContent = 'No se encontraron citas en el rango seleccionado.';
                return;
            }

            // Limpiar tabla
            if (tbody) tbody.innerHTML = '';

            // Llenar tabla con datos
            data.citas.forEach(cita => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${cita.fecha || 'N/A'}</td>
                    <td>${cita.hora ? cita.hora.substring(0, 5) : 'N/A'}</td>
                    <td>${cita.nombre_completo || 'N/A'}</td>
                    <td>${cita.telefono || 'N/A'}</td>
                    <td>${cita.motivo || 'N/A'}</td>
                    <td>${cita.gabinete || 'N/A'}</td>
                    <td><span class="status ${(cita.estado || 'programada').toLowerCase().replace(' ', '-')}">${cita.estado || 'Programada'}</span></td>
                `;
            });

            if (messageEl) messageEl.textContent = `✅ Reporte cargado. Total de citas: ${data.total || data.citas.length}`;

        } else {
            throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
        }

    } catch (error) {
        console.error('❌ Error cargando reporte:', error);
        if (messageEl) {
            messageEl.textContent = `❌ Error: ${error.message}`;
            messageEl.style.color = 'red';
        }
        alert(`❌ Error al cargar el reporte: ${error.message}`);
    }
}
/// Función para exportar a Excel CORREGIDA
function exportTableToExcel(tableId, filename = 'reporte_semanal.xlsx') {
    const table = document.getElementById(tableId);
    if (!table) {
        alert('No se encontró la tabla para exportar');
        return;
    }

    try {
        // Verificar que la librería XLSX esté disponible
        if (typeof XLSX === 'undefined') {
            alert('❌ Error: La librería SheetJS no está cargada. Cargando ahora...');
            // Intentar cargar la librería dinámicamente
            loadSheetJS().then(() => exportTableToExcel(tableId, filename));
            return;
        }

        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        
        // Convertir tabla HTML a hoja de trabajo
        const ws = XLSX.utils.table_to_sheet(table);
        
        // Añadir hoja al libro - CORREGIDO
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Semanal');
        
        // Generar archivo y descargar - CORREGIDO
        XLSX.writeFile(wb, filename);
        
        console.log('✅ Reporte exportado exitosamente');
        alert(`✅ Reporte "${filename}" exportado con éxito.`);
        
    } catch (error) {
        console.error('❌ Error exportando a Excel:', error);
        alert('❌ Error al exportar el reporte: ' + error.message);
    }
}

// Función para cargar SheetJS dinámicamente
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Función para exportar a CSV CORREGIDA
function exportTableToCSV(tableId, filename = 'reporte_semanal.csv') {
    const table = document.getElementById(tableId);
    if (!table) {
        alert('No se encontró la tabla para exportar');
        return;
    }

    let csvData = [];
    
    // Obtener encabezados
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => 
        th.textContent.trim().replace(/(\r\n|\n|\r)/gm, "").replace(/"/g, '""')
    );
    csvData.push(headers.join(','));

    // Obtener filas de datos
    table.querySelectorAll('tbody tr').forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(td => {
            // Limpiar texto de tags HTML y escapar comillas
            const text = td.textContent.trim().replace(/(\r\n|\n|\r)/gm, "").replace(/"/g, '""');
            return `"${text}"`;
        });
        csvData.push(rowData.join(','));
    });

    // Crear y descargar archivo CSV
    const csvString = csvData.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert(`✅ Reporte "${filename}" exportado con éxito.`);
    }
}

