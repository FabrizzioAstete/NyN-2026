/* =========================================================
   VozÁgil - Lógica de transcripción de voz a texto
   Usa la Web Speech API (SpeechRecognition) nativa del
   navegador. Sin dependencias externas ni backend.
   ========================================================= */

// ---------- Referencias a elementos del DOM ----------
const btnMicrofono = document.getElementById("btnMicrofono");
const textoBoton = document.getElementById("textoBoton");
const indicadorEstado = document.getElementById("indicadorEstado");
const textoEstado = document.getElementById("textoEstado");
const mensajes = document.getElementById("mensajes");
const transcripcion = document.getElementById("transcripcion");
const btnLimpiar = document.getElementById("btnLimpiar");
const btnCopiar = document.getElementById("btnCopiar");

// ---------- Estado de la aplicación ----------
let escuchando = false;          // ¿Está activo el micrófono?
let textoFinal = "";             // Texto reconocido de forma definitiva
let textoProvisional = "";       // Texto parcial mientras se habla
let ultimoMensajeTimer = null;   // Temporizador para ocultar mensajes

// Detectar compatibilidad con la Web Speech API
const SpeechAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition;

// ---------- Inicialización ----------
function iniciar() {
  // Mensaje claro si el navegador no es compatible
  if (!SpeechAPI) {
    btnMicrofono.disabled = true;
    mostrarMensaje(
      "Tu navegador no es compatible con el reconocimiento de voz. " +
      "Usa Google Chrome o Microsoft Edge para disfrutar de VozÁgil.",
      "error",
      0 // No se oculta automáticamente
    );
    return;
  }

  configurarReconocimiento();
  pintarTranscripcion();
}

// Configurar la instancia del reconocimiento de voz
function configurarReconocimiento() {
  recognition = new SpeechAPI();

  recognition.lang = "es-PE";        // Idioma: español de Perú
  recognition.continuous = true;     // Seguir escuchando sin parar
  recognition.interimResults = true; // Mostrar resultados parciales

  // ---------- Evento: se reciben resultados ----------
  recognition.onresult = (event) => {
    let parcial = "";

    // Recorrer todos los resultados nuevos de esta sesión
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const resultado = event.results[i];
      const transcripcionResultado = resultado[0].transcript;

      if (resultado.isFinal) {
        // Texto confirmado: se acumula definitivamente
        textoFinal += transcripcionResultado + " ";
      } else {
        // Texto provisional: se muestra mientras la persona habla
        parcial += transcripcionResultado;
      }
    }

    textoProvisional = parcial;
    pintarTranscripcion();
  };

  // ---------- Evento: error (permiso denegado, sin voz, etc.) ----------
  recognition.onerror = (event) => {
    switch (event.error) {
      case "not-allowed":
      case "service-not-allowed":
        mostrarMensaje(
          "Permiso denegado. Para usar VozÁgil necesitas permitir el " +
          "acceso al micrófono desde tu navegador.",
          "error"
        );
        detener();
        break;

      case "no-speech":
        mostrarMensaje(
          "No se detectó voz. Intenta hablar un poco más cerca del micrófono.",
          "info"
        );
        break;

      case "network":
        mostrarMensaje(
          "Error de conexión. Verifica tu internet para continuar.",
          "error"
        );
        break;

      case "aborted":
        // El usuario detuvo manualmente: no es un error real.
        break;

      default:
        mostrarMensaje(
          "Ocurrió un error inesperado al reconocer la voz. " +
          "Intenta nuevamente.",
          "error"
        );
        break;
    }
  };

  // ---------- Evento: el reconocimiento se detiene solo ----------
  recognition.onend = () => {
    // Si se esperaba seguir escuchando (p. ej. por un silencio
    // prolongado), se reinicia automáticamente.
    if (escuchando) {
      try {
        recognition.start();
      } catch (e) {
        // Ya estaba iniciado: se ignora.
      }
    } else {
      actualizarUI(false);
    }
  };
}

// ---------- Iniciar / detener la transcripción ----------
function alternarEscucha() {
  if (!recognition) return;

  if (escuchando) {
    detener();
  } else {
    iniciarEscucha();
  }
}

function iniciarEscucha() {
  escuchando = true;
  mostrarMensaje(
    "Micrófono activo. Puedes empezar a hablar.",
    "info"
  );
  actualizarUI(true);

  // El navegador solicita el permiso del micrófono aquí.
  recognition.start();
}

function detener() {
  escuchando = false;
  try {
    recognition.stop();
  } catch (e) {
    // Si aún no estaba iniciado, no hay nada que detener.
  }
  actualizarUI(false);
}

// ---------- Actualizar la interfaz (botón e indicador) ----------
function actualizarUI(activo) {
  if (activo) {
    btnMicrofono.classList.add("activo");
    btnMicrofono.setAttribute("aria-pressed", "true");
    btnMicrofono.setAttribute("aria-label", "Detener transcripción");
    textoBoton.textContent = "Detener transcripción";

    indicadorEstado.classList.add("activo");
    indicadorEstado.classList.remove("inactivo");
    textoEstado.textContent = "Micrófono activo";
  } else {
    btnMicrofono.classList.remove("activo");
    btnMicrofono.setAttribute("aria-pressed", "false");
    btnMicrofono.setAttribute("aria-label", "Iniciar transcripción");
    textoBoton.textContent = "Iniciar transcripción";

    indicadorEstado.classList.remove("activo");
    indicadorEstado.classList.add("inactivo");
    textoEstado.textContent = "Micrófono inactivo";
  }
}

// ---------- Pintar la transcripción en pantalla ----------
// El texto final se muestra en color normal y el provisional
// se marca con la clase .interim (estilo atenuado y cursiva).
function pintarTranscripcion() {
  if (!textoFinal && !textoProvisional) {
    transcripcion.innerHTML =
      '<p class="placeholder">Aquí aparecerá el texto reconocido…</p>';
    return;
  }

  transcripcion.innerHTML = "";

  // Texto reconocido de forma definitiva
  if (textoFinal) {
    const parrafoFinal = document.createElement("span");
    parrafoFinal.className = "final";
    parrafoFinal.textContent = textoFinal;
    transcripcion.appendChild(parrafoFinal);
  }

  // Texto provisional (en curso)
  if (textoProvisional) {
    const parrafoProvisional = document.createElement("span");
    parrafoProvisional.className = "interim";
    parrafoProvisional.textContent = textoProvisional;
    transcripcion.appendChild(parrafoProvisional);
  }

  // Mover el scroll al final para ver siempre lo más reciente
  transcripcion.scrollTop = transcripcion.scrollHeight;
}

// ---------- Mostrar mensajes de estado / error ----------
function mostrarMensaje(texto, tipo, duracion = 6000) {
  mensajes.textContent = texto;
  mensajes.className = "mensajes " + tipo; // "error" o "info"
  mensajes.hidden = false;

  // Ocultar el mensaje después de un tiempo (si se indica)
  if (ultimoMensajeTimer) {
    clearTimeout(ultimoMensajeTimer);
    ultimoMensajeTimer = null;
  }
  if (duracion > 0) {
    ultimoMensajeTimer = setTimeout(() => {
      mensajes.hidden = true;
    }, duracion);
  }
}

function ocultarMensaje() {
  if (ultimoMensajeTimer) clearTimeout(ultimoMensajeTimer);
  mensajes.hidden = true;
}

// ---------- Limpiar la transcripción ----------
function limpiarTranscripcion() {
  textoFinal = "";
  textoProvisional = "";
  pintarTranscripcion();
  mostrarMensaje("Transcripción eliminada.", "info", 3000);
}

// ---------- Copiar el texto transcrito ----------
async function copiarTranscripcion() {
  const texto = (textoFinal + " " + textoProvisional).trim();

  if (!texto) {
    mostrarMensaje("No hay texto para copiar todavía.", "info", 3000);
    return;
  }

  try {
    await navigator.clipboard.writeText(texto);
    mostrarMensaje("¡Texto copiado al portapapeles!", "info", 3000);
  } catch (e) {
    // Alternativa si la API de portapapeles no está disponible
    mostrarMensaje(
      "No se pudo copiar automáticamente. Selecciona el texto manualmente.",
      "error"
    );
  }
}

// ---------- Variable de la instancia de reconocimiento ----------
let recognition = null;

// ---------- Eventos de los botones ----------
btnMicrofono.addEventListener("click", alternarEscucha);
btnLimpiar.addEventListener("click", limpiarTranscripcion);
btnCopiar.addEventListener("click", copiarTranscripcion);

// ---------- Arranque ----------
iniciar();
