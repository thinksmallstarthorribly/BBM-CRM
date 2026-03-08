# Big Blue Mop Website Setup Chat Transcript
**Date:** March 08, 2026
**Context:** Troubleshooting www.bigbluemop.com.au (VentraIP domain + Netlify hosting + GitHub project)

## User: My website www.bigbluemop.com.au
**Perplexity:** Your domain bigbluemop.com.au doesn't appear to have an active public website loading yet (I can't reach any live pages for it right now). The domain may not be registered/connected to hosting, DNS isn't pointing correctly, or the site isn't published. Quick next steps: Check domain registration, verify DNS points to your host, confirm site is published in your platform. Share your setup (domain provider + host) for exact steps.

## User: Domain through ventra ip. Site hosted on netlify. Project on GitHub.
**Perplexity:** Your VentraIP domain needs DNS updated to point to Netlify (24-48hr propagation).

### Step 1: Connect GitHub to Netlify
Netlify → New site from Git → Authorize GitHub → Select repo → Deploy (gets `bigbluemop.netlify.app`).

### Step 2: Add Domain in Netlify
Site dashboard → Domain settings → Add custom domain `bigbluemop.com.au` → Verify (shows "Awaiting external DNS").

### Step 3: Update DNS in VentraIP
VentraIP → My Services → Domains → Manage bigbluemop.com.au → DNS/Nameservers → Advanced DNS.

| Host/Name | Type  | Value/Target             | TTL |
|-----------|-------|--------------------------|-----|
| @         | A     | 75.2.60.5                | Auto|
| www       | CNAME | your-site-name.netlify.app | Auto|

Keep VentraIP nameservers. Save.

### Step 4: Wait and Test
24-48 hours → Test both URLs. Netlify adds HTTPS automatically.
