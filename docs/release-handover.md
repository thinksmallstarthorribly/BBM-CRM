# Home of Engines — Release Handover

## Secure access

The application uses Manus authentication and its backend procedures enforce the configured owner account. The app is single-owner by design; other authenticated accounts are rejected by the API even if they have a generic administrative role.

## Psychic Cleaner Checklist

The production webhook is:

```text
https://YOUR-DEPLOYED-DOMAIN/api/integrations/checklist
```

Configure the existing Google Apps Script with the deployed URL and the same `BBM_CHECKLIST_WEBHOOK_SECRET` value stored in the project. The complete Apps Script functions, signing format, and hourly reconciliation setup are in [google-apps-script-checklist.md](./google-apps-script-checklist.md). Use the `externalId` scheme shown there so webhook retries remain idempotent.

## Google Places and Routes

**Local** and **Lead Finder** use the platform’s authenticated Google Maps and Places proxy. They do not require a browser-exposed Google API key. **Routes** uses the same integration for Google Directions. The first search or route preview needs an authenticated user session and a network connection.

## AI workflows

Morning briefings, lead scores, and follow-up suggestions use CRM data only. The Home dashboard can generate a briefing on demand or enable the daily **6:00 am Perth** schedule. When the AI service is unavailable, the application returns a deterministic CRM-grounded fallback rather than inventing information.

## Email activity

The CRM persists inbound and outbound follow-up records against leads and clients. It currently does **not** connect to a live Gmail inbox or send email. A future live-send integration needs dedicated provider credentials or an authorized Google Workspace connection; no credentials should be placed in the source repository.

## Release validation

| Check | Result |
|---|---|
| TypeScript | Passed |
| Vitest | Passed: 9 tests |
| Production build | Passed |
| Secure checklist secret | Passed: signed health request accepted; invalid signature rejected |
| Responsive UI | Reviewed at desktop and phone viewports |
| Persistent data | Database-backed; no CRM records in local storage |

## Post-release checklist

1. Open the published URL while signed in as Alex Cooper and confirm the owner dashboard loads.
2. Add the deployed webhook URL to the Psychic Cleaner Checklist Apps Script properties.
3. Submit one checklist test response, then verify it appears in **Checklist Responses** and **Lead Lifecycle**.
4. Run one **Local** Places search and one **Routes** preview to authorize and validate Maps access.
5. Generate a morning briefing manually, then enable the daily schedule only after confirming the output is useful.
