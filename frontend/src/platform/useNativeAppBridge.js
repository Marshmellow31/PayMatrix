import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  configureNativeRuntime,
  isNativeRuntime,
  minimizeNativeApp,
} from '#paymatrix-runtime';
import { consumeBackRequest } from './backNavigation.js';

const rootRoutes = new Set(['/', '/login', '/dashboard']);

const normalizeAppUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    const customPath = `/${[url.hostname, url.pathname].filter(Boolean).join('/')}`
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');
    return `${customPath || '/'}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

export const useNativeAppBridge = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);

  locationRef.current = location;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isNativeRuntime()) return undefined;

    document.documentElement.classList.add('native-runtime');
    document.body.classList.add('native-runtime');

    let disposed = false;
    let cleanup = () => {};

    configureNativeRuntime({
      onBack: () => {
        if (consumeBackRequest()) return;

        const currentPath = locationRef.current.pathname;
        if (rootRoutes.has(currentPath)) {
          minimizeNativeApp();
          return;
        }

        window.history.back();
      },
      onOpenUrl: (rawUrl) => {
        const destination = normalizeAppUrl(rawUrl);
        if (destination) navigateRef.current(destination);
      },
      onNotificationAction: (destination) => {
        if (typeof destination === 'string' && destination.startsWith('/')) {
          navigateRef.current(destination);
        }
      },
    }).then((removeListeners) => {
      if (disposed) removeListeners();
      else cleanup = removeListeners;
    });

    return () => {
      disposed = true;
      cleanup();
      document.documentElement.classList.remove('native-runtime');
      document.body.classList.remove('native-runtime');
    };
  }, []);
};
