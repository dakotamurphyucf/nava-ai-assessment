#!/usr/bin/env node

// Main entrypoint for the Blockchain MCP server.  All heavy lifting now lives
// in dedicated modules (schemas, toolHandlers, client helpers) so this file is
// largely responsible for wiring the pieces together and exposing them via the
// MCP request / response API.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { zodToJsonSchema } from "zod-to-json-schema";

// Local helpers & data
import { rpcUrl } from "./client.js";
import {
  GetEthBalanceArgsSchema,
  GetErc20BalanceArgsSchema,
  SendEthArgsSchema,
  CallContractArgsSchema,
  Erc20TransferArgsSchema,
  Erc20ApproveArgsSchema,
  Erc20AllowanceArgsSchema,
  ToolInput,
} from "./schemas.js";

import { handleTool } from "./toolHandlers.js";

// ---------------------------------------------------------------------------
// MCP Server initialisation
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: "blockchain-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ---------------------------------------------------------------------------
// List available tools – this is consumed by the MCP client to automatically
// generate function metadata.
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_eth_balance",
        description: "Return the ETH balance of the given address.",
        inputSchema: zodToJsonSchema(GetEthBalanceArgsSchema) as ToolInput,
      },
      {
        name: "get_erc20_balance",
        description: "Return the ERC-20 token balance for a wallet.",
        inputSchema: zodToJsonSchema(GetErc20BalanceArgsSchema) as ToolInput,
      },
      {
        name: "send_eth",
        description:
          "Send a test transaction transferring ETH from one account to another (testnet / local only).",
        inputSchema: zodToJsonSchema(SendEthArgsSchema) as ToolInput,
      },
      {
        name: "call_contract",
        description:
          "Execute a read-only call against any smart-contract function by supplying the ABI & arguments.",
        inputSchema: zodToJsonSchema(CallContractArgsSchema) as ToolInput,
      },
      {
        name: "erc20_transfer",
        description: "Transfer ERC-20 tokens (testnet / local only).",
        inputSchema: zodToJsonSchema(Erc20TransferArgsSchema) as ToolInput,
      },
      {
        name: "erc20_approve",
        description: "Set or change ERC-20 allowances (testnet / local only).",
        inputSchema: zodToJsonSchema(Erc20ApproveArgsSchema) as ToolInput,
      },
      {
        name: "erc20_allowance",
        description: "Query the current ERC-20 allowance for a spender.",
        inputSchema: zodToJsonSchema(Erc20AllowanceArgsSchema) as ToolInput,
      },
      {
        name: "get_rpc_url",
        description: "Return the RPC URL this server is configured to use.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
    ],
  };
});

// ---------------------------------------------------------------------------
// Call-tool dispatcher – delegate to individual handler modules.
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  try {
    const { name: toolName, arguments: toolArgs } = request.params;
    const result = await handleTool(toolName, toolArgs);
    return {
      content: result.content,
      isError: result.isError,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Bootstrap – connect via stdio transport and start listening.
// ---------------------------------------------------------------------------

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Blockchain MCP Server listening on stdio – RPC:", rpcUrl);
}

run().catch((e) => {
  console.error("Fatal error starting blockchain MCP server:", e);
  process.exit(1);
});

