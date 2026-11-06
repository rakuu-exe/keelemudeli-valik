# Price lists of 3.11.2026

Screenshots of the providers' official price lists on the day of the pilot run [M4]; the time is in the file name (HHMMSS, local time). The values are the ones in `config/pricing.json` (`priceListDate` 2026-11-03).

| file | provider | source |
|---|---|---|
| `openai_143406.png` | OpenAI (gpt-6.1-terra, gpt-6-luna) | https://developers.openai.com/api/docs/pricing |
| `anthropic_143433.png` | Anthropic (claude-sonnet-5-5) | https://platform.claude.com/docs/en/about-claude/pricing |
| `google_143451.png` | Google (gemini-3.8-flash) | https://ai.google.dev/gemini-api/docs/pricing |
| `deepseek_143518.png` | DeepSeek (deepseek-flash) | https://api-docs.deepseek.com/quick_start/pricing |
| `xai_143529.png` | xAI (grok-4.7) | https://docs.x.ai/docs/models |

The xAI screenshot shows the input and output prices; the cached input price (0.50) is on the model's detail page.

**Checked again on 7.11.2026, the day of the main run:** all five official price lists (the sources above) still show the values of `config/pricing.json`, including no temporary discount for gpt-6.1-terra. So `priceListDate` stays 2026-11-03 and no new screenshots were taken (author's decision 7.11.2026). The DeepSeek page now opens correctly with a final slash (`https://api-docs.deepseek.com/quick_start/pricing/`), and the Google page redirects to `https://aistudio.google.com/docs/pricing`.
