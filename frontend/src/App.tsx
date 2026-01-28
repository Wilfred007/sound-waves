import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppConfig, UserSession } from '@stacks/auth';
// Namespace import is more resilient in Vite for this specific library
import * as StacksConnect from '@stacks/connect';

import {
  ARTIST_REGISTRY,
  MARKETPLACE,
  makeBuyNftOptions,
  makeListNftOptions,
  makeMintNftOptions,
  makeTipArtistOptions,
  roGetArtistTips,
  roGetSongIpfsCid,
  roGetTotalArtists,
} from './stacks';

// --- Global Config ---
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });
const appDetails = {
  name: 'Audioblocks DApp (Testnet)',
  icon: window.location.origin + '/favicon.ico',
};

export default function App() {
  const [userData, setUserData] = useState<any>(null);
  const [totalArtists, setTotalArtists] = useState<string | number | null>(null);
  const [artistId, setArtistId] = useState<string>('1');
  const [tipUstx, setTipUstx] = useState<string>('500000');
  const [pending, setPending] = useState<string>('');

  // --- Auth logic ---
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    } else if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then(data => {
        setUserData(data);
      }).catch(console.error);
    }
  }, []);

  const handleSignIn = useCallback(() => {
    // Check the namespace object specifically
    const connector = StacksConnect.showConnect || (StacksConnect as any).default?.showConnect;
    
    if (typeof connector !== 'function') {
      alert("Stacks Connect library failed to load. Please ensure vite-plugin-node-polyfills is installed and configured.");
      return;
    }

    connector({
      appDetails,
      userSession,
      onFinish: () => {
        window.location.reload();
      },
      onCancel: () => console.log('Sign in cancelled'),
    });
  }, []);

  const handleSignOut = () => {
    userSession.signUserOut();
    window.location.reload();
  };

  // --- Contract Actions ---
  const fetchTotalArtists = async () => {
    setPending('Fetching...');
    try {
      const v = await roGetTotalArtists();
      setTotalArtists(v as any);
    } finally { setPending(''); }
  };

  const tipArtist = async () => {
    if (!userData) return alert('Please sign in');
    const options = makeTipArtistOptions(Number(artistId), BigInt(tipUstx));
    
    // Using the same resilient check for contract calls
    const callContract = StacksConnect.openContractCall || (StacksConnect as any).default?.openContractCall;
    
    await callContract({
      ...options,
      onFinish: (data: any) => alert(`Transaction sent: ${data.txId}`),
    });
  };

  const userAddress = useMemo(() => 
    userData?.profile?.stxAddress?.testnet || null, [userData]
  );

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Audioblocks Stacks DApp</h1>

      <div style={{ border: '1px solid #ddd', padding: 20, borderRadius: 10, marginBottom: 20 }}>
        {userData ? (
          <div>
            <p>Connected: <code>{userAddress}</code></p>
            <button onClick={handleSignOut}>Disconnect</button>
          </div>
        ) : (
          <button 
            onClick={handleSignIn}
            style={{ padding: '10px 20px', backgroundColor: '#5546FF', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
          >
            Connect Hiro Wallet
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ border: '1px solid #eee', padding: 15 }}>
          <h3>Stats</h3>
          <button onClick={fetchTotalArtists}>Get Total Artists</button>
          <p>Result: {totalArtists}</p>
        </div>

        <div style={{ border: '1px solid #eee', padding: 15 }}>
          <h3>Actions</h3>
          <input value={artistId} onChange={e => setArtistId(e.target.value)} placeholder="Artist ID" />
          <input value={tipUstx} onChange={e => setTipUstx(e.target.value)} placeholder="uSTX" />
          <button onClick={tipArtist}>Tip Artist</button>
        </div>
      </div>
      {pending && <p>{pending}</p>}
    </div>
  );
}