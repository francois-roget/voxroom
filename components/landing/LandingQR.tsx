'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function LandingQR() {
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join`);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
        Ou scanne pour rejoindre
      </p>
      <div className="p-4 rounded-2xl" style={{ backgroundColor: '#ffffff' }}>
        <QRCodeSVG value={joinUrl} size={140} />
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        /join
      </p>
    </div>
  );
}
