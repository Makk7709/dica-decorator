# Architecture rules

- Voice assistant uses OpenAI Realtime over WebRTC with an ephemeral token minted by the `realtime-session` edge function (secret `OPENAI_API_KEY`); why: the user explicitly chose live GPT voice, and the real key must never reach the browser.
- Voice decor recommendations go through the client-side `search_decors` tool over the cached catalog; why: the assistant must only cite real DICA references.
