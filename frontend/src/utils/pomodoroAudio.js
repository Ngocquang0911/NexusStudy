/**
 * Web Audio API synthesized notification sound.
 * Plays a pleasant, non-intrusive 3-tone harmonic chime.
 * Requires no external audio files or network requests.
 */
export function playPomodoroChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    // Melodic sequence: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
    const tones = [523.25, 659.25, 783.99]
    const startTime = ctx.currentTime

    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteStart = startTime + idx * 0.14

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteStart)

      // Envelope: gentle attack and decay
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.5)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + 0.55)
    })
  } catch {
    // Browsers block autoplay before user gesture; gracefully catch
  }
}

