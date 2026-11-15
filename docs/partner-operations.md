# Partner reporting on Firebase Spark

The public site calls a paying organization a sponsor. The business dashboard is the Partner Portal. The checked-in sponsor catalog is empty. With no placement the visitor downloads the ZIP immediately. There is no sponsor file, offer request or reporting event.

## How a campaign works

The browser matches its confirmed country and region against the static offer catalog, using inclusive UTC dates. A regional match takes precedence over a national one. If the visitor downloads a sponsored kit, it contains a separate `Sponsor-offer.pdf`. After starting the ZIP, the browser sends the campaign ID and one random receipt to the Firestore REST API. No advertising script runs in the interview.

Firestore accepts one atomic commit per receipt. Its rules require an operator-enabled campaign, an open time window, a fresh receipt, and the existing counter to increase by exactly one within the campaign cap. The service stores no names, will answers or visitor location fields. A regional campaign ID identifies its coverage area. Receipts and internal cursors are inaccessible to clients. Downloads still work when reporting is unavailable.

The dashboard counts acknowledged browser download starts. Repeated submission of a receipt counts once. Download claims can be automated, people can make another kit, and network or quota failures can cause undercounts. Use these totals as campaign estimates. They cannot establish signatures, unique people or billable conversions.

## Local test account

Run `npm run dev` with the Firebase CLI, Node 22+ and Java 21+. The main site and portal share port 4179. Open the [local Partner Portal](http://127.0.0.1:4179/partner-portal/) and use `partner@example.test` / `PreviewPartner42!`. The dashboard shows three fictional campaigns and 128 example downloads. The local consumer ZIP has no sponsor, and the example campaigns do not accept receipts. Plain `npm start` works without the emulators or an AI key.

## Connect an operator and a new business

Set `WFF_PARTNER_PROJECT` to the dedicated Firebase web app's project ID. For a self-hosted copy, configure `public/partner-service.json` with that project's `projectId` and its public Firebase Web SDK `apiKey`. For development use a demo project ID and both loopback emulator hosts. Operator commands require a Firebase administrator with Application Default Credentials scoped to the same project. No administrator credentials belong in the browser.

The portal signs in through Firebase email/password. The ID token stays in tab memory and expires after about an hour. Firestore rules permit exact document reads for the signed-in user's active membership, that organization's campaign list and its own totals. Clients cannot list organizations or change memberships or reporting configuration. Remove membership when offboarding, then disable the Firebase login if appropriate. A new grant or reassignment requires a fresh password sign-in after the grant time.

Provision a business only after it joins. Set up its Firebase email/password login using the administrator console. For an existing Firebase UID:

```sh
node scripts/partner-member.mjs grant FIREBASE_UID example-coop "Example Cooperative"
node scripts/partner-member.mjs revoke FIREBASE_UID
```

A new organization can sign in before its first campaign and see zero downloads. Signing up from the public client is disabled.

## Operate a placement

Set the dates, agreed geography, budget and a download ceiling with the organization. The ceiling limits accepted confirmations and is independent of the sponsorship fee. Observe the project's daily Firestore limits, including three document writes per acknowledgment and reads used by the rules. The Spark plan stops accepting requests when a quota is exhausted. [Firestore quotas](https://firebase.google.com/docs/firestore/quotas)

For an approved placement, put its details in the private `config/partner-campaigns.json`. For example:

```json
[{
  "id":"sample-ontario","partner":"sample-coop","kind":"paid","name":"Example Cooperative",
  "areas":["CA-ON"],"start":"2027-01-01","end":"2027-01-31","maxDownloads":1000,
  "title":"Come to a free workshop","message":"Find a session near you.","url":"https://example.org/workshops"
}]
```

Run `node scripts/partner-campaigns.mjs apply` to prepare campaign windows, counts, dashboard rows and the sanitized static catalog. The operator applies the complete campaign list in one Firestore transaction. Removing an ID closes its counting window immediately and retains its historical report. Dates, area and owner are immutable for an existing ID. Run `npm run check:partners` to verify the catalog. On the next authorized website release, set `partnerOffers: true` in the static runtime only when there are offers to show. Disable that flag when the catalog empties.

Thirty days after a campaign's original end date, run `node scripts/partner-campaigns.mjs prune CAMPAIGN_ID`. It deletes up to 1,000 receipt markers per invocation. Repeat until it returns zero, within the project's daily delete quota. This is manual cleanup on Spark. The campaign total survives. A campaign ID belongs to a single period and must never be reused.

## Rules and publication

Deploy only the database rules with the dedicated project selected and `--only firestore:rules`. Static Hosting has a separate production target and release decision. The two client APIs are Firebase Authentication and Firestore. Setup requires no Cloud Run service, billing account, signing secret, or automatic TTL. First-party browser assets and the free-plan REST APIs are sufficient. [Firestore REST authentication](https://firebase.google.com/docs/firestore/use-rest-api)
