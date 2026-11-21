import { CFG } from "./config.js";
import { verdict, fmtSupply, short, widgetUrl, lc } from "./verify.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const addr = (a) => `<a class="mono" href="${CFG.explorer}/address/${esc(a)}" rel="noopener">${esc(a)}</a>`;

async function json(url) { const r = await fetch(url, { signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(String(r.status)); return r.json(); }

async function loadFacts() {
  const out = { source: "chain" };
  try {
    const [t, a] = await Promise.all([json(`${CFG.explorer}/api/v2/tokens/${CFG.token}`), json(`${CFG.explorer}/api/v2/addresses/${CFG.token}`)]);
    Object.assign(out, { name: t.name, symbol: t.symbol, decimals: t.decimals, totalSupply: t.total_supply, holders: t.holders_count ?? t.holders, creator: a.creator_address_hash, creationTx: a.creation_transaction_hash || a.creation_tx_hash });
    if (out.creationTx) { try { const tx = await json(`${CFG.explorer}/api/v2/transactions/${out.creationTx}`); out.creationFrom = tx.from?.hash; } catch { /* creator alone may still match */ } }
    return out;
  } catch { /* fall back to the snapshot an Action committed */ }
  try { const s = await json("data/onchain.json"); return { ...s, source: "snapshot" }; } catch { return { source: "none" }; }
}

function row(label, valueHtml, copy) {
  return `<div class="fact"><dt>${esc(label)}</dt><dd>${valueHtml}</dd>${copy ? `<button class="copy" type="button" data-copy="${esc(copy)}">Copy</button>` : "<span></span>"}</div>`;
}

function render(f) {
  const v = verdict(f.creator, f.creationFrom, CFG.deployer);
  const sym = f.symbol ? "$" + f.symbol : "sushicub";
  $("chip-symbol").textContent = f.source === "none" ? "Chain data unavailable" : sym;
  const chip = $("chip-verdict");
  if (v !== "unknown") { const good = v === "creator" || v === "sender"; chip.hidden = false; chip.className = "chip " + (good ? "ok" : "bad"); chip.textContent = good ? "Deployer confirmed on-chain" : "Deployer does not match the chain"; }

  const rows = [
    row("Token contract", addr(CFG.token), CFG.token),
    row("Deployer wallet", addr(CFG.deployer), CFG.deployer),
    row("Network", `${esc(CFG.chainName)}, chain ${CFG.chainId}`),
  ];
  if (f.name) rows.splice(1, 0, row("Name and symbol", `${esc(f.name)}, <b>${esc(f.symbol || "")}</b>`));
  if (f.totalSupply) rows.push(row("Total supply", esc(fmtSupply(f.totalSupply, f.decimals))));
  if (f.holders) rows.push(row("Holders", esc(Number(f.holders).toLocaleString("en-US"))));
  if (CFG.poolsFun) rows.push(row("Also trade on", `<a href="${esc(CFG.poolsFun)}" rel="noopener">pools.fun</a>`));
  rows.push(row("Creator on X", `<a href="https://x.com/${esc(CFG.xHandle)}" rel="noopener">@${esc(CFG.xHandle)}</a>`));
  $("facts").innerHTML = rows.join("");

  const when = f.fetched ? new Date(f.fetched * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "";
  const via = f.source === "snapshot" ? ` (from a snapshot taken ${when}, because the explorer couldn’t be reached from your browser)` : "";
  const c1 = f.name
    ? { cls: "ok", t: "The token contract exists on Robinhood Chain", d: `Explorer lists it as ${esc(f.name)} (${esc(f.symbol || "")})${via}. ${addr(CFG.token)}` }
    : { cls: "", t: "Checking the token contract", d: "The explorer didn’t answer. Open the contract link above to check it yourself." };
  const txLink = f.creationTx ? ` Creation transaction: <a class="mono" href="${CFG.explorer}/tx/${esc(f.creationTx)}" rel="noopener">${esc(short(f.creationTx))}</a>.` : "";
  const c2 = v === "creator"
    ? { cls: "ok", t: "It was created by the deployer wallet shown here", d: `The explorer says the contract creator is ${addr(f.creator)}, the same wallet listed above.${txLink}` }
    : v === "sender"
      ? { cls: "ok", t: "It was launched by the deployer wallet shown here", d: `The contract was created by a launcher contract (${addr(f.creator)}), and the transaction that created it was sent by ${addr(f.creationFrom)}, the deployer listed above.${txLink}` }
      : v === "mismatch"
        ? { cls: "bad", t: "The chain shows a different wallet", d: `The explorer shows creator ${addr(f.creator || "")} and creation sender ${addr(f.creationFrom || "")}, and neither is the deployer listed on this page. Don’t treat this page as the token creator’s.` }
        : { cls: "", t: "Creator check unavailable", d: "The explorer didn’t return a creator. Open the contract link and look at the “Creator” line." };
  const c3 = CFG.xPost
    ? { cls: "ok", t: "The creator announced it from X", d: `<a href="${esc(CFG.xPost)}" rel="noopener">Post from @${esc(CFG.xHandle)}</a> confirms this token and this wallet.` }
    : { cls: "", t: "Announcement from X", d: `@${esc(CFG.xHandle)} will post that this is their token and wallet. The link goes here once it is up.` };
  $("checks").innerHTML = [c1, c2, c3].map((c) => `<li class="${c.cls}"><div><b>${c.t}</b><p>${c.d}</p></div></li>`).join("");
}

$("widget").src = widgetUrl(CFG);
$("stoa-link").href = `${CFG.stoa}/trade?ref=${CFG.referrer}`;
$("x-top").href = `https://x.com/${CFG.xHandle}`; $("x-top").textContent = `@${CFG.xHandle} on X`;
document.addEventListener("click", async (e) => {
  const b = e.target.closest(".copy"); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1400); } catch { /* blocked */ }
});
loadFacts().then(render);

// Is Stoa able to route this token right now? Taken from the latest hourly probe.
json("data/onchain.json").then((d) => {
  if (!d.stoa || typeof d.stoa.routable !== "boolean") return;
  const el = $("route-status"), when = new Date(d.fetched * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  el.hidden = false;
  el.textContent = d.stoa.routable
    ? `Stoa found a route for this token at ${when}.`
    : `Stoa couldn’t route this token at ${when}. Until a pool exists on a venue Stoa uses, the widget shows a notice instead of a quote.`;
}).catch(() => {});
