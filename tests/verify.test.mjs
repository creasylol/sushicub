import test from "node:test";
import assert from "node:assert/strict";
import { verdict, fmtSupply, widgetUrl } from "../src/verify.js";
import { CFG } from "../src/config.js";
test("verdict accepts the creator or the creation-tx sender, case-insensitively", () => {
  const other = "0x" + "1".repeat(40);
  assert.equal(verdict(CFG.deployer.toLowerCase(), null, CFG.deployer), "creator");
  assert.equal(verdict(other, CFG.deployer.toLowerCase(), CFG.deployer), "sender");   // factory made it, deployer sent the tx
  assert.equal(verdict(other, other, CFG.deployer), "mismatch");
  assert.equal(verdict(null, null, CFG.deployer), "unknown");
});
test("supply formatting", () => {
  assert.equal(fmtSupply("1000000000000000000000000000", 18), "1 billion");
  assert.equal(fmtSupply("123456000000", 6), "123,456");
  assert.equal(fmtSupply("x", 18), "–");
});
test("widget url carries token and referrer", () => {
  const u = new URL(widgetUrl(CFG));
  assert.equal(u.pathname, "/embed/swap/robinhood/" + CFG.token);
  assert.equal(u.searchParams.get("ref"), CFG.referrer);
});
