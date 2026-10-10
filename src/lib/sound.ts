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

// Upbeat bell chime for customer food preparation ready alerts
export function playFoodReadyChime() {
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
    // Ascending arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const notes = [
      { freq: 523.25, start: 0, duration: 0.3 },
      { freq: 659.25, start: 0.1, duration: 0.35 },
      { freq: 783.99, start: 0.2, duration: 0.4 },
      { freq: 1046.5, start: 0.3, duration: 0.7 },
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.2, now + start + 0.02)
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

// Crisp dual-tone ding for waiter service requests (service bell sound)
export function playServiceRequestChime() {
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
    // Hotel service desk bell emulation: High clear bell ring 1318Hz (E6) & 2637Hz harmonic
    const notes = [
      { freq: 1318.5, start: 0, duration: 0.9, gain: 0.35 },
      { freq: 2637.0, start: 0, duration: 0.5, gain: 0.15 },
      { freq: 1760.0, start: 0.08, duration: 0.8, gain: 0.25 },
    ]

    notes.forEach(({ freq, start, duration, gain: maxGain }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(maxGain, now + start + 0.01)
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
