import { StacksTestnet } from '@stacks/network';
import {
  AnchorMode,
  callReadOnlyFunction,
  cvToJSON,
  principalCV,
  stringAsciiCV,
  uintCV,
} from '@stacks/transactions';

export const network = new StacksTestnet({ url: 'https://stacks-node-api.testnet.stacks.co' });

// Contract IDs on testnet as provided
export const ARTIST_REGISTRY = {
  contractAddress: 'ST3HZSQ3EVYVFAX6KR3077S69FNZHB0XWMQ2WWTNJ',
  contractName: 'artist-registry',
};

export const MARKETPLACE = {
  contractAddress: 'ST3HZSQ3EVYVFAX6KR3077S69FNZHB0XWMQ2WWTNJ',
  contractName: 'audioblocks-marketplace',
};

export async function roGetTotalArtists() {
  const res = await callReadOnlyFunction({
    network,
    contractAddress: ARTIST_REGISTRY.contractAddress,
    contractName: ARTIST_REGISTRY.contractName,
    functionName: 'get-total-artists',
    functionArgs: [],
    senderAddress: ARTIST_REGISTRY.contractAddress,
  });
  return cvToJSON(res).value;
}

export async function roGetSongIpfsCid(songId: number) {
  const res = await callReadOnlyFunction({
    network,
    contractAddress: ARTIST_REGISTRY.contractAddress,
    contractName: ARTIST_REGISTRY.contractName,
    functionName: 'get-song-ipfs-cid',
    functionArgs: [uintCV(songId)],
    senderAddress: ARTIST_REGISTRY.contractAddress,
  });
  return cvToJSON(res).value;
}

export async function roGetArtistTips(artistId: number) {
  const res = await callReadOnlyFunction({
    network,
    contractAddress: ARTIST_REGISTRY.contractAddress,
    contractName: ARTIST_REGISTRY.contractName,
    functionName: 'get-artist-tips',
    functionArgs: [uintCV(artistId)],
    senderAddress: ARTIST_REGISTRY.contractAddress,
  });
  return cvToJSON(res).value;
}

export function makeTipArtistOptions(artistId: number, amountUstx: bigint) {
  return {
    network,
    anchorMode: AnchorMode.Any,
    contractAddress: ARTIST_REGISTRY.contractAddress,
    contractName: ARTIST_REGISTRY.contractName,
    functionName: 'tip-artist',
    functionArgs: [uintCV(artistId), uintCV(amountUstx)],
  } as const;
}

export function makeMintNftOptions(collectionId: number) {
  return {
    network,
    anchorMode: AnchorMode.Any,
    contractAddress: MARKETPLACE.contractAddress,
    contractName: MARKETPLACE.contractName,
    functionName: 'mint-nft',
    functionArgs: [uintCV(collectionId)],
  } as const;
}

export function makeListNftOptions(collectionId: number, tokenId: number, priceUstx: bigint) {
  return {
    network,
    anchorMode: AnchorMode.Any,
    contractAddress: MARKETPLACE.contractAddress,
    contractName: MARKETPLACE.contractName,
    functionName: 'list-nft',
    functionArgs: [uintCV(collectionId), uintCV(tokenId), uintCV(priceUstx)],
  } as const;
}

export function makeBuyNftOptions(collectionId: number, tokenId: number) {
  return {
    network,
    anchorMode: AnchorMode.Any,
    contractAddress: MARKETPLACE.contractAddress,
    contractName: MARKETPLACE.contractName,
    functionName: 'buy-nft',
    functionArgs: [uintCV(collectionId), uintCV(tokenId)],
  } as const;
}
