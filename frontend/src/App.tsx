import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppConfig, UserSession } from '@stacks/auth';
// Use a clean, single import for the connect library
import { showConnect, openContractCall } from '@stacks/connect';

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

// --- Configuration ---
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const appDetails = {
  name: 'Audioblocks DApp (Testnet)',
  icon: window.location.origin + '/favicon.ico',
};

// --- Helper Utilities ---
const clearStaleSessionData = () => {
  localStorage.removeItem('blockstack');
  localStorage.removeItem('blockstack-session');
  localStorage.removeItem('blockstack-transit-private-key');
  try {
    (userSession as any).store?.deleteSessionData?.();
  } catch (e) {}
};

function Actions() {
  const [userData, setUserData] = useState<any>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [totalArtists, setTotalArtists] = useState<string | number | null>(null);
  const [songId, setSongId] = useState<string>('1');
  const [songCid, setSongCid] = useState<string>('');
  const [artistId, setArtistId] = useState<string>('1');
  const [tipUstx, setTipUstx] = useState<string>('500000');
  const [collectionId, setCollectionId] = useState<string>('1');
  const [tokenId, setTokenId] = useState<string>('1');
  const [priceUstx, setPriceUstx] = useState<string>('1000000');
  const [tipsStats, setTipsStats] = useState<any | null>(null);
  const [pending, setPending] = useState<string>('');

  // --- Initialization ---
  useEffect(() => {
    const checkAuth = async () => {
      if (userSession.isUserSignedIn()) {
        setUserData(userSession.loadUserData());
      } else if (userSession.isSignInPending()) {
        try {
          const data = await userSession.handlePendingSignIn();
          setUserData(data);
        } catch (err) {
          console.error("Auth error:", err);
          clearStaleSessionData();
        }
      }
    };
    checkAuth();
  }, []);

  // --- Handlers ---
  const handleSignIn = useCallback(() => {
    if (typeof showConnect !== 'function') {
      setSessionError("Connect library not loaded. Please refresh.");
      return;
    }

    showConnect({
      appDetails,
      userSession,
      onFinish: () => {
        setUserData(userSession.loadUserData());
        window.location.reload();
      },
      onCancel: () => console.log('User cancelled'),
    });
  }, []);

  const handleSignOut = useCallback(() => {
    userSession.signUserOut();
    clearStaleSessionData();
    setUserData(null);
  }, []);

  // --- Contract Interactions ---
  const fetchTotalArtists = async () => {
    setPending('Fetching...');
    try {
      const v = await roGetTotalArtists();
      setTotalArtists(v as any);
    } catch (e) { alert(e); }
    finally { setPending(''); }
  };

  const tipArtist = async () => {
    if (!userData) return alert("Sign in first");
    try {
      const options = makeTipArtistOptions(Number(artistId), BigInt(tipUstx));
      await openContractCall({
        ...options,
        onFinish: (data) => alert(`Tx Sent: ${data.txId}`),
      });
    } catch (e) { alert(e); }
  };

  const userAddress = useMemo(() => 
    userData?.profile?.stxAddress?.testnet || null, [userData]
  );

  return (
    <div style={{ maxWidth: 850, margin: '20px auto', padding: 20, fontFamily: 'system-ui' }}>
      <h1>Audioblocks DApp</h1>
      
      <div style={{ padding: 15, background: userData ? '#f0fff0' : '#fff0f0', borderRadius: 8, marginBottom: 20 }}>
        {userData ? (
          <>
            <div>✅ Connected: <code>{userAddress}</code></div>
            <button onClick={handleSignOut} style={{ marginTop: 10 }}>Sign Out</button>
          </>
        ) : (
          <button onClick={handleSignIn} style={{ padding: '10px 20px', background: '#5546FF', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            Connect Hiro Wallet
          </button>
        )}
        {sessionError && <p style={{ color: 'red' }}>{sessionError}</p>}
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <section style={{ border: '1px solid #ddd', padding: 15, borderRadius: 8 }}>
          <h3>Global Stats</h3>
          <button onClick={fetchTotalArtists}>Get Total Artists</button>
          <span style={{ marginLeft: 10 }}>{totalArtists}</span>
        </section>

        <section style={{ border: '1px solid #ddd', padding: 15, borderRadius: 8 }}>
          <h3>Tip Artist</h3>
          <input value={artistId} onChange={e => setArtistId(e.target.value)} placeholder="Artist ID" />
          <input value={tipUstx} onChange={e => setTipUstx(e.target.value)} placeholder="Amount (uSTX)" />
          <button onClick={tipArtist} disabled={!userData}>Send Tip</button>
        </section>
      </div>

      {pending && <p style={{ color: 'blue' }}>{pending}</p>}
    </div>
  );
}

export default function App() {
  return <Actions />;
}