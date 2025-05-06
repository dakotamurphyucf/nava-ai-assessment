// Individual tool implementations for the Blockchain MCP server.  Each tool
// exists as its own async function which receives the raw (already-parsed) tool
// arguments and returns an MCP-compatible response object.

import {
  erc20Abi,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  getContract,
} from "viem";

// Local utility helpers & chain configuration
import {
  getPublicClient,
  getWalletClient,
  testChain,
  rpcUrl,
} from "./client.js";

// Schemas
import {
  GetEthBalanceArgsSchema,
  GetErc20BalanceArgsSchema,
  SendEthArgsSchema,
  CallContractArgsSchema,
  Erc20TransferArgsSchema,
  Erc20ApproveArgsSchema,
  Erc20AllowanceArgsSchema,
} from "./schemas.js";

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

export interface ToolResponse {
  content: { type: "text"; text: string }[];
  isError?: boolean;

}

const getPrivateKey = () => {
  // Retrieve the private key from a secure location
  return process.env.PRIVATE_KEY;
};

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function handleGetEthBalance(raw: Record<string, unknown> | undefined): Promise<ToolResponse> {
  const parsed = GetEthBalanceArgsSchema.safeParse(raw);
  if (!parsed.success) throw parsed.error;

  const { address, unit } = parsed.data;
  const client = getPublicClient();
  const balance = await client.getBalance({ address: address as `0x${string}` });

  // Format balance based on requested unit
  let formatted: string;
  switch (unit) {
    case "wei":
      formatted = balance.toString();
      break;
    case "gwei":
      formatted = formatUnits(balance, 9);
      break;
    default:
      formatted = formatEther(balance);
  }

  return { content: [{ type: "text", text: formatted }] };
}

async function handleGetErc20Balance(raw: Record<string, unknown> | undefined): Promise<ToolResponse> {
  const parsed = GetErc20BalanceArgsSchema.safeParse(raw);
  if (!parsed.success) throw parsed.error;

  const { tokenAddress, accountAddress } = parsed.data;
  const client = getPublicClient();
  const contract = getContract({ address: tokenAddress as `0x${string}`, abi: erc20Abi, client });

  const [balance, decimals] = await Promise.all([
    contract.read.balanceOf([accountAddress as `0x${string}`]) as Promise<bigint>,
    contract.read.decimals() as Promise<number>,
  ]);

  const human = formatUnits(balance, decimals);
  const formatted = `${human} tokens (${balance.toString()} raw)`;

  return { content: [{ type: "text", text: formatted }] };
}

async function handleSendEth(raw: unknown): Promise<ToolResponse> {
  const parsed = SendEthArgsSchema.safeParse(raw);
  if (!parsed.success) throw parsed.error;

  const { to, amountEth } = parsed.data;
  const privateKey = getPrivateKey();
  const wallet = getWalletClient(privateKey as `0x${string}`);
  const hash = await wallet.sendTransaction({
    chain: testChain,
    to: to as `0x${string}`,
    value: parseEther(amountEth),
  });

  return { content: [{ type: "text", text: `Transaction broadcast.  Hash: ${hash}` }] };
}

async function handleCallContract(raw: Record<string, unknown> | undefined): Promise<ToolResponse> {
  const parsed = CallContractArgsSchema.safeParse(raw);
  if (!parsed.success) throw parsed.error;

  let { address, abi, functionName, args } = parsed.data;
  if (typeof abi === "string") {
    abi = JSON.parse(abi);
  }

  const client = getPublicClient();
  const contract = getContract({ address: address as `0x${string}`, abi, client });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – dynamic access is fine here because we validate functionName above
  const result = await contract.read[functionName](args as any);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
      },
    ],
  };
}

async function handleErc20Transfer(raw: Record<string, unknown> | undefined): Promise<ToolResponse> {
  const parsed = Erc20TransferArgsSchema.safeParse(raw);
  if (!parsed.success) throw parsed.error;

  const { tokenAddress, to, amount } = parsed.data;
  const privateKey = getPrivateKey();
  const wallet = getWalletClient(privateKey as `0x${string}`);

  const client = getPublicClient();
  const contractRead = getContract({ address: tokenAddress as `0x${string}`, abi: erc20Abi, client });
  const decimals = (await contractRead.read.decimals()) as number;

  const amountRaw = parseUnits(amount, decimals);

  const hash = await wallet.writeContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to as `0x${string}`, amountRaw],
    chain: testChain,
  });

  return { content: [{ type: "text", text: `Transfer submitted. Tx hash: ${hash}` }] };
}

async function handleErc20Approve(raw: Record<string, unknown> | undefined): Promise<ToolResponse> {
  const parsed = Erc20ApproveArgsSchema.safeParse(raw);
  if (!parsed.success) throw parsed.error;

  const { tokenAddress, spender, amount } = parsed.data;
  const privateKey = getPrivateKey();
  const wallet = getWalletClient(privateKey as `0x${string}`);

  const client = getPublicClient();
  const contractRead = getContract({ address: tokenAddress as `0x${string}`, abi: erc20Abi, client });
  const decimals = (await contractRead.read.decimals()) as number;

  const amountRaw = parseUnits(amount, decimals);

  const hash = await wallet.writeContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender as `0x${string}`, amountRaw],
    chain: testChain,
  });

  return { content: [{ type: "text", text: `Approve transaction broadcast. Tx hash: ${hash}` }] };
}

async function handleErc20Allowance(raw: Record<string, unknown> | undefined): Promise<ToolResponse> {
  const parsed = Erc20AllowanceArgsSchema.safeParse(raw);
  if (!parsed.success) throw parsed.error;

  const { tokenAddress, owner, spender } = parsed.data;

  const client = getPublicClient();
  const contract = getContract({ address: tokenAddress as `0x${string}`, abi: erc20Abi, client });

  const [allowanceRaw, decimals] = await Promise.all([
    contract.read.allowance([owner as `0x${string}`, spender as `0x${string}`]) as Promise<bigint>,
    contract.read.decimals() as Promise<number>,
  ]);

  const allowanceHuman = formatUnits(allowanceRaw, decimals);

  return {
    content: [
      {
        type: "text",
        text: `${allowanceHuman} tokens (${allowanceRaw.toString()} raw)`,
      },
    ],
  };
}

async function handleGetRpcUrl(): Promise<ToolResponse> {
  return { content: [{ type: "text", text: rpcUrl }] };
}

// ---------------------------------------------------------------------------
// Handler map + dispatcher
// ---------------------------------------------------------------------------

const handlers: Record<string, (raw: Record<string, unknown> | undefined ) => Promise<ToolResponse>> = {
  get_eth_balance: handleGetEthBalance,
  get_erc20_balance: handleGetErc20Balance,
  send_eth: handleSendEth,
  call_contract: handleCallContract,
  erc20_transfer: handleErc20Transfer,
  erc20_approve: handleErc20Approve,
  erc20_allowance: handleErc20Allowance,
  get_rpc_url: () => handleGetRpcUrl(),
};

export async function handleTool(toolName: string, rawArgs: Record<string, unknown> | undefined): Promise<ToolResponse> {
  const fn = handlers[toolName];
  if (!fn) throw new Error(`Unknown tool: ${toolName}`);
  return fn(rawArgs);
}

