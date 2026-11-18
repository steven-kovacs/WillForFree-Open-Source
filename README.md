# WillForFree

A free, browser-based will interview. The browser builds the PDFs and ZIP. An Ontario resident with a supported situation can complete the interview locally, print the will and follow the signing instructions. Other locations use their own forms and completion procedures.

All locations can record earlier wills, pet care, funeral arrangements and gifts to organizations. See the [regional coverage and research](docs/review/planning-choices-2026-11-16.md) for the difference between a gift in the will and a request recorded for professional review.

This repository contains the same files as the site's downloadable source edition. Verify them with `shasum -a 256 -c SHA256SUMS`.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci --ignore-scripts
npm run prepare:vendor
npm test
npm start
```

Open http://127.0.0.1:4179/. No account or AI key is needed for the will interview. To try the Partner Portal, stop the standalone server and run `npm run dev` with the Firebase CLI and Java 21+ installed. The local website and emulators start together. Sign in at http://127.0.0.1:4179/partner-portal/ using `partner@example.test` and `PreviewPartner42!`. The dashboard starts with three fictional campaigns and 128 sample downloads.

## Follow the data

Start with [the chat](public/app.js), [the decision rules](public/will.js) and [ZIP assembly](public/kit.js). Answers stay in the tab. Requests for blank templates identify the jurisdiction. Texas fetches all four court forms together, picks one in the browser, and makes no request for the selected variant alone. The browser can contact GeoJS for an approximate location and the server for [allowlisted help topics](lib/topic.mjs). Set an optional server-side OPENAI_API_KEY to enable remote topic selection. Typing a normal answer or choosing a suggested reply runs locally. Common help questions use prepared answers for the selected kit and language. An uncovered question opens local help. When someone asks which general topic to start with, the helper can choose from the supplied topic names. “Use without AI” keeps that choice local too. [Interview question coverage](docs/review/interview-help.md)

The default sponsor catalog is empty. The browser matches the optional offers locally. The [Firestore client](public/partner-api.js) confirms a sponsored ZIP with a single-use receipt after the download begins. The [database rules](ops/firestore.rules) scope authenticated reads to each organization and check atomic confirmations. See [partner operations](docs/partner-operations.md) for setup and measurement.

See [AI traffic limits](docs/ai-help.md) for the first-party cookie, network check, shared counters and local fallback. To send rate-limit alerts for your own deployment, set your logging project and recipient in [the included notifier](ops/help-alerts/Code.gs) and run its install function in a private Google Apps Script project with the supplied manifest.

The optional contact form uses an invisible Cloudflare Turnstile widget and a private mail queue. To enable the form on your copy, connect it to your own Worker, Firebase project and mail relay.

1. Choose a separate HTTPS origin for the contact Worker. Add that hostname to an invisible Turnstile widget. Set the public site key, allowed website origins, Firebase project, public API key and writer email in `ops/contact/wrangler.json`.
2. Create a Firebase password user with the UID `willforfree-contact-writer` and the configured email. Apply `ops/firestore.rules`. Deploy `ops/contact/worker.mjs` with Wrangler and set its encrypted `TURNSTILE_SECRET` and `WRITER_PASSWORD` bindings.
3. Set `service` in `public/contact-service.json` to the Worker origin and replace `https://contact.example.org` in both content security policies in `firebase.json`.
4. Set the project and recipient in `ops/contact/Code.gs`, install the private Apps Script with `ops/contact/appsscript.json` and run its install function. Update the direct email link and privacy notice for your service.

## Forms and software rights

The original code in this edition uses the [MIT License](LICENSE). [Third-party notices](NOTICE.md) identify the fonts, browser libraries and publisher forms. The distribution uses a plain text identity and omits the company's logos, campaign artwork and photographs.

The site includes 19 language choices. Translations are local files. The browser inserts the maker’s own words after it selects the document language. The four Texas English–Spanish originals have their own field map. California and Maine keep their publisher’s English form, with a signing guide in the selected language.

Seven project-authored fixed forms are included. The ten publisher PDFs for California, Texas and Maine are acquired separately. Follow [the source list and hashes](docs/forms.md). Where you have the applicable rights, run `node scripts/import-forms.mjs /path/to/originals` to install matching copies. The interview checks availability before using those forms. Ontario and the other independent templates run without this step.

## Verification and contributions

Run `npm test` and `npm run check:partners`. The optional emulator integration check at qa/ux/partner-portal.mjs signs in to disposable accounts and exercises the actual download with Playwright WebKit. With the local emulators running, set WFF_PLAYWRIGHT to an installed Playwright module and WFF_PYTHON to a Python interpreter with pypdf, then run `node qa/ux/partner-portal.mjs`. To propose a change, describe the user-visible behavior, the affected jurisdictions if relevant, and the checks you ran. Use fictional people and property in examples. See [security reporting](SECURITY.md) before submitting sensitive information.

This edition has a loopback release configuration. Its tests verify software behavior. Each person still needs to meet the requirements for their own circumstances and complete the local signing or appointment instructions.
