// Global audio analyzer singleton - handles Web Audio API connection
class AudioAnalyzer {
  private static instance: AudioAnalyzer | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private connectedAudioElement: HTMLAudioElement | null = null;
  private isConnecting: boolean = false;

  private constructor() {}

  static getInstance(): AudioAnalyzer {
    if (!AudioAnalyzer.instance) {
      AudioAnalyzer.instance = new AudioAnalyzer();
    }
    return AudioAnalyzer.instance;
  }

  async getAnalyser(audioElement: HTMLAudioElement, options: {
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
  } = {}): Promise<AnalyserNode | null> {
    const {
      fftSize = 128,
      smoothingTimeConstant = 0.8,
      minDecibels = -90,
      maxDecibels = -10,
    } = options;

    // Return existing analyser if same audio element and context is running
    if (this.connectedAudioElement === audioElement && 
        this.analyser && 
        this.audioContext?.state === 'running') {
      return this.analyser;
    }

    // Wait if already connecting
    if (this.isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getAnalyser(audioElement, options);
    }

    this.isConnecting = true;

    try {
      // Clean up previous connection if different audio element
      if (this.connectedAudioElement && this.connectedAudioElement !== audioElement) {
        await this.destroy();
      }

      // Create or resume audio context
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create analyser if needed
      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
      }

      // Update analyser settings
      this.analyser.fftSize = fftSize;
      this.analyser.smoothingTimeConstant = smoothingTimeConstant;
      this.analyser.minDecibels = minDecibels;
      this.analyser.maxDecibels = maxDecibels;

      // Create source if needed for this audio element
      if (!this.source && audioElement) {
        try {
          this.source = this.audioContext.createMediaElementSource(audioElement);
          this.source.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
          this.connectedAudioElement = audioElement;
        } catch (error) {
          // Element might already be connected - this is OK
          console.warn('Audio element already connected:', error);
          this.isConnecting = false;
          return this.analyser;
        }
      }

      return this.analyser;
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  async destroy(): Promise<void> {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.source = null;
    }
    
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.analyser = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    this.audioContext = null;
    this.connectedAudioElement = null;
  }
}

export const audioAnalyzer = AudioAnalyzer.getInstance();
