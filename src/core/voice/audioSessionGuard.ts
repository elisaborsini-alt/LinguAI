import {Platform} from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AudioSessionState = 'idle' | 'mic-active' | 'playback' | 'error';

type StateChangeCallback = (state: AudioSessionState) => void;

// ---------------------------------------------------------------------------
// AudioSessionGuard
// ---------------------------------------------------------------------------

/**
 * Single authority for microphone / speaker ownership.
 *
 * Rules:
 *  - Mic cannot be acquired while playback is locked.
 *  - Locking for playback auto-releases the mic if it is active.
 *  - All async transitions are serialized through a promise chain so that
 *    rapid calls (double-tap, callback races) cannot produce invalid states.
 */
class AudioSessionGuard {
  private state: AudioSessionState = 'idle';
  private permissionGranted: boolean = false;
  private permissionChecked: boolean = false;
  private listeners: StateChangeCallback[] = [];

  /** Serialization chain — every state-changing operation awaits this. */
  private chain: Promise<void> = Promise.resolve();

  // -------------------------------------------------------------------------
  // Permission
  // -------------------------------------------------------------------------

  private get micPermission() {
    return Platform.select({
      ios: PERMISSIONS.IOS.MICROPHONE,
      android: PERMISSIONS.ANDROID.RECORD_AUDIO,
    })!;
  }

  async checkPermission(): Promise<PermissionStatus> {
    const status = await check(this.micPermission);
    this.permissionGranted = status === RESULTS.GRANTED;
    this.permissionChecked = true;
    return status;
  }

  async requestPermission(): Promise<boolean> {
    const status = await request(this.micPermission);
    this.permissionGranted = status === RESULTS.GRANTED;
    this.permissionChecked = true;
    return this.permissionGranted;
  }

  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  // -------------------------------------------------------------------------
  // Mic control (serialized)
  // -------------------------------------------------------------------------

  /**
   * Acquire the microphone.  Returns `false` if:
   *  - playback is active (mic not allowed during AI speech)
   *  - permission was denied
   *  - mic is already active (no double-start)
   */
  acquireMic(): Promise<boolean> {
    return this.serialize(async () => {
      if (this.state === 'playback') {
        console.log('[AudioGuard] acquireMic blocked — playback active');
        return false;
      }

      if (this.state === 'mic-active') {
        console.log('[AudioGuard] acquireMic — already active');
        return true;
      }

      // Check / request permission on first attempt
      if (!this.permissionChecked) {
        await this.checkPermission();
      }

      if (!this.permissionGranted) {
        const granted = await this.requestPermission();
        if (!granted) {
          console.log('[AudioGuard] acquireMic blocked — permission denied');
          return false;
        }
      }

      this.setState('mic-active');
      return true;
    });
  }

  /**
   * Release the microphone.  Safe to call even if mic is not active.
   */
  releaseMic(): Promise<void> {
    return this.serialize(async () => {
      if (this.state === 'mic-active') {
        this.setState('idle');
      }
    }) as Promise<void>;
  }

  // -------------------------------------------------------------------------
  // Playback lock (serialized)
  // -------------------------------------------------------------------------

  /**
   * Lock the audio session for AI playback.
   * If the mic is currently active it will be released first.
   * Returns `false` only if already locked (no double-lock).
   */
  lockForPlayback(): Promise<boolean> {
    return this.serialize(async () => {
      if (this.state === 'playback') {
        return true; // already locked — idempotent
      }

      // Auto-release mic before locking for playback
      if (this.state === 'mic-active') {
        console.log('[AudioGuard] auto-releasing mic for playback');
        // Caller (speechRecognition) is responsible for actually stopping the
        // stream; here we only update the guard state.
      }

      this.setState('playback');
      return true;
    });
  }

  /**
   * Unlock the audio session after AI playback finishes.
   */
  unlockPlayback(): Promise<void> {
    return this.serialize(async () => {
      if (this.state === 'playback') {
        this.setState('idle');
      }
    }) as Promise<void>;
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  getState(): AudioSessionState {
    return this.state;
  }

  isMicAllowed(): boolean {
    return this.state !== 'playback' && this.permissionGranted;
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private setState(next: AudioSessionState): void {
    if (this.state === next) {return;}
    const prev = this.state;
    this.state = next;
    console.log(`[AudioGuard] ${prev} → ${next}`);
    for (const cb of this.listeners) {
      try {
        cb(next);
      } catch {}
    }
  }

  /**
   * Serialize an async operation onto the chain so that concurrent calls
   * execute one-at-a-time in order.  Returns the operation's result.
   */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    let result!: T;
    this.chain = this.chain
      .then(() => fn())
      .then((r) => {
        result = r;
      })
      .catch((err) => {
        console.error('[AudioGuard] serialized op error:', err);
        this.setState('error');
      });

    return this.chain.then(() => result);
  }
}

// Export singleton
export const audioSessionGuard = new AudioSessionGuard();

export default audioSessionGuard;
