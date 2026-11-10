# Provider dashboards of 10.11.2026 (OpenAI and Google, final)

Screenshots taken by the author at 22:59 local time (GMT+2; the time is in the file name, HHMMSS) [PK9]. They replace the preliminary OpenAI and Google screenshots of 7.11.2026, whose data had not all arrived (`results/billing/2026-11-07/`). Computed values: the sum of `costBilled` of `2026-11-03-probe`, `pilot`, `main` and `luna` (`results/cost/`); input tokens and requests from `results/raw/`.

| file | provider | dashboard shows | computed | difference | note |
|---|---|---|---|---|---|
| `openai_225950.png` | OpenAI | $0.41; 766 requests; 110,800 tokens = 110.8K input tokens (23.10–10.11.2026, project "Thesis") | $0.4117; 766 requests (721 Terra + 45 Luna); 110,800 input tokens | 0.4% | final; requests and input tokens match exactly |
| `google_225958.png` | Google | total cost 14.10–10.11.2026 €2.13; monthly spend cap €2.12 / €10.00 (project "Thesis Test") | $2.3681 = €2.1210 at 1.1165 (ECB, 6.11.2026) | 0.4% (cost report); 0.05% (spend cap) | final; the cost report has caught up (it showed €1.14 on 7.11) |

The difference = |computed − dashboard| / dashboard × 100% (`docs/usability_criterion.md`, condition 4). For Google (author's decision 10.11.2026) the cost report ("Your Total Cost" for a date range from 14.10.2026, so the probe requests of 3.11 are inside it) is the dashboard value, because it is the billed cost; the spend cap counter is shown for comparison. The two differ by one cent, probably because Google converts at its own rate.

The account identity is covered with grey boxes in these screenshots (11.11.2026, before the repository becomes public): the author's name, e-mail address and profile picture, the Google project ID and the xAI team ID in the address bar, and the xAI team name. The sums, the numbers of requests and tokens, the dates and the clock are unchanged.
