export interface Soundscape {
  readonly district: string
  readonly period: 'morning' | 'afternoon' | 'night'
  readonly mode: 'world' | 'dialogue' | 'desenrolo' | 'ended'
}

const districtRoots: Readonly<Record<string, number>> = {
  tiete: 146.83,
  centro: 164.81,
  bixiga: 174.61,
  liberdade: 196,
  paulista: 220,
  zona_leste: 130.81,
  minhocao: 155.56,
}

export function scoreFrequencies(soundscape: Soundscape): readonly number[] {
  const root = districtRoots[soundscape.district] ?? districtRoots.tiete!
  const periodRatio =
    soundscape.period === 'morning' ? 1 : soundscape.period === 'night' ? 0.75 : 1.125
  const tension = soundscape.mode === 'desenrolo' ? 16 / 15 : 1
  return [root, root * 1.2, root * 1.5].map((frequency) => frequency * periodRatio * tension)
}

export class AudioDirector {
  private context?: AudioContext
  private master?: GainNode
  private ambience?: GainNode
  private soundscape?: Soundscape
  private muted = false
  private lastStep = 0

  start(): void {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.muted ? 0 : 0.42
      this.master.connect(this.context.destination)
      this.startRain()
      window.setInterval(() => this.playPhrase(), 2400)
      window.setInterval(() => this.playTraffic(), 6800)
    }
    void this.context.resume()
  }

  sync(soundscape: Soundscape): void {
    this.soundscape = soundscape
    if (!this.context) return
    if (soundscape.mode === 'ended') this.chime([261.63, 329.63, 392, 523.25], 0.1)
  }

  cue(actionId: string): void {
    if (!this.context || !this.master) return
    if (actionId === 'footstep') {
      const now = performance.now()
      if (now - this.lastStep < 180) return
      this.lastStep = now
      this.noiseBurst(0.035, 420, 0.025)
      return
    }
    if (actionId.startsWith('battle:')) {
      this.tone(actionId.includes('argue') ? 246.94 : 110, 0.09, 'square', 0.055)
      return
    }
    if (actionId.startsWith('travel:')) {
      this.chime([146.83, 196, 293.66], 0.06)
      return
    }
    if (actionId.startsWith('choice:')) {
      this.chime([220, 277.18], 0.045)
      return
    }
    if (actionId.startsWith('talk:') || actionId === 'advance') {
      this.tone(392, 0.035, 'triangle', 0.025)
      return
    }
    this.tone(174.61, 0.05, 'square', 0.025)
  }

  toggle(): boolean {
    this.muted = !this.muted
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.context.currentTime, 0.03)
    return this.muted
  }

  isMuted(): boolean {
    return this.muted
  }

  private startRain(): void {
    if (!this.context || !this.master) return
    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * 2,
      this.context.sampleRate
    )
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    this.ambience = this.context.createGain()
    source.buffer = buffer
    source.loop = true
    filter.type = 'lowpass'
    filter.frequency.value = 1900
    this.ambience.gain.value = 0.055
    source.connect(filter).connect(this.ambience).connect(this.master)
    source.start()
  }

  private playPhrase(): void {
    if (!this.soundscape || this.soundscape.mode === 'ended') return
    const notes = scoreFrequencies(this.soundscape)
    notes.forEach((frequency, index) =>
      this.tone(
        frequency,
        0.75,
        'triangle',
        this.soundscape?.mode === 'desenrolo' ? 0.035 : 0.018,
        index * 0.12
      )
    )
  }

  private playTraffic(): void {
    if (!this.context || !this.master || this.soundscape?.mode !== 'world') return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(74, now)
    oscillator.frequency.exponentialRampToValueAtTime(46, now + 1.7)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.026, now + 0.5)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.7)
    oscillator.connect(gain).connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + 1.75)
  }

  private chime(notes: readonly number[], volume: number): void {
    notes.forEach((frequency, index) => this.tone(frequency, 0.13, 'square', volume, index * 0.07))
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    if (!this.context || !this.master) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const start = this.context.currentTime + delay
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(gain).connect(this.master)
    oscillator.start(start)
    oscillator.stop(start + duration)
  }

  private noiseBurst(duration: number, cutoff: number, volume: number): void {
    if (!this.context || !this.master) return
    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * duration,
      this.context.sampleRate
    )
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    gain.gain.value = volume
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(this.master)
    source.start()
  }
}
