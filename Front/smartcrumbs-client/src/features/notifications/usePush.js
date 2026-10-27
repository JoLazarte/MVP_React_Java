import { useEffect, useRef, useState, useCallback } from 'react';
import { pushService } from '../../services/pushService';

/* ────────────────────────────────────────────────────────────────────────────
   Web Push real: el servidor avisa aunque la app esté cerrada.

   Este hook mantiene la suscripción del navegador alineada con lo que el usuario
   eligió en la campana (canal "push" o "auto"):
     - si corresponde, suscribe este dispositivo y se lo informa al servidor;
     - si el usuario vuelve a "escritorio" o apaga las notificaciones, lo da de baja
       para que no lleguen avisos duplicados.
   ─────────────────────────────────────────────────────────────────────────── */

export function supportsPush() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** Clave pública VAPID (base64url) → bytes, el formato que pide pushManager.subscribe */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** ¿La suscripción existente se hizo con esta misma clave del servidor? */
function sameKey(subscription, keyBytes) {
  const current = subscription?.options?.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  return a.length === keyBytes.length && a.every((v, i) => v === keyBytes[i]);
}

/** Espera al service worker activo (lo registra useNotifications), sin colgarse para siempre. */
async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing?.active) return existing;

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('El service worker no está listo')), 10000)
  );
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

/**
 * @param {object}  p
 * @param {string}  p.token       JWT del usuario (null si no hay sesión)
 * @param {boolean} p.enabled     notificaciones activadas en la campana
 * @param {string}  p.channel     'auto' | 'desktop' | 'push'
 * @param {string}  p.permission  permiso del navegador ('granted' | 'denied' | 'default')
 *
 * @returns {{ state, active, error, supported, sendTest }}
 *   state: 'unsupported' | 'loading' | 'unconfigured' | 'inactive' | 'subscribing' | 'active' | 'error'
 */
export default function usePush({ token, enabled, channel, permission }) {
  const supported = supportsPush();

  const [config, setConfig] = useState(null);   // { enabled, publicKey } — null mientras carga
  const [status, setStatus] = useState('idle'); // idle | subscribing | active | error
  const [error,  setError]  = useState(null);

  const tokenRef = useRef(token);
  tokenRef.current = token;

  // 1) Configuración del servidor (¿tiene Push? ¿cuál es su clave pública?)
  useEffect(() => {
    if (!token || !supported) return undefined;
    let cancelled = false;
    pushService.getConfig(token)
      .then((c) => { if (!cancelled) setConfig(c); })
      .catch(() => { if (!cancelled) setConfig({ enabled: false, publicKey: null }); });
    return () => { cancelled = true; };
  }, [token, supported]);

  const serverEnabled = Boolean(config?.enabled && config?.publicKey);
  const wantPush = Boolean(
    token && supported && serverEnabled && enabled
    && permission === 'granted'
    && (channel === 'push' || channel === 'auto')
  );

  // 2) Suscripción alineada con lo que se quiere
  useEffect(() => {
    if (!supported || !config) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const registration = await getRegistration();
        const current = await registration.pushManager.getSubscription();

        if (wantPush) {
          setStatus('subscribing');
          setError(null);

          const keyBytes = urlBase64ToUint8Array(config.publicKey);
          let subscription = current;

          // Si el servidor cambió de claves VAPID, la suscripción vieja ya no sirve
          if (subscription && !sameKey(subscription, keyBytes)) {
            await subscription.unsubscribe();
            subscription = null;
          }
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: keyBytes,
            });
          }

          // Alta (o reasignación al usuario actual: puede haber otro usuario en este navegador)
          await pushService.subscribe(tokenRef.current, subscription.toJSON());
          if (!cancelled) setStatus('active');
        } else if (current && tokenRef.current && (channel === 'desktop' || !enabled)) {
          // Este dispositivo dejó de usar Push: baja en el servidor y en el navegador
          await pushService.unsubscribe(tokenRef.current, current.endpoint).catch(() => {});
          await current.unsubscribe();
          if (!cancelled) setStatus('idle');
        } else if (!cancelled) {
          setStatus('idle');
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e?.message || 'No se pudo activar Push');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [supported, config, wantPush, channel, enabled, token]);

  // Estado resumido para mostrar en la interfaz
  let state;
  if (!supported)                                  state = 'unsupported';
  else if (!config)                                state = token ? 'loading' : 'inactive';
  else if (!serverEnabled)                         state = 'unconfigured';
  else if (status === 'active' && wantPush)        state = 'active';
  else if (status === 'subscribing' && wantPush)   state = 'subscribing';
  else if (status === 'error' && wantPush)         state = 'error';
  else                                             state = 'inactive';

  /** Pide al servidor que envíe un push de prueba a los dispositivos de este usuario. */
  const sendTest = useCallback(async () => {
    const result = await pushService.sendTest(tokenRef.current);
    return result?.sent ?? 0;
  }, []);

  return { state, active: state === 'active', error, supported, sendTest };
}
