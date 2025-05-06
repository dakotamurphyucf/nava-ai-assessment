// Zod schema definitions for each MCP blockchain tool.  Splitting these into a
// dedicated module keeps the main server implementation lightweight and
// enables individual tool handlers to import only what they need.

import { z } from "zod";

// 1️⃣  ETH Balance -----------------------------------------------------------
export const GetEthBalanceArgsSchema = z.object({
  address: z
    .string()
    .describe("Hex-encoded EVM address whose ETH balance will be returned"),
  // Allow caller to decide which unit we should format the balance in.
  unit: z.enum(["wei", "ether", "gwei"]).optional().default("ether"),
});

// 2️⃣  ERC-20 Balance --------------------------------------------------------
export const GetErc20BalanceArgsSchema = z.object({
  tokenAddress: z.string().describe("ERC-20 contract address"),
  accountAddress: z.string().describe("Account whose token balance will be returned"),
});

// 3️⃣  Send ETH --------------------------------------------------------------
export const SendEthArgsSchema = z.object({
  to: z.string().describe("Recipient address"),
  amountEth: z
    .string()
    .describe("Amount of ETH to send, human readable (e.g. '0.1')"),
});

// 4️⃣  Generic Contract Read -------------------------------------------------
export const CallContractArgsSchema = z.object({
  address: z.string().describe("Contract address"),
  abi: z
    .union([z.string(), z.any()])
    .describe(
      "ABI of the contract.  Can be provided as a JSON string or already parsed JS object.",
    ),
  functionName: z.string().describe("Name of the view/pure function to invoke"),
  args: z.array(z.any()).optional().default([]).describe("Arguments to pass to the function"),
});

// 5️⃣  ERC-20 Transfer -------------------------------------------------------
export const Erc20TransferArgsSchema = z.object({
  tokenAddress: z.string().describe("ERC-20 contract address"),
  to: z.string().describe("Recipient address"),
  amount: z
    .string()
    .describe(
      "Amount of tokens to transfer, expressed in human-readable units (will be converted using the token's decimals)",
    ),
});

// 6️⃣  ERC-20 Approve --------------------------------------------------------
export const Erc20ApproveArgsSchema = z.object({
  tokenAddress: z.string().describe("ERC-20 contract address"),
  spender: z.string().describe("Spender address that will receive the allowance"),
  amount: z
    .string()
    .describe("Allowance amount in human-readable units.  Use '0' to revoke an existing allowance."),
});

// 7️⃣  ERC-20 Allowance ------------------------------------------------------
export const Erc20AllowanceArgsSchema = z.object({
  tokenAddress: z.string().describe("ERC-20 contract address"),
  owner: z.string().describe("Token holder address"),
  spender: z.string().describe("Spender address"),
});

// Re-export a convenience union type for MCP server listTool generation.
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
export type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>;

