/**
 * Motor de Alarma Sonora de Emergencia (SAE / EAS)
 * Utiliza Web Audio API (síntesis armónica de tonos duales 853 Hz + 960 Hz)
 * y Web Speech API para locución de protección civil sin depender de archivos de audio externos.
 */

let activeAudioCtx = null;
let activeOscillators = [];
let activeGainNodes = [];
let isAlarmPlaying = false;
let alarmStopTimeout = null;

export function isAudioAlarmPlaying() {
  return isAlarmPlaying;
}

export function stopAudioAlarm() {
  if (alarmStopTimeout) {
    clearTimeout(alarmStopTimeout);
    alarmStopTimeout = null;
  }

  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // ignore
    }
  });
  activeOscillators = [];

  activeGainNodes.forEach((g) => {
    try {
      g.disconnect();
    } catch {
      // ignore
    }
  });
  activeGainNodes = [];

  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch {
      // ignore
    }
    activeAudioCtx = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  isAlarmPlaying = false;
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('sae-alarm-stopped'));
  }
}

/**
 * Reproduce el tono de alarma oficial SAE (Dual Tone 853 Hz + 960 Hz)
 * con envolvente de pulsos de emergencia y locución por síntesis de voz.
 *
 * @param {Object} options
 * @param {string} options.title Título de la alerta
 * @param {string} options.speechText Texto para síntesis de voz
 * @param {number} options.durationSec Duración total en segundos (default 6s)
 */
export async function playSaeAlarm({ title = 'Alerta SAE', speechText = '', durationSec = 6 } = {}) {
  stopAudioAlarm();

  if (typeof window === 'undefined') return false;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('Web Audio API no soportado en este navegador');
    return false;
  }

  try {
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    activeAudioCtx = ctx;
    isAlarmPlaying = true;
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('sae-alarm-started'));
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.connect(ctx.destination);
    activeGainNodes.push(masterGain);

    const now = ctx.currentTime;
    // Frecuencias estándar internacionales EAS / SAE Chile: 853 Hz y 960 Hz
    const FREQ_1 = 853;
    const FREQ_2 = 960;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    // Dientes de sierra / pulso para penetración acústica idéntica al receptor celular
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(FREQ_1, now);
    osc2.frequency.setValueAtTime(FREQ_2, now);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    gain1.gain.value = 0.42;
    gain2.gain.value = 0.42;

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);

    activeOscillators.push(osc1, osc2);

    // Ráfagas de pulso de advertencia SAE:
    // 4 pulsos fuertes: 420ms activo, 120ms pausa
    const pulseCount = 4;
    const pulseOn = 0.42;
    const pulseOff = 0.12;

    for (let i = 0; i < pulseCount; i++) {
      const tStart = now + i * (pulseOn + pulseOff);
      const tEnd = tStart + pulseOn;
      masterGain.gain.setValueAtTime(0.001, tStart);
      masterGain.gain.exponentialRampToValueAtTime(0.75, tStart + 0.03);
      masterGain.gain.setValueAtTime(0.75, tEnd - 0.03);
      masterGain.gain.exponentialRampToValueAtTime(0.001, tEnd);
    }

    // Fase 2: Tono continuo y sirena ascendente de protección civil
    const sirenStart = now + pulseCount * (pulseOn + pulseOff);
    masterGain.gain.setValueAtTime(0.001, sirenStart);
    masterGain.gain.exponentialRampToValueAtTime(0.65, sirenStart + 0.08);

    osc1.frequency.setValueAtTime(FREQ_1, sirenStart);
    osc1.frequency.linearRampToValueAtTime(1020, sirenStart + 1.2);
    osc1.frequency.linearRampToValueAtTime(FREQ_1, sirenStart + 2.4);

    osc2.frequency.setValueAtTime(FREQ_2, sirenStart);
    osc2.frequency.linearRampToValueAtTime(1120, sirenStart + 1.2);
    osc2.frequency.linearRampToValueAtTime(FREQ_2, sirenStart + 2.4);

    const soundEnd = Math.min(now + durationSec, sirenStart + 2.5);
    masterGain.gain.setValueAtTime(0.65, soundEnd - 0.15);
    masterGain.gain.exponentialRampToValueAtTime(0.001, soundEnd);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(soundEnd);
    osc2.stop(soundEnd);

    // Locución simultánea por síntesis de voz (Text-to-Speech)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && speechText) {
      setTimeout(() => {
        if (!isAlarmPlaying) return;
        try {
          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.lang = 'es-CL';
          utterance.rate = 1.05;
          utterance.pitch = 1.02;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch {
          // ignore
        }
      }, 1200);
    }

    alarmStopTimeout = setTimeout(() => {
      stopAudioAlarm();
    }, durationSec * 1000 + 400);

    return true;
  } catch (err) {
    console.error('Error al inicializar la alarma sonora Web Audio:', err);
    isAlarmPlaying = false;
    return false;
  }
}
