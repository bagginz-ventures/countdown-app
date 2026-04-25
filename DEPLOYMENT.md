# Deployment Notes

## Goal

Deploy the Countdown App for free online so it can be opened from multiple phones and computers while still allowing **each device to keep its own countdown**.

## Recommended stack

### Phase 1
- **Hosting:** Cloudflare Pages
- **App type:** Static PWA
- **Persistence:** Browser local storage per device

### Phase 2
- **Backend:** Cloudflare Workers or Supabase Edge Functions
- **Database:** Cloudflare D1 or Supabase Postgres
- **Identity:** generated per-device ID stored locally
- **Retention target:** minimum 2 years

## Why not stop at local storage?

Because local storage is good for convenience, but not ideal as the only long-term retention mechanism if a browser profile is wiped, a phone is replaced, or storage is cleared.

## Practical deployment choices

### Option A, recommended
- Cloudflare Pages for hosting
- Cloudflare Worker for simple API
- Cloudflare D1 for persistence

Pros:
- low cost, likely free at this scale
- one ecosystem
- easy static + API pairing

### Option B
- Netlify + Supabase

Pros:
- friendly developer experience
- good hosted database story

## Suggested data model for cloud sync

```json
{
  "deviceId": "generated-stable-id",
  "label": "Family trip",
  "targetAt": "2027-06-01T12:00",
  "notes": "Optional notes",
  "updatedAt": "2026-04-25T13:00:00.000Z"
}
```

## Retention guidance

If 2-year persistence really matters, do all three:
- local storage on device
- hosted database storage
- export/import backup support

That gives redundancy instead of trusting one browser forever.
