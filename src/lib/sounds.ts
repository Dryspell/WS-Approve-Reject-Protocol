/**
 * Sound effects for The Vote Exchange Protocol
 * Using Web Audio API for better performance
 */

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Vote cast sound - short click
  voteSet(color: 'red' | 'blue') {
    const frequency = color === 'red' ? 440 : 523.25; // A4 or C5
    this.playTone(frequency, 0.1, 'square');
  }

  // Trade complete - success sound
  tradeComplete() {
    if (!this.audioContext || !this.enabled) return;

    // Ascending chord
    setTimeout(() => this.playTone(261.63, 0.1), 0); // C
    setTimeout(() => this.playTone(329.63, 0.1), 50); // E
    setTimeout(() => this.playTone(392.00, 0.15), 100); // G
  }

  // Guarantee purchased
  guaranteePurchased() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(523.25, 0.1, 'sine'); // C
    setTimeout(() => this.playTone(659.25, 0.15, 'sine'), 80); // E
  }

  // Round start - alert tone
  roundStart() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(587.33, 0.1); // D
    setTimeout(() => this.playTone(587.33, 0.1), 150);
  }

  // Timer warning - last 30 seconds
  timerWarning() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(440, 0.15, 'triangle');
  }

  // Elimination - descending tone
  elimination() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(440, 0.15, 'sawtooth'); // A
    setTimeout(() => this.playTone(392, 0.15, 'sawtooth'), 100); // G
    setTimeout(() => this.playTone(349.23, 0.2, 'sawtooth'), 200); // F
  }

  // Survival - positive sound
  survival() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(523.25, 0.1); // C
    setTimeout(() => this.playTone(659.25, 0.1), 80); // E
    setTimeout(() => this.playTone(783.99, 0.15), 160); // G
  }

  // Victory - celebration
  victory() {
    if (!this.audioContext || !this.enabled) return;

    // Triumphant ascending arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C E G C E
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine'), i * 100);
    });
  }

  // Error - negative sound
  error() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(200, 0.2, 'sawtooth');
    setTimeout(() => this.playTone(180, 0.25, 'sawtooth'), 100);
  }

  // Pot increase - coins sound
  potIncrease() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(800, 0.05, 'square');
    setTimeout(() => this.playTone(1000, 0.05, 'square'), 40);
    setTimeout(() => this.playTone(1200, 0.08, 'square'), 80);
  }

  // Money received
  moneyReceived() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(1000, 0.08, 'sine');
    setTimeout(() => this.playTone(1200, 0.12, 'sine'), 60);
  }

  // Button click - subtle feedback
  click() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(800, 0.03, 'square');
  }

  // Hover - very subtle
  hover() {
    if (!this.audioContext || !this.enabled) return;

    this.playTone(1200, 0.02, 'sine');
  }
}

// Global singleton instance
let soundManager: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!soundManager && typeof window !== 'undefined') {
    soundManager = new SoundManager();
  }
  return soundManager!;
}

// Convenience functions
export const sounds = {
  voteSet: (color: 'red' | 'blue') => getSoundManager()?.voteSet(color),
  tradeComplete: () => getSoundManager()?.tradeComplete(),
  guaranteePurchased: () => getSoundManager()?.guaranteePurchased(),
  roundStart: () => getSoundManager()?.roundStart(),
  timerWarning: () => getSoundManager()?.timerWarning(),
  elimination: () => getSoundManager()?.elimination(),
  survival: () => getSoundManager()?.survival(),
  victory: () => getSoundManager()?.victory(),
  error: () => getSoundManager()?.error(),
  potIncrease: () => getSoundManager()?.potIncrease(),
  moneyReceived: () => getSoundManager()?.moneyReceived(),
  click: () => getSoundManager()?.click(),
  hover: () => getSoundManager()?.hover(),
};

