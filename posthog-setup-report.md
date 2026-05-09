<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into FashionFinder — a Telegram Mini App for AI-powered fashion search. PostHog is initialized in `src/main.tsx` with the `PostHogProvider` wrapping the entire app. Event tracking, user identification (via Telegram user ID), and exception capture are all wired into `src/App.tsx`. Environment variables are stored in `.env` and referenced via `import.meta.env`.

| Event name | Description | File |
|---|---|---|
| `image_uploaded` | User uploads a fashion photo for analysis (includes file size and type) | `src/App.tsx` |
| `analysis_started` | User clicks "Identify Objects" to trigger AI analysis | `src/App.tsx` |
| `analysis_completed` | AI analysis returned results successfully (includes item count) | `src/App.tsx` |
| `analysis_failed` | AI analysis threw an error (also captured as an exception via `captureException`) | `src/App.tsx` |
| `marketplace_link_clicked` | User clicks a marketplace search link (includes marketplace name, search query, item description) | `src/App.tsx` |
| `image_cleared` | User removes the uploaded image | `src/App.tsx` |
| `pro_upgrade_clicked` | User clicks the Upgrade / Pro button (includes whether they are already Pro) | `src/App.tsx` |
| `pro_activated` | Pro subscription is successfully activated | `src/App.tsx` |

User identification: Telegram users are identified with `posthog.identify()` using their Telegram user ID and display name when the app initialises.

## LLM analytics

Every call to the Gemini API in `src/services/geminiService.ts` is instrumented with a `$ai_generation` event using manual capture via `posthog-js`. This approach was chosen because the app runs entirely in the browser and the OpenTelemetry Node SDK is not applicable.

Each generation captures:

| Property | Value |
|---|---|
| `$ai_trace_id` | Per-call UUID generated with `crypto.randomUUID()` |
| `$ai_model` | The Gemini model name (`gemini-3-flash-preview`) |
| `$ai_provider` | `"google"` |
| `$ai_input` | System prompt + user text prompt (base64 image excluded) |
| `$ai_output_choices` | Raw JSON response text from Gemini |
| `$ai_input_tokens` | `response.usageMetadata.promptTokenCount` |
| `$ai_output_tokens` | `response.usageMetadata.candidatesTokenCount` |
| `$ai_latency` | Wall-clock time in seconds for the API call |
| `$ai_is_error` / `$ai_error` | Set on failures; error is re-thrown so existing `analysis_failed` handling still fires |

View generations and traces in PostHog under [LLM Analytics → Generations](/llm-analytics/generations).

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1564007)
- [Daily uploads & searches](/insights/QqOQ0r46) — line chart of image uploads and analysis requests over 30 days
- [Search-to-results conversion funnel](/insights/nEicN8eE) — funnel from upload → search started → results received
- [Marketplace clicks by marketplace](/insights/froCbDrF) — bar chart of outbound clicks broken down by Wildberries / Ozon / Lamoda / AliExpress
- [Pro upgrade conversion](/insights/rlhKadXF) — funnel from upgrade button click to Pro activation
- [Analysis success vs failure](/insights/VYW7LrHM) — daily trend comparing completed analyses to errors

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-vite/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
