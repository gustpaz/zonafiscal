// Importar do JSON como fallback
import trackingSettings from './tracking.json';

// Função para pegar o Pixel ID (do localStorage ou fallback para JSON)
export const getPixelId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('metaPixelId') || trackingSettings.metaPixelId || '';
  }
  return trackingSettings.metaPixelId || '';
};

export const FB_PIXEL_ID = getPixelId();

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export const pageview = () => {
  const pixelId = getPixelId();
  if (pixelId && pixelId !== 'YOUR_PIXEL_ID_HERE') {
    window.fbq?.('track', 'PageView');
  }
}

// https://developers.facebook.com/docs/facebook-pixel/advanced/
export const track = (name: string, options = {}) => {
  const pixelId = getPixelId();
  if (pixelId && pixelId !== 'YOUR_PIXEL_ID_HERE') {
    window.fbq?.('track', name, options);
  }
}
