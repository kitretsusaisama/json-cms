// components/ClientConsoleArt.tsx
'use client';

import { useEffect } from 'react';
import { initializeConsoleArt } from './ConsoleArt';

export default function ClientConsoleArt() {
  useEffect(() => {
    initializeConsoleArt({
      companyName: 'Albata',
      website: 'https://avt.ink',
      enableInProduction: true
    });
  }, []);

  return null;
}