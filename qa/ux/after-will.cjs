// Direct entry, native link navigation, retained interviews, local reading, and small screens.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const {webkit} = require(process.env.WFF_PLAYWRIGHT || "playwright");
const base = new URL(process.env.WFF_QA_URL || "http://127.0.0.1:4179").origin;
const first = "/why-do-i-need-a-will/", after = first + "after-the-will/";
const tabs = ".will-tabs";
const active = tabs + " a[aria-current=page]";

(async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
  const browser = await webkit.launch();
  try {
    const plain = await browser.newContext({javaScriptEnabled:false});
    const withoutJS = await plain.newPage();
    await withoutJS.goto(base + first + "#business");
    assert.equal(await withoutJS.locator(active).getAttribute("href"), first);
    await withoutJS.locator(tabs + " a").last().click();
    await withoutJS.waitForURL(base + after);
    assert.equal(await withoutJS.locator(active).getAttribute("href"), after);
    assert.equal(await withoutJS.locator("article:visible").count(), 6);
    assert.equal(await withoutJS.locator("link[rel=canonical]").getAttribute("href"), "https://willforfree.com" + after);
    await plain.close();

    const ctx = await browser.newContext({locale:"en", viewport:{width:1366,height:860}});
    const external = [], errors = [];
    await ctx.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.hostname === "get.geojs.io") return route.fulfill({json:{country_code:"CA",region:"unknown"}});
      if (url.origin === base) return route.continue();
      external.push(url.origin);
      return route.abort();
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(7000);
    page.on("pageerror", error => errors.push(error.message));
    // An incomplete location must not silently borrow another province's resources.
    await page.goto(base + after);
    await page.locator("[data-language-control] select").waitFor({state:"attached"});
    assert.match(await page.locator("[data-after-place]").innerText(), /Find guidance/);
    assert.equal(await page.locator(".after-sources a").count(), 0);
    await page.locator("[data-after-picker]").click();
    await page.locator("#place-dialog:modal").waitFor();
    await page.locator("#country").selectOption("CA");
    await page.locator("#region").selectOption("ON");
    await page.locator("#use-place").click();
    const draft = "A fictional unfinished opening";
    await page.locator("#opening").fill(draft);
    await page.setViewportSize({width:390,height:844});
    const menu = page.locator(".mobile-navigation");
    await menu.locator("summary").click();
    assert.deepEqual(await menu.locator("a:visible").allTextContents(), ["Education","Our Mission","Fine print","Contact"]);
    await menu.getByRole("link", {name:"Education"}).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(base + first);
    await page.setViewportSize({width:1366,height:860});
    assert.equal(await page.locator(active).getAttribute("href"), first);
    const next = page.locator(tabs + ' a[href="' + after + '"]');
    await next.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(base + after);
    await page.locator("[data-after-place]").filter({hasText:"Ontario"}).waitFor();
    assert.equal(await page.locator(active).getAttribute("href"), after);
    assert.ok(await page.locator(".after-guide h1").evaluate(h => h === document.activeElement));
    assert.match(await page.locator('meta[name=description]').getAttribute("content"), /powers of attorney/);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute("href"), "https://willforfree.com" + after);
    assert.match(await page.locator("[data-after-care-example]").innerText(), /personal care/);
    await page.goBack();
    await page.locator(active).filter({hasText:"Why do I need a will?"}).waitFor();
    await page.goForward();
    await page.locator("[data-after-place]").filter({hasText:"Ontario"}).waitFor();
    await page.locator(".after-contents summary").click();
    await page.locator('.after-contents a[href$="#trusts"]').click();
    await page.waitForURL(base + after + "#trusts");
    assert.ok(await page.locator("#trusts h3").evaluate(h => h === document.activeElement));
    await page.goBack();
    await page.locator("[data-after-place]").filter({hasText:"Ontario"}).waitFor();
    if (process.env.WFF_QA_OUTPUT) {
      const out = process.env.WFF_QA_OUTPUT;
      await fs.mkdir(out, {recursive:true});
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({path:path.join(out,"desktop.png")});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(out,"phone.png"),fullPage:true});
      await page.setViewportSize({width:1366,height:860});
    }
    await page.locator(".after-end a").click();
    await page.locator("#opening").waitFor();
    assert.equal(await page.locator("#opening").inputValue(), draft);
    assert.equal(await page.locator('link[rel=canonical]').count(), 0);
    assert.match(await page.locator('meta[name=description]').getAttribute("content"), /No card/);

    // Follow real visitor links while a question has a typed, unsent answer.
    await page.locator("#place-chip").click();
    await page.locator("#region").selectOption("QC");
    await page.locator("#use-place").click();
    await page.locator('[data-start=start]').click();
    await page.locator("#reply").waitFor();
    const question = await page.locator("#conversation").getAttribute("data-question");
    await page.locator("#reply").fill("An unfinished fictional answer");
    await page.locator(".mast a[href='/free-and-private/']:visible").first().click();
    await page.locator('[data-info-view] a[href="' + first + '"]').click();
    await page.locator(tabs + ' a[href="' + after + '"]').click();
    await page.locator("[data-after-place]").filter({hasText:"Quebec"}).waitFor();
    assert.ok(await page.locator("[data-after-picker]").isHidden());
    const select = page.locator("[data-language-control] select");
    await select.selectOption("fr");
    await page.locator('#care a[href*="/sante/"]').waitFor();
    assert.match(await page.locator("#money a").getAttribute("href"), /mandat-de-protection/);
    assert.match(await page.locator("[data-after-care-example]").innerText(), /directives médicales anticipées/);
    await page.locator(".after-end a").click();
    await page.locator("#reply").waitFor();
    assert.equal(await page.locator("#reply").inputValue(), "An unfinished fictional answer");
    assert.equal(await page.locator("#conversation").getAttribute("data-question"), question);
    assert.equal(await page.locator("html").getAttribute("lang"), "fr");

    await page.goto(base + after);
    await page.locator('#care a[href*="/sante/"]').waitFor();
    const {languages} = await import("../../public/locale.js");
    const englishFirstStep = "Talk with someone you trust about what matters to you, then ask your care team how to record it.";
    for (const code of Object.keys(languages)) {
      const locale = code === "en" ? {} : JSON.parse(await fs.readFile(path.join(__dirname,"../../public/locales",code + ".json")));
      await select.selectOption(code);
      await page.waitForFunction(lang => document.documentElement.lang === lang, code);
      assert.equal(await page.locator(active).innerText(), locale["After the will…"] || "After the will…");
      assert.equal(await page.locator("#care .after-step p").innerText(), locale[englishFirstStep] || englishFirstStep);
      assert.match(await page.locator("#care .after-sources a").getAttribute("href"), /quebec.ca/);
      for (const size of ["100%","200%"]) {
        await page.setViewportSize({width:320,height:700});
        const metrics = await page.evaluate(async fontSize => {
          document.documentElement.style.fontSize = fontSize;
          await document.fonts.ready;
          return [document.documentElement.scrollWidth, innerWidth,
            ...[...document.querySelectorAll(".will-tabs a")].map(a => a.getBoundingClientRect().height)];
        }, size);
        assert.ok(metrics[0] <= metrics[1] && metrics.slice(2).every(height => height >= 44), code + " " + size + " " + metrics);
      }
      await page.evaluate(() => document.documentElement.style.removeProperty("font-size"));
    }
    await select.selectOption("en");
    await page.waitForFunction(() => document.documentElement.lang === "en");
    const locations = await page.evaluate(async () => {
      const {markets,regions} = await import("/places.js");
      const {setHomeLocation} = await import("/home-location.js");
      const {setupLocationGuidance} = await import("/will-guide.js");
      let n = 0;
      for (const country of Object.keys(markets)) for (const region of Object.keys(regions[country] || {"":true})) {
        setHomeLocation({country,region});
        await setupLocationGuidance(document);
        if (!document.querySelector(".after-sources a") ||
            document.querySelector("[data-after-us-trust]").hidden !== (country !== "US") ||
            !document.querySelector("[data-after-place]").textContent.includes(regions[country]?.[region] || markets[country])) {
          throw Error(country + "-" + region);
        }
        n++;
      }
      return n;
    });
    assert.equal(locations, 97);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log("Passed both guide routes with and without JavaScript, location picker, history, metadata and draft retention, 97 rendered home selections, and 19 editions at 320px with normal and doubled text.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
