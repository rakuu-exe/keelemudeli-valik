# Provider dashboards of 6.11.2026 (before the main run)

Screenshots of the five providers' usage and spend pages, taken by the author before the main run [PK9]. The time is in the file name (HHMMSS, local time, GMT+2). Until then, only the probe requests (3.11.2026) and the pilot run (3.11.2026) had been made with the experiment keys, so these screenshots are the starting point: the spend of the main run (and of the Luna test) is a later screenshot minus this one.

| file | provider | dashboard shows | computed `costBilled`, probe + pilot | note |
|---|---|---|---|---|
| `openai_181824.png` | OpenAI | $0.07; 121 requests; 17,720 input tokens (last 7 days, project "Thesis") | $0.0732; 121 requests; 17,720 input tokens | the list price applies to gpt-6.1-terra (no temporary discount) |
| `anthropic_181833.png` | Anthropic | $0.19 spend this month | $0.1923 | |
| `google_181854.png` | Google | €0.33 monthly spend (spend cap €10) | $0.3762 | billed in euros; the cost chart had not loaded yet |
| `deepseek_181900.png` | DeepSeek | $0.03 total cost; balance $4.96 | $0.0377 | the dashboard seems to cut the decimals off; the usage details had not loaded yet; all requests at the off-peak price |
| `xai_181908.png` | xAI | $0.47; 225,963 tokens; "484 requests" (31.10–6.11) | $0.4694; 225,963 tokens; 121 requests | tokens match per type (reasoning 53.9K, cached 141.1K, prompt 27.7K, completion 3.4K); 484 = 4 × 121, probably counted per token type |

The computed values: `node src/cost/cost.js --run 2026-11-03-probe` and `--run pilot`. How the Google euros are converted in the billing check was open on 6.11.2026; on 7.11.2026 the author decided: the computed USD at the ECB rate of 6.11.2026 (1 EUR = 1.1165 USD), the same rate as the annual cost.

For the later screenshots, set every dashboard's date range to start on or before 3.11.2026, so that the probe and the pilot run stay inside it (OpenAI and xAI show the last 7 days by default, Google 28 days, DeepSeek 30 days; Anthropic's "spend this month" resets on 1.12).
