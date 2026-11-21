# sushicub

Official page for the sushicub token on Robinhood Chain, with a [Stoa](https://stoadex.com) swap widget.

Live: https://creasylol.github.io/sushicub/

- Token: `0x053531b55b33528b143ba7de58f783dcfc1ca28c`
- Deployer: `0x50Dbb5Fcb0Df22F5F28286f914FbD18B0D2b8E00`
- Creator on X: [@hermez042](https://x.com/hermez042)

The page doesn’t just state the deployer: it reads the contract’s creator from the Blockscout API and shows whether it matches. A GitHub Action refreshes `data/onchain.json` every hour as a fallback and checks that Stoa can quote the token.

The widget is Stoa’s official embed (`/embed/swap/robinhood/<token>`). It has no wallet connection inside the page, and swaps made through it carry the referrer set in `src/config.js`.

```
node --test tests/verify.test.mjs
python3 -m http.server 8000   # serve over HTTP, the page uses ES modules
```

MIT licensed. Not financial advice.
