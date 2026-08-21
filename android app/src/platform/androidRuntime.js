import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const NativeUpi = registerPlugin('NativeUpi');

export const isNativeRuntime = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const signInWithGoogleNative = () =>
  FirebaseAuthentication.signInWithGoogle({ useCredentialManager: true });

export const signOutNative = () => FirebaseAuthentication.signOut();

export const minimizeNativeApp = () => App.minimizeApp();

export const payWithGooglePayNative = (payment) => NativeUpi.payWithGooglePay(payment);

export const performNativeHaptic = async (kind = 'light') => {
  const styles = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  await Haptics.impact({ style: styles[kind] || ImpactStyle.Light }).catch(() => {});
};

export const requestNativePushToken = async () => {
  let permissions = await FirebaseMessaging.checkPermissions();
  if (permissions.receive === 'prompt' || permissions.receive === 'prompt-with-rationale') {
    permissions = await FirebaseMessaging.requestPermissions();
  }
  if (permissions.receive !== 'granted') return null;

  const result = await FirebaseMessaging.getToken();
  return result.token || null;
};

const createNotificationChannels = () =>
  FirebaseMessaging.createChannel({
    id: 'paymatrix_activity',
    name: 'Activity updates',
    description: 'Expenses, settlements, friend requests, and account activity',
    importance: 4,
    visibility: 0,
    vibration: true,
  }).catch(() => {});

export const deleteNativePushToken = () => FirebaseMessaging.deleteToken();

export const addNativePushReceivedListener = async (callback) => {
  const handle = await FirebaseMessaging.addListener('notificationReceived', (event) => {
    const notification = event.notification || event;
    callback({
      notification: {
        title: notification.title || 'PayMatrix',
        body: notification.body || '',
      },
      data: notification.data || {},
    });
  });

  return () => handle.remove();
};

export const configureNativeRuntime = async ({ onBack, onOpenUrl, onNotificationAction }) => {
  await Promise.allSettled([
    StatusBar.setOverlaysWebView({ overlay: true }),
    StatusBar.setStyle({ style: Style.Light }),
    Keyboard.setAccessoryBarVisible({ isVisible: true }),
    createNotificationChannels(),
  ]);

  const handles = await Promise.all([
    App.addListener('backButton', () => onBack()),
    App.addListener('appUrlOpen', ({ url }) => onOpenUrl(url)),
    FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
      const destination = event.notification?.data?.url;
      if (destination) onNotificationAction(destination);
    }),
  ]);

  await SplashScreen.hide().catch(() => {});

  return () => {
    handles.forEach((handle) => handle.remove());
  };
};
