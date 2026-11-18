# btc-race-bot-2

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/QTV1409/btc-race-bot-2/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/QTV1409/btc-race-bot-2/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A BTC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty: it buys a deep 200 bps dip below the 240-bar high of Coinbase Wrapped BTC (cbBTC) with the full $1,000 of paper money, sells the whole position on a 200 bps recovery above its entry close, and cuts losses on a 250 bps disaster stop. It trades $1,000 of paper money against replayed 1-minute on-chain bars — no real funds, no real trades.

How it works: the bot speaks the bars-replay protocol (one `hello`, then one `batch` per minute with the bar that just closed, answering each batch with its `orders`). It records every close, waits until it has a full 240-bar (4-hour) history, then buys the full cash balance the first time a close sits 200 bps below the highest close of the last 240 bars. While holding it sells everything the first time a close is 200 bps above its entry close, or 250 bps below it on a disaster stop. After a sell it can re-enter on a fresh 200 bps dip. Everything is integer (BigInt) arithmetic, so two runs on the same bars produce the same orders byte for byte. See STRATEGY.md for the full rationale and the walk-forward numbers.

Local check (dev window, 1,440 bars, grade-local with the kit's own grader): net PnL +$16.41 USDC after every fee, 1 round trip, max drawdown 0.64% — above the dev gate of $0, so it races. The same fixed rules made +$16.67 on the previous race's dev window (17–18 Nov), so the edge held on two independent 24-hour windows.

## Run it

```sh
node main.ts
```

The bot reads newline-delimited JSON on stdin (hello, then batches, then done) and writes one reply line per batch on stdout. See the kit's `protocol.schema.json` for the message shapes. It needs Node 22+ (type stripping for the `.ts` entrypoint) and nothing else — standard library plus the vendored `vendor/makefun-bars.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9qs5x4yn&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
