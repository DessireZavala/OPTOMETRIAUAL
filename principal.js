let currentStep = 1;
const totalSteps = 5;
const API_BASE_URL = 'http://127.0.0.1:5000'; // URL base de tu servidor Flask

// Variables globales para el flujo de la cita
let selectedDate = null;
let selectedTime = null;
let isNewPatient = null;
let patientData = {}; // Guarda datos del paciente habitual o nuevo

// ---------------------------
// Funcionalidad de Navegación de Pasos
// ---------------------------
function showStep(step) {
  const views = document.querySelectorAll('.step-view');
  const dots = document.querySelectorAll('.step');
  const progress = document.querySelector('.progress');

  views.forEach((v, i) => v.classList.toggle('active', i === step - 1));
  dots.forEach((d, i) => d.classList.toggle('active', i === step - 1));

  const percent = ((step - 1) / (totalSteps - 1)) * 100;
  progress.style.width = `${percent}%`;
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Eventos de Navegación
document.querySelectorAll('.back').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentStep > 1) showStep(--currentStep);
  });
});

// ---------------------------
// PASO 1 - CORREGIDO
// ---------------------------
document.getElementById('optionNuevo').addEventListener('click', function() {
    selectOption(this);
});

document.getElementById('optionHabitual').addEventListener('click', function() {
    selectOption(this);
});

function selectOption(selectedBtn) {
    console.log('Seleccionando:', selectedBtn.id);
    
    // Remover selección de todos
    document.querySelectorAll('.step-view.active .option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Aplicar selección al clickeado
    selectedBtn.classList.add('selected');
    
    // Habilitar siguiente
    document.getElementById('next1').disabled = false;
    
    // Determinar tipo de paciente
    isNewPatient = selectedBtn.id === 'optionNuevo';
    console.log('isNewPatient:', isNewPatient);
    
    // Configurar paso 4
    setupStep4Form();
}

function setupStep4Form() {
    const step4View = document.querySelector('.step-view:nth-of-type(4) .form-group');
    if (!step4View) {
        console.error('No se encontró el contenedor del formulario del paso 4');
        return;
    }
    
    step4View.innerHTML = '';
    console.log('Configurando formulario para:', isNewPatient ? 'Paciente nuevo' : 'Paciente habitual');

    if (isNewPatient) {
        step4View.innerHTML = `
            <input type="text" id="inputNombre" placeholder="Nombre" required>
            <input type="text" id="inputApellido" placeholder="Apellido(s)" required>
            <input type="number" id="inputEdad" placeholder="Edad" required>
            <input type="tel" id="inputTelefono" placeholder="Teléfono" required>
        `;
    } else {
        step4View.innerHTML = `
            <p>Ingresa tu teléfono y verificaremos tus datos:</p>
            <input type="tel" id="inputTelefonoHabitual" placeholder="Teléfono" required>
            <button id="checkHabitual" class="main-btn" type="button">Verificar Teléfono</button>
            <div id="habitualMessage" style="margin-top: 10px; color: #d82b2b;"></div>
        `;
        // Re-asignar el event listener después de crear el botón
        setTimeout(() => {
            const checkBtn = document.getElementById('checkHabitual');
            if (checkBtn) {
                checkBtn.addEventListener('click', buscarPacienteHabitual);
            }
        }, 0);
    }
}

document.getElementById('next1').onclick = function() {
    const selectedOption = document.querySelector('.step-view.active .option.selected');
    if (selectedOption) {
        console.log('Avanzando al paso 2...');
        showStep(2);
    } else {
        alert('Por favor, selecciona una opción.');
    }
};

// ---------------------------
// PASO 2 - CORREGIDO
// ---------------------------
document.querySelectorAll('.step-view:nth-of-type(2) .option').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.step-view:nth-of-type(2) .option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
    });
});

document.getElementById('next2').onclick = function() {
    const selectedOption = document.querySelector('.step-view.active .option.selected');
    if (selectedOption) {
        console.log('Servicio seleccionado:', selectedOption.textContent);
        showStep(3);
        generateCalendar(currentDate);
    } else {
        alert('Por favor, selecciona un tipo de servicio.');
    }
};

// ---------------------------
// PASO 4 - CORREGIDO
// ---------------------------
document.getElementById('next4').onclick = async () => {
    // Validar si es paciente nuevo o habitual antes de avanzar
    if (isNewPatient) {
        // Validar campos de paciente nuevo
        if (!document.getElementById('inputNombre')?.value || 
            !document.getElementById('inputApellido')?.value ||
            !document.getElementById('inputEdad')?.value ||
            !document.getElementById('inputTelefono')?.value) {
            alert('Por favor, completa todos los campos.');
            return;
        }
    } else {
        // Para paciente habitual, se debe haber verificado el teléfono
        if (!patientData.telefono) {
            alert('Por favor, verifica tu número de teléfono primero.');
            return;
        }
    }

    // Se asume que la validación fue exitosa, avanzamos al paso de confirmación
    const confirmed = await agendarCita();
    if(confirmed) {
        fillConfirmationDetails(); // Llenar los datos del paso 5
        showStep(5);
    }
};

// ---------------------------
// Lógica de Paciente Habitual (Paso 4)
// ---------------------------
async function buscarPacienteHabitual() {
    const telefono = document.getElementById('inputTelefonoHabitual').value;
    const messageEl = document.getElementById('habitualMessage');
    messageEl.textContent = '';
    
    if (!telefono) {
        messageEl.textContent = 'Ingresa tu teléfono.';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/paciente/buscar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono })
        });
        const data = await response.json();
        
        if (response.ok && !data.es_nuevo) {
            patientData = data.paciente;
            messageEl.textContent = `¡Datos encontrados! Nombre: ${patientData.nombre} ${patientData.apellido}`;
            messageEl.style.color = '#274e3b';
            document.getElementById('next4').disabled = false;
        } else {
            messageEl.textContent = 'Paciente no encontrado. ¿Estás seguro de ser un paciente habitual?';
            messageEl.style.color = '#d82b2b';
            patientData = {};
            document.getElementById('next4').disabled = true;
        }

    } catch (error) {
        messageEl.textContent = 'Error de conexión con el servidor.';
        messageEl.style.color = '#d82b2b';
        console.error('Error buscando paciente:', error);
    }
}

// ---------------------------
// Calendario y Disponibilidad (Paso 3)
// ---------------------------
const calendarEl = document.getElementById('calendar');
const monthYearEl = document.getElementById('monthYear');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const timeSlotsEl = document.getElementById('timeSlots');
const selectedText = document.getElementById('selectedText');

let currentDate = new Date();
selectedDate = null;
selectedTime = null;

function generateCalendar(date) {
    calendarEl.innerHTML = '';
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const monthName = date.toLocaleString('es-ES', { month: 'long' });
    monthYearEl.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

    const headers = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    headers.forEach(h => {
        const div = document.createElement('div');
        div.textContent = h;
        div.classList.add('header');
        calendarEl.appendChild(div);
    });

    for (let i = 0; i < firstDay.getDay(); i++) {
        // Días de meses anteriores (vacíos)
        calendarEl.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dayDiv = document.createElement('div');
        
        // CORRECCIÓN para evitar problemas de zona horaria: Crear la fecha con hora fija (00:00:00)
        const dayDate = new Date(year, month, d, 0, 0, 0); 
        const dateKey = dayDate.toISOString().split('T')[0];
        const dayOfWeek = dayDate.getDay();
        
        dayDiv.classList.add('day');
        
        // ⭐ CÓDIGO DE CORRECCIÓN: Mostrar guion en Sábados (6) y Domingos (0) ⭐
        if (dayOfWeek === 0 || dayOfWeek === 6) { 
            dayDiv.textContent = '-';
            dayDiv.classList.add('disabled', 'weekend');
            dayDiv.style.cursor = 'not-allowed';
        } else {
            dayDiv.textContent = d;
             // Deshabilitar días pasados
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dayDate < today) {
                 dayDiv.classList.add('disabled', 'other-month');
                 dayDiv.style.cursor = 'not-allowed';
            } else {
                dayDiv.addEventListener('click', () => selectDate(dateKey, dayDiv));
            }
        }
        // ⭐ FIN CÓDIGO DE CORRECCIÓN ⭐


        if (selectedDate === dateKey) dayDiv.classList.add('selected');

        calendarEl.appendChild(dayDiv);
    }
    
    // Al generar el calendario, limpiar slots y resumen
    timeSlotsEl.innerHTML = '';
    updateSummary();
}

async function selectDate(dateKey, dayDiv) {
    selectedDate = dateKey;
    selectedTime = null;
    document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
    dayDiv.classList.add('selected');

    // Limpiar slots viejos
    timeSlotsEl.innerHTML = 'Cargando disponibilidad...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/citas/disponibilidad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha: dateKey })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            generateTimeSlots(data.disponibilidad);
        } else {
            timeSlotsEl.innerHTML = `<div style="color: #d82b2b;">Error al cargar horarios: ${data.message}</div>`;
        }

    } catch (error) {
        timeSlotsEl.innerHTML = `<div style="color: #d82b2b;">Error de conexión con el servidor.</div>`;
        console.error('Error cargando disponibilidad:', error);
    }
    
    updateSummary();
}

function generateTimeSlots(disponibilidad) {
    timeSlotsEl.innerHTML = '';
    // Los horarios vienen ordenados y filtrados por el servidor (12:30:00 a 15:30:00)
    const availableHours = Object.keys(disponibilidad).sort();
    
    if (availableHours.length === 0) {
        timeSlotsEl.innerHTML = '<div style="color: #d82b2b;">No hay horarios disponibles para este día.</div>';
        return;
    }

    availableHours.forEach(time24 => {
        // Mapear hora 24h a formato visible con AM/PM para el usuario
        let timeDisplay = time24.substring(0, 5);
        if (time24.startsWith('12')) {
            timeDisplay += ' PM';
        } else if (parseInt(time24.substring(0, 2)) > 12) {
            const hour12 = parseInt(time24.substring(0, 2)) - 12;
            timeDisplay = `${hour12}:${time24.substring(3, 5)} PM`;
        } else {
            timeDisplay += ' PM'; // Todos son de la tarde
        }
        
        const timeSlotDiv = document.createElement('div');
        timeSlotDiv.textContent = `${timeDisplay}`; // Ya tiene 'hrs' en la función selectTime
        timeSlotDiv.classList.add('time-slot');

        // La hora debe estar en formato 24h con segundos para el backend (12:30:00)
        const timeKey = time24; 

        if (disponibilidad[timeKey] === 'Ocupado') {
            timeSlotDiv.classList.add('disabled');
        } else {
            timeSlotDiv.addEventListener('click', () => selectTime(timeSlotDiv, timeKey));
        }

        // Si la hora ya estaba seleccionada, la marcamos de nuevo
        if (selectedTime === timeKey) {
            timeSlotDiv.classList.add('selected');
        }

        timeSlotsEl.appendChild(timeSlotDiv);
    });
}

function selectTime(slot, time) {
    selectedTime = time;
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    updateSummary();
}

function updateSummary() {
    if (!selectedDate) {
        selectedText.textContent = 'Ninguna';
        document.getElementById('next3').disabled = true;
        return;
    }

    // CORRECCIÓN: Usar la cadena de fecha directamente para Date si es 'YYYY-MM-DD' para evitar problemas de zona horaria
    const dateObj = new Date(selectedDate + 'T00:00:00'); 
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('es-ES', options);
    
    if (selectedTime) {
        const timeDisplay24 = selectedTime.substring(0, 5);
        
        // Conversión a formato visible (igual que en generateTimeSlots)
        let timeDisplay12 = timeDisplay24;
        if (selectedTime.startsWith('12')) {
            timeDisplay12 += ' PM';
        } else if (parseInt(selectedTime.substring(0, 2)) > 12) {
            const hour12 = parseInt(selectedTime.substring(0, 2)) - 12;
            timeDisplay12 = `${hour12}:${selectedTime.substring(3, 5)} PM`;
        } else {
            timeDisplay12 += ' PM'; 
        }

        selectedText.textContent = `${formattedDate} — ${timeDisplay12} hrs`;
        document.getElementById('next3').disabled = false;
    } else {
        selectedText.textContent = `${formattedDate} (sin hora seleccionada)`;
        document.getElementById('next3').disabled = true;
    }
}

// Lógica de navegación del calendario
prevBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar(currentDate);
};
nextBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar(currentDate);
};

// Navegación de Paso 3
document.getElementById('next3').onclick = () => {
    if (selectedDate && selectedTime) {
        showStep(4);
        setupStep4Form(); // Asegurar que el formulario se configure al llegar al paso 4
    } else {
        alert('Por favor, selecciona una fecha y hora disponibles.');
    }
};

// ---------------------------
// Agendar Cita (Paso 4 -> API)
// ---------------------------
async function agendarCita() {
    const motivoEl = document.querySelector('.step-view:nth-of-type(2) .option.selected');
    const tipoServicio = motivoEl.textContent;
    // Hardcoded según config.py
    const id_motivo = (tipoServicio === 'Lentes de Armazón' ? 1 : 2); 
    
    const citaData = {
        fecha: selectedDate,
        hora: selectedTime,
        id_motivo: id_motivo,
        es_nuevo: isNewPatient
    };

    if (isNewPatient) {
        citaData.nombre = document.getElementById('inputNombre').value;
        citaData.apellido = document.getElementById('inputApellido').value; 
        citaData.edad = document.getElementById('inputEdad').value;
        citaData.telefono = document.getElementById('inputTelefono').value;
    } else {
        // Para paciente habitual, usamos los datos precargados
        citaData.nombre = patientData.nombre;
        citaData.apellido = patientData.apellido;
        citaData.edad = patientData.edad;
        citaData.telefono = patientData.telefono;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/citas/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(citaData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Cita agendada con éxito!');
            return true;
        } else {
            alert('Error al agendar cita: ' + (data.message || 'Error desconocido.'));
            console.error('API Error:', data.message);
            return false;
        }

    } catch (error) {
        alert('Error de conexión con el servidor al agendar la cita.');
        console.error('Fetch Error:', error);
        return false;
    }
}

// ---------------------------
// Llenar Confirmación (Paso 5)
// ---------------------------
function fillConfirmationDetails() {
    const tipoServicio = document.querySelector('.step-view:nth-of-type(2) .option.selected')?.textContent || '---';
    const fechaHora = selectedText.textContent || 'No seleccionada';
    
    let nombrePaciente = '';
    if (isNewPatient) {
        nombrePaciente = `${document.getElementById('inputNombre').value} ${document.getElementById('inputApellido').value}`;
    } else {
        nombrePaciente = `${patientData.nombre} ${patientData.apellido}`;
    }

    document.getElementById('confirmTipoAtencion').textContent = 'Presencial'; 
    document.getElementById('confirmTipoServicio').textContent = tipoServicio;
    document.getElementById('confirmFecha').textContent = fechaHora.split('—')[0].trim() || '---';
    document.getElementById('confirmHora').textContent = fechaHora.split('—')[1] ? fechaHora.split('—')[1].trim() : '---';
    document.getElementById('confirmNombre').textContent = nombrePaciente;
}

// Botón "Agendar otra cita"
document.getElementById('newAppointment').addEventListener('click', () => {
    // Reiniciar datos y volver al paso 1
    currentStep = 1;
    selectedDate = null;
    selectedTime = null;
    isNewPatient = null;
    patientData = {};

    document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
    document.getElementById('selectedText').textContent = 'Ninguna';
    
    // Limpiar el formulario del paso 4
    const step4FormGroup = document.querySelector('.step-view:nth-of-type(4) .form-group');
    if (step4FormGroup) {
        step4FormGroup.innerHTML = '';
    }

    showStep(currentStep);
});

// Inicialización
generateCalendar(currentDate);
showStep(1); // Asegura que empiece en el paso 1