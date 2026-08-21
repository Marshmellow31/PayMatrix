export const isNativeRuntime = () => false;

export const signInWithGoogleNative = () =>
  Promise.reject(new Error('Native Google sign-in is unavailable in the web runtime.'));

export const signOutNative = () => Promise.resolve();

export const configureNativeRuntime = () => Promise.resolve(() => {});

export const minimizeNativeApp = () => Promise.resolve();

export const payWithGooglePayNative = () =>
  Promise.reject(new Error('Native Google Pay intent is unavailable in the web runtime.'));

export const requestNativePushToken = () => Promise.resolve(null);

export const deleteNativePushToken = () => Promise.resolve();

export const addNativePushReceivedListener = () => Promise.resolve(() => {});

export const performNativeHaptic = () => Promise.resolve();
