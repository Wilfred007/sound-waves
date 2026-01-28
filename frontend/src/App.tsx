import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { showConnect, openContractCall } from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/auth';
// ... keep the rest of your imports from './stacks'
import {
  ARTIST_REGISTRY,
  MARKETPLACE,
  makeBuyNftOptions,
  makeListNftOptions,
  makeMintNftOptions,
  makeTipArtistOptions,
  network,
  roGetArtistTips,
  roGetSongIpfsCid,
  roGetTotalArtists,
} from './stacks';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const appDetails = {
  name: 'Audioblocks DApp (Testnet)',
  icon: window.location.origin + '/favicon.ico',
};

// Helper function to safely clear session data
const clearStaleSessionData = () => {
  try {
    // Clear via UserSession store if available
    (userSession as any).store?.deleteSessionData?.();
  } catch (err) {
    console.warn('Could not clear session via store:', err);
  }
  
  try {
    // Legacy key used by stacks auth
    localStorage.removeItem('blockstack');
  } catch (err) {
    console.warn('Could not clear blockstack from localStorage:', err);
  }
  
  try {
    // Additional Stacks-related keys that might be present
    localStorage.removeItem('blockstack-session');
    localStorage.removeItem('blockstack-transit-private-key');
  } catch (err) {
    console.warn('Could not clear additional session keys:', err);
  }
};

// Robust launcher that always uses a browser-friendly build of @stacks/connect
// async function launchShowConnect(opts: any) {
//   // Try pre-bundled browser build first
//   try {
//     const modBrowser = await import('@stacks/connect/dist/browser');
//     if (typeof (modBrowser as any).showConnect === 'function') {
//       return (modBrowser as any).showConnect(opts);
//     }
//   } catch {}
//   // Try package main export (some bundlers map it correctly)
//   try {
//     const mod = await import('@stacks/connect');
//     if (typeof (mod as any).showConnect === 'function') {
//       return (mod as any).showConnect(opts);
//     }
//   } catch {}
//   throw new Error('showConnect is unavailable in the resolved @stacks/connect build.');
// }

async function launchShowConnect(opts: any) {
  const mod = await import('@stacks/connect');
  const fn = (mod as any).showConnect;
  if (typeof fn !== 'function') {
    throw new Error('showConnect not available from @stacks/connect');
  }
  return fn(opts);
}

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

  // Check if user is already signed in with robust error handling for stale/invalid session data
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (userSession.isUserSignedIn()) {
          const loadedUserData = userSession.loadUserData();
          setUserData(loadedUserData);
          setSessionError(null);
        } else if (userSession.isSignInPending()) {
          try {
            const pendingUserData = await userSession.handlePendingSignIn();
            setUserData(pendingUserData);
            setSessionError(null);
          } catch (err) {
            console.error('handlePendingSignIn error:', err);
            setSessionError('Failed to complete sign in. Please try again.');
            clearStaleSessionData();
          }
        }
      } catch (err) {
        console.warn('Stacks session invalid. Clearing stale session data...', err);
        setSessionError('Invalid session detected. Session has been cleared.');
        clearStaleSessionData();
        setUserData(null);
      }
    };

    initializeAuth();
  }, []);

 // replace current handleSignIn with this:
 const handleSignIn = useCallback(() => {
  try {
    setSessionError(null);
    showConnect({
      appDetails,
      redirectTo: '/',
      onFinish: () => {
        try {
          const userData = userSession.loadUserData();
          setUserData(userData);
          setSessionError(null);
        } catch (err) {
          console.error('Error loading user data after sign in:', err);
          setSessionError('Failed to load user data. Please try signing in again.');
          clearStaleSessionData();
        }
      },
      onCancel: () => setSessionError(null),
      userSession,
    });
  } catch (err) {
    console.error('Error initiating sign in:', err);
    setSessionError('Failed to initiate sign in. Please try again.');
  }
}, []);


  const handleSignOut = useCallback(() => {
    try {
      userSession.signUserOut();
      setUserData(null);
      setSessionError(null);
      clearStaleSessionData();
    } catch (err) {
      console.error('Error signing out:', err);
      // Force clear even if signOut fails
      clearStaleSessionData();
      setUserData(null);
      setSessionError(null);
    }
  }, []);

  const fetchTotalArtists = useCallback(async () => {
    setPending('Fetching total artists...');
    try {
      const v = await roGetTotalArtists();
      setTotalArtists(v as any);
    } catch (error) {
      console.error('Error fetching total artists:', error);
      alert('Error fetching total artists: ' + (error as Error).message);
    } finally {
      setPending('');
    }
  }, []);

  const fetchSongCid = useCallback(async () => {
    setPending('Fetching song CID...');
    try {
      const cid = (await roGetSongIpfsCid(Number(songId))) as any;
      setSongCid(typeof cid === 'string' ? cid : JSON.stringify(cid));
    } catch (error) {
      console.error('Error fetching song CID:', error);
      setSongCid('Error: ' + (error as Error).message);
    } finally {
      setPending('');
    }
  }, [songId]);

  const fetchArtistTips = useCallback(async () => {
    setPending('Fetching artist tips...');
    try {
      const stats = await roGetArtistTips(Number(artistId));
      setTipsStats(stats);
    } catch (error) {
      console.error('Error fetching artist tips:', error);
      alert('Error fetching artist tips: ' + (error as Error).message);
    } finally {
      setPending('');
    }
  }, [artistId]);

  const tipArtist = useCallback(async () => {
    if (!userData) {
      alert('Please sign in first');
      return;
    }
    try {
      const options = makeTipArtistOptions(Number(artistId), BigInt(tipUstx));
      await openContractCall({
        ...options,
        onFinish: data => {
          console.log('Tip tx:', data);
          alert('Tip transaction sent! TxID: ' + data.txId);
        },
        onCancel: () => {
          console.log('Tip cancelled');
        },
      });
    } catch (error) {
      console.error('Error tipping artist:', error);
      alert('Error: ' + (error as Error).message);
    }
  }, [artistId, tipUstx, userData]);

  const mintNft = useCallback(async () => {
    if (!userData) {
      alert('Please sign in first');
      return;
    }
    try {
      const options = makeMintNftOptions(Number(collectionId));
      await openContractCall({
        ...options,
        onFinish: data => {
          console.log('Mint tx:', data);
          alert('Mint transaction sent! TxID: ' + data.txId);
        },
        onCancel: () => {
          console.log('Mint cancelled');
        },
      });
    } catch (error) {
      console.error('Error minting NFT:', error);
      alert('Error: ' + (error as Error).message);
    }
  }, [collectionId, userData]);

  const listNft = useCallback(async () => {
    if (!userData) {
      alert('Please sign in first');
      return;
    }
    try {
      const options = makeListNftOptions(Number(collectionId), Number(tokenId), BigInt(priceUstx));
      await openContractCall({
        ...options,
        onFinish: data => {
          console.log('List tx:', data);
          alert('List transaction sent! TxID: ' + data.txId);
        },
        onCancel: () => {
          console.log('List cancelled');
        },
      });
    } catch (error) {
      console.error('Error listing NFT:', error);
      alert('Error: ' + (error as Error).message);
    }
  }, [collectionId, tokenId, priceUstx, userData]);

  const buyNft = useCallback(async () => {
    if (!userData) {
      alert('Please sign in first');
      return;
    }
    try {
      const options = makeBuyNftOptions(Number(collectionId), Number(tokenId));
      await openContractCall({
        ...options,
        onFinish: data => {
          console.log('Buy tx:', data);
          alert('Buy transaction sent! TxID: ' + data.txId);
        },
        onCancel: () => {
          console.log('Buy cancelled');
        },
      });
    } catch (error) {
      console.error('Error buying NFT:', error);
      alert('Error: ' + (error as Error).message);
    }
  }, [collectionId, tokenId, userData]);

  const userAddress = useMemo(() => {
    return userData?.profile?.stxAddress?.testnet || null;
  }, [userData]);

  return (
    <div style={{ maxWidth: 980, margin: '20px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Audioblocks DApp (Testnet)</h1>
      <p>Network: Testnet. Explorer: <a href="https://explorer.hiro.so/?chain=testnet" target="_blank" rel="noopener noreferrer">Hiro Explorer</a></p>
      
      {/* Session Error Message */}
      {sessionError && (
        <div style={{ 
          padding: 12, 
          border: '1px solid #f44336', 
          borderRadius: 8, 
          marginBottom: 12, 
          backgroundColor: '#ffebee',
          color: '#c62828'
        }}>
          <b>⚠️ Session Error:</b> {sessionError}
          <button 
            onClick={() => {
              clearStaleSessionData();
              setSessionError(null);
              window.location.reload();
            }}
            style={{ marginLeft: 12, padding: '4px 8px' }}
          >
            Clear & Reload
          </button>
        </div>
      )}

      {/* Wallet Status */}
      <div style={{ 
        padding: 12, 
        border: '1px solid #ddd', 
        borderRadius: 8, 
        marginBottom: 12, 
        backgroundColor: userData ? '#e8f5e9' : '#fff3e0' 
      }}>
        <b>Wallet Status</b>
        {userData ? (
          <div>
            <div>✅ Connected</div>
            <div>Address: <code>{userAddress}</code></div>
            <button onClick={handleSignOut} style={{ marginTop: 8 }}>Sign Out</button>
          </div>
        ) : (
          <div>
            <div>❌ Not connected</div>
            <button onClick={handleSignIn} style={{ marginTop: 8 }}>Sign In with Wallet</button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <b>Contracts</b>
          <div>Artist Registry: {ARTIST_REGISTRY.contractAddress}.{ARTIST_REGISTRY.contractName}</div>
          <div>Marketplace: {MARKETPLACE.contractAddress}.{MARKETPLACE.contractName}</div>
        </div>

        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <b>Read-only Functions</b>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button onClick={fetchTotalArtists}>Get total artists</button>
            <span>{totalArtists !== null ? String(totalArtists) : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input value={songId} onChange={e => setSongId(e.target.value)} placeholder="song id" style={{ width: 100 }} />
            <button onClick={fetchSongCid}>Get song CID</button>
            <span style={{ wordBreak: 'break-all', fontSize: 12 }}>{songCid}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input value={artistId} onChange={e => setArtistId(e.target.value)} placeholder="artist id" style={{ width: 100 }} />
            <button onClick={fetchArtistTips}>Get artist tips</button>
            <code style={{ wordBreak: 'break-all', fontSize: 12 }}>{tipsStats ? JSON.stringify(tipsStats) : ''}</code>
          </div>
        </div>

        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <b>Tip Artist</b>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input value={artistId} onChange={e => setArtistId(e.target.value)} placeholder="artist id" style={{ width: 100 }} />
            <input value={tipUstx} onChange={e => setTipUstx(e.target.value)} placeholder="amount (ustx)" style={{ width: 120 }} />
            <button onClick={tipArtist} disabled={!userData}>Tip</button>
          </div>
          <small>ustx = micro STX. Example: 500000 = 0.5 STX. Min: 100000 (0.1 STX)</small>
        </div>

        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <b>NFT Marketplace</b>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input value={collectionId} onChange={e => setCollectionId(e.target.value)} placeholder="collection id" style={{ width: 100 }} />
            <button onClick={mintNft} disabled={!userData}>Mint NFT</button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input value={collectionId} onChange={e => setCollectionId(e.target.value)} placeholder="collection id" style={{ width: 100 }} />
            <input value={tokenId} onChange={e => setTokenId(e.target.value)} placeholder="token id" style={{ width: 100 }} />
            <input value={priceUstx} onChange={e => setPriceUstx(e.target.value)} placeholder="price (ustx)" style={{ width: 120 }} />
            <button onClick={listNft} disabled={!userData}>List for Sale</button>
            <button onClick={buyNft} disabled={!userData}>Buy NFT</button>
          </div>
          <small>Must own NFT to list. Must have sufficient STX to buy.</small>
        </div>

        {pending && <div style={{ padding: 12, color: '#555', backgroundColor: '#f5f5f5', borderRadius: 8 }}>{pending}</div>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <div style={{ position: 'fixed', top: 12, right: 12, display: 'flex', gap: 8 }}>
        <button 
          onClick={() => window.open('https://www.hiro.so/wallet/install-web', '_blank')}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Install Hiro Wallet
        </button>
      </div>
      <Actions />
    </>
  );
}