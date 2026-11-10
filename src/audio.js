let audioContext;

function getContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function tone(context, frequency, start, duration, volume, type = 'triangle') {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

export function playPairSound(volume = 0.55) {
  try {
    const context = getContext();
    if (!context) return;
    const now = context.currentTime + 0.015;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      tone(context, frequency, now + index * 0.085, 0.2, Math.max(0.01, volume) * 0.12);
    });
  } catch (error) {
    console.warn('Não foi possível reproduzir o efeito sonoro:', error);
  }
}

export function playVictorySound(volume = 0.55) {
  try {
    const context = getContext();
    if (!context) return;
    const now = context.currentTime + 0.02;
    [392, 493.88, 587.33, 783.99, 987.77].forEach((frequency, index) => {
      tone(context, frequency, now + index * 0.14, 0.48, Math.max(0.01, volume) * 0.15);
    });
    tone(context, 130.81, now, 0.32, Math.max(0.01, volume) * 0.22, 'sine');
    tone(context, 196, now + 0.55, 0.65, Math.max(0.01, volume) * 0.18, 'sine');
  } catch (error) {
    console.warn('Não foi possível reproduzir a comemoração:', error);
  }
}
