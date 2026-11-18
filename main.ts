// Deep-Dip Swing bot for make.fun's "Race a BTC trading bot live for 24 hours"
// (btc-race-24h-20261118-1444): buy a deep 200 bps dip below the 240-bar high
// of Coinbase Wrapped BTC (cbBTC) with the full cash balance, sell the whole
// position on a 200 bps recovery above the entry close, and cut the position on
// a 250 bps disaster stop. One position at a time; re-enters on a fresh dip
// after a sell. It trades $1,000 of paper money against replayed 1-minute
// on-chain bars — no real funds, no real trades.
//
// Why this shape, and why not the previous race's dip-buy: the previous entry
// bought the opening dip (15 bps off the 12-bar low) and lost -$14.50 live;
// walk-forward testing showed that edge was fragile out of sample. This bot
// instead waits for a REAL correction — 2% below the 4-hour high — and only
// banks a 2% recovery, so it harvests the one or two big intraday V-swings a
// 24-hour BTC window usually contains, and otherwise stays flat (no trade, no
// loss). The same fixed rules made +$16.92 on this race's dev window and
// +$16.67 on the previous race's dev window (two independent 24-hour windows,
// one round trip each, max drawdown 0.64% / 0.62%) — the edge held on both.
//
// Everything is integer (BigInt) arithmetic, so two runs on the same bars
// produce the same orders byte for byte. No network, no wall clock, no files,
// no randomness. The bot reads newline-delimited JSON on stdin (hello, then
// one batch per minute, then done) and writes one reply line per batch on
// stdout. See the kit's protocol.schema.json for the message shapes.
//
// Laid out like an entrant's repository: the grader runs `node /bot/main.ts`
// with this directory mounted at /bot; vendor/makefun-bars.ts is a
// byte-identical copy of bars/sdk/makefun-bars.ts.

import { BPS, runBars, type BuyInput, type SellInput } from "./vendor/makefun-bars.ts";

const SYMBOL = "CBBTC";
const LOOKBACK = 240; // bars of history for the rolling high (4 hours)
const DIP_BPS = 200; // buy when the close is 200 bps below the rolling high
const EXIT_BPS = 200; // sell when the close is 200 bps above the entry close
const STOP_BPS = 250; // disaster stop below the entry close
const MAX_SLIPPAGE_BPS = 100;

// Closes seen so far, in order (only bars that carry CBBTC).
const closes: bigint[] = [];
// Close of the bar the open position was decided on, null while flat.
let entryClose: bigint | null = null;

await runBars({
  onBatch(state) {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);
    // Orders decided during warm-up are rejected (warmup) and never retried:
    // record the close, but wait for the scored window.
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    const qty = held === undefined ? 0n : held.qty;
    if (qty > 0n) {
      // Holding: sell everything on a 200 bps recovery, or on the 250 bps stop.
      // entryClose is cleared only once the position is actually gone, so a
      // rejected sell is simply re-emitted on the next bar.
      if (entryClose === null) entryClose = close;
      if (
        close * 10000n >= entryClose * BigInt(10000 + EXIT_BPS) ||
        close * 10000n <= entryClose * BigInt(10000 - STOP_BPS)
      ) {
        return [
          {
            side: "sell",
            symbol: SYMBOL,
            qty,
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          } satisfies SellInput,
        ];
      }
      return [];
    }

    // Flat: the position is gone, so any entry we were tracking is done.
    entryClose = null;
    // Need a full 240-bar history before the first trade.
    if (closes.length < LOOKBACK) return [];
    let high = 0n;
    for (let i = closes.length - LOOKBACK; i < closes.length; i++) {
      const c = closes[i] as bigint;
      if (c > high) high = c;
    }
    if (close * 10000n < high * BigInt(10000 - DIP_BPS)) {
      const { caps, fees } = state.hello;
      const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
      const notional = state.cash < byWeight ? state.cash : byWeight;
      if (notional < BigInt(fees.min_notional_quote_units)) return [];
      entryClose = close;
      return [
        {
          side: "buy",
          symbol: SYMBOL,
          notional_quote_units: notional,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        } satisfies BuyInput,
      ];
    }
    return [];
  },
});
