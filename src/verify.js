export const lc = (a) => String(a || "").toLowerCase();
export const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "–");

/** Does the explorer's creator for the token contract match the deployer the page claims? */
export function verdict(creator, deployer) {
  if (!creator) return "unknown";
  return lc(creator) === lc(deployer) ? "match" : "mismatch";
}

/** Total supply as a readable number. raw and decimals come from the explorer as strings. */
export function fmtSupply(raw, decimals) {
  try {
    const whole = BigInt(raw) / 10n ** BigInt(decimals ?? 18);
    const n = Number(whole);
    if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.00$/, "") + " trillion";
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.00$/, "") + " billion";
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, "") + " million";
    return n.toLocaleString("en-US");
  } catch { return "–"; }
}

export function widgetUrl(cfg, { pay = "ETH", theme = "light" } = {}) {
  const q = new URLSearchParams({ pay });
  if (theme === "dark") q.set("theme", "dark");
  if (cfg.referrer) q.set("ref", cfg.referrer);
  return `${cfg.stoa}/embed/swap/robinhood/${cfg.token}?${q}`;
}
