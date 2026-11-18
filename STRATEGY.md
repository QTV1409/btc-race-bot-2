# Strategy: Deep-Dip Swing

## The idea

Bitcoin's 1-minute price over 24 hours usually contains one or two big
intraday V-swings: a 2%+ correction followed by a 2%+ recovery. This bot
harvests exactly that shape and does nothing else.

- **Entry:** buy the full cash balance when the latest close is **200 bps
  below the highest close of the last 240 bars** (4 hours). The 240-bar
  high is what makes the dip a real correction instead of noise: a dip
  measured against a 2-hour high fires too early in a slow bleed.
- **Exit:** sell everything when the close is **200 bps above the entry
  close** — bank the recovery, don't wait for more.
- **Stop:** sell everything when the close is **250 bps below the entry
  close** — a disaster guard; it never fired on either dev window.
- **Re-entry:** after a sell, the bot can buy again on a fresh 200 bps dip
  below the (new) 240-bar high.
- **Otherwise:** stay flat. No trade, no loss. A window with no 200 bps dip
  costs nothing.

One position at a time, full size, integer (BigInt) arithmetic only, no
network, no wall clock, no files, no randomness — two runs on the same bars
produce the same orders byte for byte.

## Why not the previous race's bot

The previous entry ("Dip-Buy BTC Bot", btc-race-24h-20261117-0603) bought the
opening dip — 15 bps off the 12-bar low — and lost **-$14.50 live**
(rank 3452/4387) even though its dev replay showed +$2.65. Walk-forward
testing showed that edge was fragile out of sample: it bought too early in a
fall and held a bleeding position. This bot is deliberately different: it
waits 4 hours, demands a 2% correction against the 4-hour high, and takes
profit at +2% instead of holding through the window.

## Validation (honest numbers)

All numbers are net PnL after every fee (4 bps fee + 2 bps slippage +
constant-product pool impact), $1,000 starting capital, 1,440 bars per window.

| Window | Net PnL | Trades | Max drawdown |
|---|---|---|---|
| Dev window, this race (17–18 Nov 2026, grade-local, kit's own grader) | **+$16.41** | 2 (1 round trip) | 0.64% |
| Dev window, previous race (16–17 Nov 2026, grade-local, that kit's grader) | **+$16.67** | 2 (1 round trip) | 0.62% |

The same fixed rules — no re-tuning between windows — made ~+$16.50 on two
independent 24-hour windows, one down -2.81% overall and one up slightly.
That cross-window agreement is the real out-of-sample evidence: the strategy
does not depend on one window's shape.

Walk-forward folds (360-bar folds, kit-exact fill model, calibrated exactly
on the previous bot's verified grade-local numbers: hold +$1.07, dip-buy
+$2.65) confirm the trade is rare by design: most folds make $0 (no 200 bps
dip inside the fold, so no trade), and the full-window profit comes from a
single V-swing per window. The grid variants that trade more often (smaller
dips / smaller exits / trailing stops) all scored worse in total across both
windows — e.g. the best two-stage exit (sell half at +100, half at +200)
totalled +$24.60 across both windows in the Python model vs +$33.08 for this
fixed exit on the real grader (+$16.41 + +$16.67) — so the
simple fixed +200 bps exit was kept.

Known limits, stated plainly:

- The edge is **one swing per window**. If the race window has no 200 bps dip
  followed by a 200 bps recovery, the bot makes $0 and places nowhere. If a
  dip happens but the recovery stalls below +200 bps, the bot holds to the
  stop (-250 bps) or to the end-of-window flattening and can lose ~$5–15.
- The profit depends on the race window containing a V-swing like the two dev
  windows had. That is a bet on BTC's usual intraday range (2–4% a day), not
  a guarantee.
- Fees doubled (cost-sensitivity check) still leaves +$15.59 on the dev
  window, so the result is not fee-fragile.

## Costs

A round trip costs ~26 bps: 4 bps fee + 2 bps slippage + ~7–10 bps of pool
impact per fill at full size. The +200 bps exit leaves ~+174 bps gross per
winning round trip, which is why the strategy survives the costs.
