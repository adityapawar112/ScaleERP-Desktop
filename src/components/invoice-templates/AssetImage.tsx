import React, { useState, useEffect } from 'react';

interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  assetPath?: string | null;
  fallbackSrc?: string;
}

export const AssetImage: React.FC<AssetImageProps> = ({ assetPath, fallbackSrc, alt = 'Asset', style, ...imgProps }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!assetPath || !window.electronAPI || !window.electronAPI.system) {
      setDataUrl(null);
      return;
    }

    window.electronAPI.system.readAssetAsBase64(assetPath)
      .then((res: any) => {
        if (isMounted && res && res.success && res.dataUrl) {
          setDataUrl(res.dataUrl);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load asset as base64:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [assetPath]);

  const srcToRender = dataUrl || fallbackSrc;

  if (!srcToRender) return null;

  return <img src={srcToRender} alt={alt} style={{ objectFit: 'contain', ...style }} {...imgProps} />;
};
