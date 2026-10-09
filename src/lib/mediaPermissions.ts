/**
 * Permanent Camera and Microphone Permission Manager for Kapi Studio.
 * Remembers user permission preferences in localStorage/IndexedDB and provides
 * seamless media stream acquisition for audio recording and webcam video capture.
 */

export interface MediaPermissionStatus {
  micGranted: boolean;
  cameraGranted: boolean;
  micState: 'granted' | 'denied' | 'prompt' | 'unknown';
  cameraState: 'granted' | 'denied' | 'prompt' | 'unknown';
  lastCheckedAt: string | null;
}

const STORAGE_KEY_MIC = 'kapi_studio_mic_granted';
const STORAGE_KEY_CAMERA = 'kapi_studio_camera_granted';
const STORAGE_KEY_LAST_CHECK = 'kapi_studio_media_perm_last_check';

export async function checkMediaPermissionsStatus(): Promise<MediaPermissionStatus> {
  let micState: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';
  let cameraState: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';

  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      micState = micStatus.state as any;
      if (micStatus.state === 'granted') {
        localStorage.setItem(STORAGE_KEY_MIC, 'true');
      } else if (micStatus.state === 'denied') {
        localStorage.setItem(STORAGE_KEY_MIC, 'false');
      }
    } catch {
      // Permissions API for microphone might not be supported in all browsers
    }

    try {
      const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      cameraState = cameraStatus.state as any;
      if (cameraStatus.state === 'granted') {
        localStorage.setItem(STORAGE_KEY_CAMERA, 'true');
      } else if (cameraStatus.state === 'denied') {
        localStorage.setItem(STORAGE_KEY_CAMERA, 'false');
      }
    } catch {
      // Permissions API for camera might not be supported in all browsers
    }
  }

  const micSaved = localStorage.getItem(STORAGE_KEY_MIC) === 'true';
  const cameraSaved = localStorage.getItem(STORAGE_KEY_CAMERA) === 'true';

  return {
    micGranted: micState === 'granted' || micSaved,
    cameraGranted: cameraState === 'granted' || cameraSaved,
    micState,
    cameraState,
    lastCheckedAt: localStorage.getItem(STORAGE_KEY_LAST_CHECK)
  };
}

export async function requestAndSaveMediaPermissions(options: { audio?: boolean; video?: boolean } = { audio: true, video: true }): Promise<{ stream: MediaStream | null; micGranted: boolean; cameraGranted: boolean; error: string | null }> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    return {
      stream: null,
      micGranted: false,
      cameraGranted: false,
      error: 'Brak obsługi navigator.mediaDevices.getUserMedia w Twojej przeglądarce lub brak bezpiecznego połączenia (HTTPS).'
    };
  }

  try {
    const constraints: MediaStreamConstraints = {
      audio: options.audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false,
      video: options.video ? {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      } : false
    };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (errConstraint) {
      console.warn('[MediaPermissions] Detailed constraints failed, trying basic constraints:', errConstraint);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: !!options.audio,
        video: !!options.video
      });
    }

    const hasAudioTrack = stream.getAudioTracks().length > 0;
    const hasVideoTrack = stream.getVideoTracks().length > 0;

    if (hasAudioTrack || options.audio) {
      localStorage.setItem(STORAGE_KEY_MIC, 'true');
    }
    if (hasVideoTrack || options.video) {
      localStorage.setItem(STORAGE_KEY_CAMERA, 'true');
    }
    localStorage.setItem(STORAGE_KEY_LAST_CHECK, new Date().toISOString());

    return {
      stream,
      micGranted: hasAudioTrack || (localStorage.getItem(STORAGE_KEY_MIC) === 'true'),
      cameraGranted: hasVideoTrack || (localStorage.getItem(STORAGE_KEY_CAMERA) === 'true'),
      error: null
    };
  } catch (err: any) {
    console.error('[MediaPermissions] Permission request error:', err);
    let errorMsg = 'Nie udało się uzyskać dostępu do urządzeń multimedialnych.';
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      errorMsg = 'Dostęp do kamery lub mikrofonu został zablokowany w przeglądarce. Zezwól na dostęp w ustawieniach kłódki przy adresie strony.';
    } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      errorMsg = 'Nie znaleziono podłączonej kamery lub mikrofonu w systemie.';
    } else if (err?.name === 'NotReadableError') {
      errorMsg = 'Kamera lub mikrofon jest w użyciu przez inną aplikację.';
    }

    return {
      stream: null,
      micGranted: localStorage.getItem(STORAGE_KEY_MIC) === 'true',
      cameraGranted: localStorage.getItem(STORAGE_KEY_CAMERA) === 'true',
      error: errorMsg
    };
  }
}

export function getStoredMediaPermissions(): { micGranted: boolean; cameraGranted: boolean } {
  return {
    micGranted: localStorage.getItem(STORAGE_KEY_MIC) === 'true',
    cameraGranted: localStorage.getItem(STORAGE_KEY_CAMERA) === 'true'
  };
}
