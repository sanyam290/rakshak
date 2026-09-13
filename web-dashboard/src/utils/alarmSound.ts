// Web Audio API Emergency Siren & Alarm Synthesizer
// Generates loud dual-tone emergency siren sound (800Hz - 960Hz wail) directly in browser/mobile without external audio files.

class EmergencyAlarmSynthesizer {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: any = null;

  public startAlarm() {
    this.stopAlarm(); // Guarantee previous sound is killed first

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();

      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.setValueAtTime(800, this.audioCtx.currentTime);

      this.gainNode.gain.setValueAtTime(0.35, this.audioCtx.currentTime);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.oscillator.start();
      this.isPlaying = true;

      let high = false;
      this.intervalId = setInterval(() => {
        if (this.audioCtx && this.oscillator && this.isPlaying) {
          try {
            const freq = high ? 800 : 960;
            this.oscillator.frequency.exponentialRampToValueAtTime(freq, this.audioCtx.currentTime + 0.15);
            high = !high;
          } catch (err) {
            this.stopAlarm();
          }
        }
      }, 300);

    } catch (e) {
      console.error("Error starting emergency audio alarm:", e);
      this.stopAlarm();
    }
  }

  public stopAlarm() {
    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.gainNode && this.audioCtx) {
        this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      }
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    } catch (e) {
      // Ignore cleanup errors
    } finally {
      this.isPlaying = false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const alarmSynthesizer = new EmergencyAlarmSynthesizer();
