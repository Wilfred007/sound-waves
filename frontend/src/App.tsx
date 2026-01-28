import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppConfig, UserSession } from '@stacks/auth';
// Importing the entire namespace to prevent "is not a function" errors
import * as Stacks from '@stacks/connect';

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

// --- Global Configuration ---
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

  // --- Auth & Session Handling ---
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    } else if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
      }).catch(console.error);
    }
  }, []);

  const handleSignIn = useCallback(() => {
    // Resilient function lookup
    const showConnect = Stacks.showConnect || (Stacks as any).default?.showConnect;

    if (typeof showConnect !== 'function') {
      alert("Connect library failed to initialize. Check vite.config.ts polyfills.");
      return;
    }

    showConnect({
      appDetails,
      userSession,
      onFinish: () => {
        setUserData(userSession.loadUserData());
        window.location.reload(); // Ensures session state syncs
      },
      onCancel: () => console.log('Sign-in cancelled'),
    });
  }, []);

  const handleSignOut = () => {
    userSession.signUserOut();
    setUserData(null);
    localStorage.clear(); // Safety clear
    window.location.reload();
  };

  // --- Contract Interactions ---
  const fetchTotalArtists = async () => {
    setPending('Fetching artists...');
    try {
      const total = await roGetTotalArtists();
      setTotalArtists(total as any);
    } catch (e) {
      console.error(e);
    } finally {
      setPending('');
    }
  };

  const tipArtist = async () => {
    if (!userData) return alert("Please connect your wallet first");

    const openContractCall = Stacks.openContractCall || (Stacks as any).default?.openContractCall;
    const options = makeTipArtistOptions(Number(artistId), BigInt(tipUstx));

    await openContractCall({
      ...options,
      onFinish: (data) => alert(`Transaction broadcast! ID: ${data.txId}`),
      onCancel: () => console.log("Transaction cancelled"),
    });
  };

  const userAddress = useMemo(() => 
    userData?.profile?.stxAddress?.testnet || null, [userData]
  );

  // --- Render ---
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1>Audioblocks Stacks DApp</h1>
        <p>Network: <strong>Testnet</strong></p>
      </header>

      {/* Wallet Connection Card */}
      <section style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '12px', background: '#f9f9f9' }}>
        {userData ? (
          <div>
            <div style={{ marginBottom: '10px' }}>✅ <strong>Connected</strong></div>
            <code style={{ display: 'block', background: '#eee', padding: '8px', borderRadius: '4px' }}>{userAddress}</code>
            <button onClick={handleSignOut} style={{ marginTop: '15px', color: 'red', cursor: 'pointer' }}>Sign Out</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p>Connect your wallet to interact with the blockchain</p>
            <button 
              onClick={handleSignIn}
              style={{ padding: '12px 24px', background: '#5546FF', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
            >
              Connect Hiro Wallet
            </button>
          </div>
        )}
      </section>

      {/* DApp Actions */}
      <main style={{ marginTop: '30px', display: 'grid', gap: '20px' }}>
        <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
          <h3>Global Registry</h3>
          <button onClick={fetchTotalArtists} disabled={!!pending}>
            {pending ? 'Loading...' : 'Get Total Artists'}
          </button>
          {totalArtists !== null && <p>Total Registered: <strong>{String(totalArtists)}</strong></p>}
        </div>

        <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
          <h3>Tip an Artist</h3>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <input 
              type="number" 
              value={artistId} 
              onChange={e => setArtistId(e.target.value)} 
              placeholder="Artist ID" 
              style={{ width: '100px', padding: '8px' }}
            />
            <input 
              type="number" 
              value={tipUstx} 
              onChange={e => setTipUstx(e.target.value)} 
              placeholder="uSTX amount" 
              style={{ flex: 1, padding: '8px' }}
            />
            <button onClick={tipArtist} disabled={!userData}>Send Tip</button>
          </div>
          <small style={{ color: '#666' }}>1 STX = 1,000,000 uSTX</small>
        </div>
      </main>

      {pending && <div style={{ marginTop: '20px', color: '#5546FF', textAlign: 'center' }}>{pending}</div>}
    </div>
  );
}