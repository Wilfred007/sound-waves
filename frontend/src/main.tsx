import React from 'react';
import { createRoot } from 'react-dom/client';

// Ensure Node globals in browser
import { Buffer } from 'buffer';
import process from 'process';

if (!(globalThis as any).global) (globalThis as any).global = globalThis;
if (!(globalThis as any).process) (globalThis as any).process = process as any;
if (!(globalThis as any).Buffer) (globalThis as any).Buffer = Buffer as any;

import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
