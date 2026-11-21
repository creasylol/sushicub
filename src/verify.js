export const lc = (a) => String(a || "").toLowerCase();
export const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "–");

/**
 * Does the chain agree the deployer wallet made this token?
 * "creator" is the address that created the contract; "sender" is who sent the creation transaction.
 * Launchpad tokens are created by a factory contract, so the deployer is then the sender, not the creator.
 * Returns "creator", "sender", "mismatch" or "unknown".
 */
export function verdict(creator, sender, deployer) {
  if (!creator && !sender) return "unknown";
  if (creator && lc(creator) === lc(deployer)) return "creator";
  if (sender && lc(sender) === lc(deployer)) return "sender";
  return "mismatch";
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
