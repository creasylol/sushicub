// Facts about the token straight from Robinhood Chain's public RPC, plus Stoa quote probes.
// Runs in GitHub Actions and writes data/onchain.json, which the page uses when the browser can't reach the explorer.
import { writeFileSync, mkdirSync } from "node:fs";
import { CFG } from "../src/config.js";
const RPC = "https://rpc.mainnet.chain.robinhood.com";
let id = 0;
const rpc = async (method, params = []) => { const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) }); const j = await r.json(); if (j.error) throw new Error(method + ": " + j.error.message); return j.result; };
const str = (h) => { try { const b = h.slice(2); const len = parseInt(b.slice(64, 128), 16); return Buffer.from(b.slice(128, 128 + len * 2), "hex").toString(); } catch { return null; } };
const out = { fetched: Math.floor(Date.now() / 1000), token: CFG.token, deployer: CFG.deployer };
const call = (data) => rpc("eth_call", [{ to: CFG.token, data }, "latest"]);
try {
  out.name = str(await call("0x06fdde03")); out.symbol = str(await call("0x95d89b41"));
  out.decimals = Number(BigInt(await call("0x313ce567"))); out.totalSupply = BigInt(await call("0x18160ddd")).toString();
  out.codeBytes = ((await rpc("eth_getCode", [CFG.token, "latest"])).length - 2) / 2;
} catch (e) { out.tokenError = String(e.message); }
// first mint = first Transfer from the zero address; its transaction shows who sent the creation
try {
  const head = parseInt(await rpc("eth_blockNumber"), 16), zero = "0x" + "0".repeat(64);
  const T = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  for (let a = 114244443; a <= head && !out.mintTx; a += 9_000_000) {
    const logs = await rpc("eth_getLogs", [{ address: CFG.token, topics: [T, zero], fromBlock: "0x" + a.toString(16), toBlock: "0x" + Math.min(a + 8_999_999, head).toString(16) }]);
    if (logs.length) { out.mintTx = logs[0].transactionHash; out.mintBlock = parseInt(logs[0].blockNumber, 16); }
  }
  if (out.mintTx) { const tx = await rpc("eth_getTransactionByHash", [out.mintTx]); out.creationFrom = tx.from; out.creationTo = tx.to; out.creationTx = out.mintTx; }
} catch (e) { out.mintError = String(e.message); }
// can Stoa route it? try a few sizes, plus ETH to USDG as a control that the API itself is up
const probe = async (buy, wei) => {
  const q = new URLSearchParams({ chain: "robinhood", sellToken: "native", buyToken: buy, amount: wei, slippageBps: "50", referrer: CFG.referrer });
  try { const r = await fetch(`${CFG.stoa}/api/v1/quote?${q}`); const j = await r.json().catch(() => ({})); return { status: r.status, ok: r.ok && !j.error, error: j.error || null, amountOut: j.amountOut || null, route: j.route || null }; }
  catch (e) { return { ok: false, error: String(e.message) }; }
};
out.stoa = { control_usdg: await probe("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", "10000000000000000") };
for (const [label, wei] of [["eth_0_0005", "500000000000000"], ["eth_0_001", "1000000000000000"], ["eth_0_01", "10000000000000000"], ["eth_0_1", "100000000000000000"]]) out.stoa[label] = await probe(CFG.token, wei);
out.stoa.routable = Object.entries(out.stoa).some(([k, v]) => k.startsWith("eth_") && v.ok);
mkdirSync("data", { recursive: true });
writeFileSync("data/onchain.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
