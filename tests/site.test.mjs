import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  markets,
  regions,
  suggestion,
  validPlace,
  profile,
} from "../public/markets.js";
import { detectLocation } from "../public/geo.js";
import { questions, readAnswer, validateState } from "../public/will.js";
import { sections, signing } from "../public/document.js";
import { topicsFor, questionWhileAnswering } from "../public/flow.js";
import { fixture } from "./fixtures.mjs";
import { createTopicService } from "../lib/topic.mjs";
import { makeServer } from "../server.mjs";
const place = (country, region = "") => ({ country, region });
const on = place("CA", "ON"),
  ca = place("US", "CA"),
  tx = place("US", "TX");
test("all supported markets and each requested subdivision have a named authority and an explicit route", () => {
  assert.equal(Object.keys(markets).length, 25);
  assert.deepEqual(
    Object.values(regions).map((o) => Object.keys(o).length),
    [13, 51, 4, 8],
  );
  const counts = {};
  for (const country of Object.keys(markets))
    for (const region of Object.keys(regions[country] || { "": 0 })) {
      const p = profile(place(country, region));
      assert.match(p.legalSource, /^https:\/\//);
      counts[p.route] = (counts[p.route] || 0) + 1;
      if (p.route !== "professional")
        assert.deepEqual(
          validateState(fixture(place(country, region)), true).place,
          place(country, region),
        );
    }
  assert.deepEqual(counts, {
    paper: 75,
    fixed: 7,
    official: 2,
    handwriting: 10,
    deposit: 3,
  });
  assert.equal(validPlace(place("US", "XX")), false);
});
test("IP suggestions are approximate, cannot invent a region, and only return coarse data", async () => {
  assert.deepEqual(suggestion("CA", "Québec"), place("CA", "QC"));
  assert.deepEqual(suggestion("CA", "Nouveau-Brunswick"), place("CA", "NB"));
  assert.deepEqual(suggestion("UK", "Cymru"), place("GB", "WLS"));
  assert.deepEqual(suggestion("US", "US-DC"), place("US", "DC"));
  assert.deepEqual(suggestion("GB", "London"), place("GB"));
  assert.equal(validPlace(suggestion("GB", "London")), false);
  assert.equal(suggestion("XX", "CA"), null);
  const result = await detectLocation(async (u, options) => {
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    return {
      ok: true,
      json: async () => ({
        country_code: "CA",
        region: "Ontario",
        latitude: "44",
        ip: "example",
      }),
    };
  });
  assert.deepEqual(result, on);
  assert.equal(
    await detectLocation(async () => {
      throw Error("unavailable");
    }),
    null,
  );
  assert.equal(
    await detectLocation(
      async (_, opts) =>
        new Promise((_, reject) =>
          opts.signal.addEventListener("abort", () => reject(Error())),
        ),
      3,
    ),
    null,
  );
});
test("saved progress is portable, ordered and cannot revive another family branch or excluded case", () => {
  const full = fixture(on, { household: "Partner, then children" });
  const partial = {
    ...full,
    answers: Object.fromEntries(Object.entries(full.answers).slice(0, 5)),
  };
  assert.deepEqual(validateState(partial), partial);
  assert.throws(() => validateState(partial, true));
  assert.throws(() => validateState({ ...full, place: place("NL") }, true));
  for (const patch of [
    { eligible: "No or unsure" },
    { maker: "password: hello" },
    { extra: "secret" },
    { children: "not-a-list" },
    { maker: full.answers.partner },
    { children: [full.answers.partner] },
    { household: "One adult beneficiary" },
  ])
    assert.throws(() =>
      validateState({ ...full, answers: { ...full.answers, ...patch } }, true),
    );
  assert.throws(() => validateState({ ...partial, version: 8 }));
  assert.throws(() => validateState({ ...partial, place: place("XX") }));
});
test("Ontario family instrument disposes of the complete residue, protects younger heirs, and has independent roles", () => {
  const a = fixture(on, { household: "Partner, then children" }).answers;
  const txt = sections(profile(on), a).flat().join(" ");
  for (const s of [
    "revoke",
    "Alex Morgan",
    "Avery Morgan",
    "Quinn Morgan",
    "subsequently becomes my legal child",
    "by representation",
    "until age 18",
    "River Lin",
    "Robin Taylor",
    "Morgan Chen",
    "applicable law of intestacy",
  ])
    assert.ok(txt.includes(s), s);
  assert.ok(signing(profile(on)).join(" ").includes("90 days"));
  assert.equal(
    readAnswer({ id: "backup", kind: "name" }, a.partner, a).value,
    undefined,
  );
  assert.ok(
    readAnswer({ id: "care", kind: "name" }, "I am being forced", {}).stop,
  );
});
test("official forms and their choices do not borrow another jurisdiction’s execution procedure", () => {
  const cases = [
    "Married, spouse living",
    "Single, widowed or divorced",
  ].flatMap((marriage) =>
    ["No children or grandchildren", "I have children or grandchildren"].map(
      (descendants) => fixture(tx, { marriage, descendants }),
    ),
  );
  assert.equal(cases.filter((s) => s.answers.spouse).length, 2);
  assert.equal(cases.filter((s) => s.answers.formChildren).length, 2);
  assert.equal(cases.filter((s) => s.answers.recipient).length, 1);
  let s = fixture(ca, { caBalance: "4 · Two to four named people" });
  assert.equal(s.answers.multiple.length, 2);
  assert.throws(() =>
    validateState({ ...s, answers: { ...s.answers, multiple: ["Someone"] } }),
  );
  for (const [p, word] of [
    [place("DE"), "handwritten"],
    [place("US", "LA"), "handwritten"],
    [place("GB", "SCT"), "each sheet"],
    [place("CA", "QC"), "every page"],
    [place("EE"), "six months"],
    [place("US", "TX"), "notary"],
  ])
    assert.match(signing(profile(p)).join(" ").toLowerCase(), new RegExp(word));
});
test("the classifier receives only allowed vocabulary and ambiguity is bounded", async () => {
  let sent = 0;
  const service = createTopicService({
    key: "test-only",
    cap: 1,
    fetcher: async (u, opts) => {
      sent++;
      const body = JSON.parse(opts.body);
      assert.equal(body.store, false);
      assert.equal(body.model, "gpt-6-luna");
      assert.deepEqual(body.reasoning, {effort:"none"});
      assert.deepEqual(
        new Set(body.input.split(", ")),
        new Set(["price", "executor"]),
      );
      return {
        ok: true,
        json: async () => ({
          output: [
            {
              content: [{ type: "output_text", text: '{"topic":"executor"}' }],
            },
          ],
        }),
      };
    },
  });
  assert.equal(
    await service.classify({ topics: ["price"], maker: "Renée Morgan" }),
    null,
  );
  assert.equal(await service.classify({ topics: ["Renée Morgan"] }), null);
  assert.equal(
    (await service.classify({ topics: ["executor", "price"] })).mode,
    "openai",
  );
  assert.equal(
    (await service.classify({ topics: ["price", "executor"] })).mode,
    "cached",
  );
  assert.equal(
    (await service.classify({ topics: ["price", "asset"] })).mode,
    "local",
  );
  assert.equal(sent, 1);
  assert.ok(topicsFor("how much does it cost to sign?").includes("signing"));
});
test("HTTP serves all kit assets, rejects private bodies, and public Hosting has no default project or cloud key", async () => {
  const server = makeServer();
  await new Promise((resolve, reject) =>
    server.once("error", reject).listen(0, "127.0.0.1", resolve),
  );
  try {
    const domain = "http://127.0.0.1:" + server.address().port;
    assert.equal(
      (await (await fetch(domain + "/runtime.json")).json()).release,
      "workbench",
    );
    for (const file of [
      "/",
      "/fine-print/",
      "/markets.js",
      "/forms/basic/NC.pdf",
      "/fonts/wff-pdf-regular.v2.ttf",
      "/vendor/fflate-0.8.3.min.js",
    ]) {
      const res = await fetch(domain + file, { method: "HEAD" });
      assert.equal(res.status, 200, file);
      assert.match(res.headers.get("Content-Security-Policy"), /get.geojs.io/);
    }
    for (const route of ["/why-do-i-need-a-will", "/why-do-i-need-a-will/after-the-will", "/our-mission", "/free-and-private", "/partners", "/partners/brief", "/partners/ideas"]) {
      const address = await fetch(domain + route + "?view=example", {redirect:"manual"});
      assert.equal(address.status, 308);
      assert.equal(address.headers.get("location"), route + "/?view=example");
      const page = await fetch(domain + route + "/");
      assert.equal(page.status, 200);
      assert.match(await page.text(), /data-info-page/);
    }
    const post = (body, ext = {}) =>
      fetch(domain + "/api/topic", {
        method: "POST",
        headers: { "content-type": "application/json", ...ext },
        body: JSON.stringify(body),
      });
    assert.equal((await post({ topics: ["price"] })).status, 200);
    assert.equal((await post({ topics: ["Renée Morgan"] })).status, 400);
    assert.equal(
      (
        await post(
          { topics: ["price"] },
          { origin: "https://elsewhere.invalid" },
        )
      ).status,
      403,
    );
    for (const f of ["/server.mjs", "/.env", "/qa/current/home-webkit.png"])
      assert.equal((await fetch(domain + f)).status, 404);
    const config = JSON.parse(
      await readFile(new URL("../firebase.json", import.meta.url)),
    );
    assert.equal(config.hosting.target, "willforfree");
    assert.equal(config.hosting.public, "public");
    assert.equal(config.hosting.site, undefined);
    const flags = JSON.parse(
      await readFile(new URL("../public/runtime.json", import.meta.url)),
    );
    assert.deepEqual(flags, { topicHelp: false, release: "closed" });
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("legal names are not interpreted as chat instructions and suffix punctuation is preserved", () => {
  const q = { id: "maker", kind: "name" };
  for (const raw of ["Can Yılmaz", "John Smith Jr.", "Anne-Marie O’Reilly"]) {
    assert.equal(questionWhileAnswering(raw, q.kind), false);
    assert.equal(readAnswer(q, raw).value, raw);
  }
  assert.equal(
    questionWhileAnswering("Can I choose another executor", q.kind),
    true,
  );
  assert.equal(readAnswer(q, "王明").value, "王明");
  assert.equal(readAnswer(q,"𓀀王").stop,true);
});
