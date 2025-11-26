/**
 * Rileva la piattaforma del dispositivo
 */

/**
 * Rileva se il dispositivo è iOS
 */
export function isIOS() {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';
  
  // Rileva iOS tramite user agent e platform
  return /iphone|ipad|ipod/.test(userAgent) || 
         (platform === 'macintel' && navigator.maxTouchPoints > 1); // iPad su macOS
}

/**
 * Rileva se il dispositivo è Android
 */
export function isAndroid() {
  if (typeof window === 'undefined') return false;
  return /android/.test(window.navigator.userAgent.toLowerCase());
}

/**
 * Rileva se il dispositivo è mobile
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    window.navigator.userAgent
  );
}

/**
 * Ottieni il tipo di piattaforma
 */
export function getPlatform() {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
}

