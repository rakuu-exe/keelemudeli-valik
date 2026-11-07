# Provider dashboards of 7.11.2026 (after the main run and Luna)

Screenshots taken by the author at 11:41–11:50 local time (GMT+2; the time is in the file name, HHMMSS), after the main run (6.11 23:25 – 7.11 02:52 UTC) and the Luna test (7.11 09:37–09:39 UTC) [PK9]. Computed values: the sum of `costBilled` of `2026-11-03-probe`, `pilot`, `main` and `luna` (`results/cost/`). Anthropic, DeepSeek and xAI are final; OpenAI and Google are preliminary (their data had not all arrived); see `results/main/report.md` section 7.

| file | provider | dashboard shows | computed | note |
|---|---|---|---|---|
| `openai_114108.png` | OpenAI | $0.41; 729 requests; 106.9K input tokens (November 2026, project "Thesis") | $0.4117; 766 requests; 110,800 input tokens | taken too early: 721 Terra requests and only 8 of the 45 Luna requests had arrived (106,070 + ≈ 8 × 105 input tokens) → take again |
| `anthropic_114118.png` | Anthropic | $1.14 spend this month; credits $3.86 | $1.1448 | final |
| `google_114134.png` | Google | monthly spend cap €2.12 / €10.00; total cost 11.10–7.11 €1.14 | $2.3681 = €2.1210 at 1.1165 (ECB, 6.11.2026) | the spend cap counter matches; the cost report lags (main run bar on 6.11 PST only partly) → take again on 8.11 or later |
| `deepseek_114146.png` | DeepSeek | $0.18 total cost; 721 requests; 424,570 tokens (last 30 days); balance $4.81 | $0.1815; 721 requests; 424,570 tokens | final; requests and tokens match exactly |
| `xai_115019.png` | xAI | $2.70; 1,331,037 tokens; "2,882 requests" (1.11–7.11); reasoning 305.1K $1.83, cached prompt 843.3K $0.42, prompt 162.5K $0.33, completion 20.2K $0.12 | $2.6981; 1,331,037 tokens; reasoning 305,074, cached 843,264, prompt (not cached) 162,534, completion 20,165 | final; every token type matches. "2,882" counts the requests per token type: 721 + 719 + 721 + 721 (two requests read nothing from the cache: `main\|K1-007\|xai\|2`, `main\|K2-035\|xai\|3`), as on 6.11 (484 = 4 × 121) |

At 11:41 the xAI screenshot showed only the billing page (credit balance $2.34). It is not stored, because it shows the billing e-mail and the card number's last digits; the usage page above (11:50) replaces it. A second OpenAI screenshot at 11:49 still showed 729 requests, so the OpenAI dashboard is taken again later.
