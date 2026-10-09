// Web Audio API synthesizer for kitchen order alert chimes (offline-capable, zero external dependencies)
export function playNewOrderChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const now = ctx.currentTime
    // Double chime chord: D5 (587Hz) then A5 (880Hz)
    const notes = [
      { freq: 587.33, start: 0, duration: 0.5 },
      { freq: 880.0, start: 0.12, duration: 0.7 },
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + duration + 0.05)
    })
  } catch {
    // Autoplay policy or unsupported audio
  }
}
