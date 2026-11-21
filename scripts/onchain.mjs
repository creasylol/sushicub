// Reads the token's facts from Blockscout and asks Stoa for a quote, then writes data/onchain.json.
// Runs in GitHub Actions so the page has a fallback when the browser can't reach the explorer.
import { writeFileSync, mkdirSync } from "node:fs";
import { CFG } from "../src/config.js";
const get = async (u) => { const r = await fetch(u, { headers: { accept: "application/json", "user-agent": "sushicub-site" } }); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); };
const out = { fetched: Math.floor(Date.now() / 1000), token: CFG.token, deployer: CFG.deployer };
try { const t = await get(`${CFG.explorer}/api/v2/tokens/${CFG.token}`); Object.assign(out, { name: t.name, symbol: t.symbol, decimals: t.decimals, totalSupply: t.total_supply, holders: t.holders_count ?? t.holders }); } catch (e) { out.tokenError = String(e.message); }
try { const a = await get(`${CFG.explorer}/api/v2/addresses/${CFG.token}`); out.creator = a.creator_address_hash || null; out.creationTx = a.creation_transaction_hash || a.creation_tx_hash || null; out.isContract = a.is_contract; out.verified = a.is_verified; } catch (e) { out.addressError = String(e.message); }
try { const a = await get(`${CFG.explorer}/api/v2/addresses/${CFG.deployer}`); out.deployerIsContract = a.is_contract; } catch (e) { out.deployerError = String(e.message); }
try {
  const q = new URLSearchParams({ chain: "robinhood", sellToken: "native", buyToken: CFG.token, amount: "1000000000000000", slippageBps: "50", referrer: CFG.referrer });
  const r = await fetch(`${CFG.stoa}/api/v1/quote?${q}`, { headers: { "user-agent": "sushicub-site" } });
  const j = await r.json().catch(() => ({}));
  out.stoa = { status: r.status, routable: r.ok && !j.error, error: j.error || null, route: j.route || null, amountOut: j.amountOut || null };
} catch (e) { out.stoa = { routable: false, error: String(e.message) }; }
mkdirSync("data", { recursive: true });
writeFileSync("data/onchain.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
