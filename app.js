import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcEgK4_NRWrqL_HcqkVwMXbHDtZnAlBFY",
  authDomain: "mibolsillo-574ad.firebaseapp.com",
  projectId: "mibolsillo-574ad",
  storageBucket: "mibolsillo-574ad.firebasestorage.app",
  messagingSenderId: "688091349294",
  appId: "1:688091349294:web:13839552ee0ad26914babf",
  measurementId: "G-GWD2YW8SE8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variables de Navegación del Test
let currentStep = 1;
const totalSteps = 5;

// Elementos del DOM
const form = document.getElementById('quiz-form');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const stepIndicator = document.getElementById('step-indicator');
const successScreen = document.getElementById('success-screen');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const themeToggle = document.getElementById('theme-toggle');

// Control del Modo Oscuro / Claro
themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
        themeToggle.textContent = 'Modo Claro';
    } else {
        themeToggle.textContent = 'Modo Oscuro';
    }
});

// Manejo de la Interfaz del Formulario por Secciones
function updateFormView() {
    document.querySelectorAll('.step-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`step-${currentStep}`).classList.add('active');
    
    stepIndicator.textContent = `Paso ${currentStep} de ${totalSteps}`;

    if (currentStep === 1) {
        prevBtn.classList.add('invisible');
    } else {
        prevBtn.classList.remove('invisible');
    }

    if (currentStep === totalSteps) {
        nextBtn.textContent = 'Finalizar Test';
        nextBtn.classList.replace('bg-slate-800', 'bg-brandFucsia');
        nextBtn.classList.replace('dark:bg-neutral-700', 'bg-brandFucsia');
    } else {
        nextBtn.textContent = 'Siguiente';
        nextBtn.classList.replace('bg-brandFucsia', 'bg-slate-800');
    }
}

function isStepValid() {
    const activeSection = document.getElementById(`step-${currentStep}`);
    const inputs = activeSection.querySelectorAll('input[required], textarea[required]');
    for (let input of inputs) {
        if (!input.value.trim()) return false;
    }

    const radioGroups = new Set();
    activeSection.querySelectorAll('input[type="radio"]').forEach(radio => radioGroups.add(radio.name));
    for (let groupName of radioGroups) {
        const checked = activeSection.querySelector(`input[name="${groupName}"]:checked`);
        if (!checked) return false;
    }
    return true;
}

nextBtn.addEventListener('click', async () => {
    if (!isStepValid()) {
        alert('Por favor, responde los campos obligatorios antes de avanzar.');
        return;
    }

    if (currentStep < totalSteps) {
        currentStep++;
        updateFormView();
    } else {
        await guardarYProcesar();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
        currentStep--;
        updateFormView();
    }
});

// Transmitir respuestas a Firebase y preparar interfaz final
async function guardarYProcesar() {
    nextBtn.disabled = true;
    nextBtn.textContent = 'Procesando...';

    const herramientasSeleccionadas = [];
    document.querySelectorAll('input[name="herramientas"]:checked').forEach(cb => {
        herramientasSeleccionadas.push(cb.value);
    });

    const payload = {
        nombre: document.getElementById('nombre').value,
        telefono: document.getElementById('telefono').value,
        zona: document.getElementById('zona').value,
        escenarioA: document.querySelector('input[name="escenarioA"]:checked')?.value || '',
        escenarioB: document.querySelector('input[name="escenarioB"]:checked')?.value || '',
        zonaConfort: document.querySelector('input[name="zonaConfort"]:checked')?.value || '',
        herramientas: herramientasSeleccionadas,
        herramientaOtro: document.getElementById('herramientaOtro').value || 'Ninguna declarada.',
        experiencia: document.getElementById('experiencia').value,
        aprendizaje: document.getElementById('aprendizaje').value,
        fecha: new Date().toISOString()
    };

    try {
        // Guardado Externo para ti en Cloud Firestore
        await addDoc(collection(db, "respuestas_test"), payload);
        
        // Carga de la información en la plantilla PDF oculta
        document.getElementById('pdf-nombre').textContent = payload.nombre;
        document.getElementById('pdf-telefono').textContent = payload.telefono;
        document.getElementById('pdf-zona').textContent = payload.zona;
        document.getElementById('pdf-escenarioA').textContent = payload.escenarioA;
        document.getElementById('pdf-escenarioB').textContent = payload.escenarioB;
        document.getElementById('pdf-zonaConfort').textContent = payload.zonaConfort;
        document.getElementById('pdf-herramientaOtro').textContent = payload.herramientaOtro;
        document.getElementById('pdf-experiencia').textContent = payload.experiencia;
        document.getElementById('pdf-aprendizaje').textContent = payload.aprendizaje;

        const ul = document.getElementById('pdf-herramientas');
        ul.innerHTML = '';
        if (payload.herramientas.length === 0) {
            ul.innerHTML = '<li>No se seleccionaron competencias digitales bases.</li>';
        } else {
            payload.herramientas.forEach(h => {
                const li = document.createElement('li');
                li.style.marginBottom = '4px';
                li.textContent = h;
                ul.appendChild(li);
            });
        }

        // Cambio de pantalla
        form.classList.add('hidden');
        stepIndicator.parentElement.classList.add('hidden');
        successScreen.classList.remove('hidden');

    } catch (error) {
        console.error("Error transaccional en la base de datos: ", error);
        alert("Ocurrió un inconveniente al registrar tu perfil. Por favor vuelve a intentarlo.");
        nextBtn.disabled = false;
        nextBtn.textContent = 'Finalizar Test';
    }
}

// Disparador de compilación y descarga de PDF local
downloadPdfBtn.addEventListener('click', () => {
    const elementoPdf = document.getElementById('pdf-template');
    const nombrePersona = document.getElementById('nombre').value.replace(/\s+/g, '_');
    
    const configuracionPdf = {
        margin:       10,
        filename:     `Reporte_Competencias_${nombrePersona}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(configuracionPdf).from(elementoPdf).save();
});