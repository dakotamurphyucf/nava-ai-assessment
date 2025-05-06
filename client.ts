// Utility helpers for interacting with an EVM JSON-RPC endpoint via viem.
// All previously inlined inside `blockchain.ts` but extracted for reuse by
// individual tool handlers.

import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ---------------------------------------------------------------------------
// RPC / chain configuration
// ---------------------------------------------------------------------------

// Allow the caller to optionally pass the RPC URL as the first CLI argument or
// via an environment variable.  Falling back to a local Hardhat/Ganache style
// default keeps things friction-free for local testing.
export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

// NOTE: This evaluates at module import time – which is fine, as the arguments
// will have been parsed by Node at process start-up.
const cliArgs = process.argv.slice(2);

export const rpcUrl: string = cliArgs[0] ?? process.env.RPC_URL ?? DEFAULT_RPC_URL;

// A very minimal chain definition that mirrors Hardhat's local test chain.  We
// purposefully avoid depending on any well-known chain IDs so the server works
// the same whether the developer is running hardhat-node, an anvil fork, etc.
export const testChain = defineChain({
  id: 1337,
  name: "LocalTestChain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  contracts: {
    // Multicall3 is optional but handy.  We leave the address here so anyone
    // who has deployed it locally gets automatic batching.
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
});

// ---------------------------------------------------------------------------
// Cached client helpers – avoids the cost of recreating a client per request
// ---------------------------------------------------------------------------

let _publicClient: ReturnType<typeof createPublicClient> | undefined;

export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      transport: http(rpcUrl),
      chain: testChain,
    });
  }
  return _publicClient;
}

export function getWalletClient(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({ account, transport: http(rpcUrl), chain: testChain });
}

