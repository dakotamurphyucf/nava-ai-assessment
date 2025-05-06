# Nava AI Technical Assessment – Model Context Protocol (MCP) Blockchain Server

This repository contains a **Model Context Protocol (MCP)** server that exposes a set of tools for interacting with an **EVM-based blockchain**.  It is written in **TypeScript**, uses the official [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) and [`viem`](https://viem.sh/) libraries, and can be run against any JSON-RPC endpoint (local Hardhat/Anvil, testnet, or mainnet fork).

The server is intentionally lightweight – it focuses on **demonstrating core MCP features** (initialisation, tool discovery & execution) rather than providing a production-ready feature set.  The codebase is therefore easy to read and reason about in the context of a take-home challenge.

---

## 📦  Setup

1. **Clone** the repository and install dependencies:

```bash
npm install
```

2. **Provide an RPC URL** (defaults to `http://127.0.0.1:8545` so a local Hardhat/Anvil/Ganache node works out-of-the-box).

```bash
# Option A – environment variable
export RPC_URL="https://<network-endpoint>"

# Option B – first CLI argument when starting the server
node dist/index.js "https://<network-endpoint>"
```

3. *(Optional)* **Signing key for write actions** – tools that **send transactions** (`send_eth`, `erc20_transfer`, `erc20_approve`) require a private key.  For safety the key is never hard-coded; instead export it before running the server:

```bash
export PRIVATE_KEY=0xabc123...deadbeef          # **DON'T** use a real mainnet key!
```

4. **Build** the TypeScript code and make the CLI entry-point executable:

```bash
npm run build   # runs `tsc` and chmod +x the dist files
```

5. **Start** the MCP server.  It uses STDIO transport so can be embedded by any MCP host (e.g. Claude Desktop) or driven manually from a terminal:

```bash
# From the project root
node ./dist/index.js           # Equivalent to `npx mcp-server-blockchain` once published

# Expected output
Blockchain MCP Server listening on stdio – RPC: http://127.0.0.1:8545
```

---

## 🚀  Demonstration of Successful Tool Use

The following shows a minimal round-trip using **`jq`** to craft JSON-RPC requests and read the responses.  Any other MCP-compatible client will work the same way.

> 📝  All examples assume the server is already running on STDIN/STDOUT in the current terminal.

### 1. List the available tools

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n' | node ./dist/index.js | jq

# ↳ Sample (truncated) response
# {
#   "result": {
#     "tools": [
#       { "name": "get_eth_balance", ... },
#       { "name": "get_erc20_balance", ... },
#       { "name": "send_eth", ... },
#       ...
#     ]
#   }
# }
```

### 2. Query an account’s ETH balance

```bash
cat <<EOF | node ./dist/index.js | jq
{"jsonrpc":"2.0","id":2,
 "method":"tools/call",
 "params":{
   "name":"get_eth_balance",
   "arguments":{
     "address":"0x0000000000000000000000000000000000000000",
     "unit":"ether"
   }
 }}
EOF

# ↳ Example result
# {
#   "result": {
#     "content": [
#       { "type": "text", "text": "10000.0" }
#     ]
#   }
# }
```

### 3. Send a test ETH transfer (requires `PRIVATE_KEY`)

```bash
cat <<EOF | node ./dist/index.js | jq
{"jsonrpc":"2.0","id":3,
 "method":"tools/call",
 "params":{
   "name":"send_eth",
   "arguments":{
     "to":"0x000000000000000000000000000000000000dead",
     "amountEth":"0.01"
   }
 }}
EOF
# ↳ The response will contain the broadcast transaction hash
```

---

## 🏗️  Implementation Choices

* **Viem instead of ethers.js** – smaller bundle, pure ESM, first-class TypeScript types and a very ergonomic contract abstraction.
* **Zod** – declarative runtime validation and automatic TypeScript inference.  We also convert the same schemas into JSON Schema via `zod-to-json-schema` so the MCP client can generate function metadata without duplicating type information.
* **Strict separation of concerns**  
  * `index.ts` – MCP wiring & transport.  
  * `schemas.ts` – tool input validation.  
  * `toolHandlers.ts` – actual blockchain logic.  
  * `client.ts` – thin viem helpers (singletons for public/wallet clients, chain definition, etc.).
* **No external databases or frameworks** – keeps the footprint tiny and the focus on protocol demonstration.

---

## ⚠️  Assumptions & Limitations

* **Local/Testnets only for write actions** – the private key is loaded from an environment variable and *no key-management hardening* is provided.  Using the server against mainnet would be dangerous and is therefore considered out-of-scope.
* **ERC-20 centric** – the sample write tools work exclusively with standard token contracts; non-standard implementations may fail.
* **JSON-RPC over STDIO only** – other MCP transports (HTTP & SSE) could be added.

---


