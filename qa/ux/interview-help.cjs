// Run against a loopback preview. All helper requests are intercepted before they can leave WebKit.
const assert=require("node:assert/strict");
const {readFile}=require("node:fs/promises");
const path=require("node:path");
const {webkit}=require(process.env.WFF_PLAYWRIGHT || "playwright");
const samples=require("./help-challenges.json");
const base=process.env.WFF_QA_URL || "http://127.0.0.1:4197";
assert.ok(["localhost","127.0.0.1","[::1]"].includes(new URL(base).hostname));

async function checkLocale(browser,lang,{guidance,helpMenu}) {
  const ctx=await browser.newContext({locale:lang,viewport:{width:390,height:844},reducedMotion:"reduce",serviceWorkers:"block"});
  const posts=[],errors=[],input=samples[lang];
  try {
    await ctx.route("https://get.geojs.io/**",r=>r.fulfill({json:{country_code:"CA",region:"Ontario"}}));
    await ctx.route("**/runtime.json",r=>r.fulfill({json:{release:"workbench",topicHelp:true}}));
    await ctx.route("**/api/topic",r=>{posts.push(r.request().postDataJSON());return r.fulfill({json:{mode:"local",topic:"privacy"}});});
    await ctx.addInitScript(code=>localStorage.setItem("wff-language",code),lang);
    const p=await ctx.newPage();
    p.setDefaultTimeout(8000);
    p.on("pageerror",e=>errors.push(e.message));
    const catalog=lang==="en"?null:JSON.parse(await readFile(path.join(__dirname,"../../public/locales",lang+".json"),"utf8"));
    const translated=source=>catalog?catalog[source]:source;
    await p.goto(base+"/");
    await p.waitForFunction(code=>document.documentElement.lang===code,lang);
    await p.locator("[data-start=start]").click();
    await p.locator("#country").selectOption("CA");await p.locator("#region").selectOption("ON");await p.locator("#use-place").click();
    const sameStep=p.locator('#conversation[data-stage="chat"][data-question="eligible"][data-part="0"]');
    await sameStep.waitFor();
    const replies=p.locator("#messages .assistant"),field=p.locator("#reply");
    for(const [key,subject] of Object.entries({witness:"beforeMethod",expenses:"expenses",tax:"tax",notaryCost:"cost",foreign:"international",unsupported:"unknown",uncertainty:null})){
      const before=await replies.count();
      await field.fill(input[key]);await field.press("Enter");
      await replies.nth(before).waitFor();
      assert.ok(await sameStep.isVisible(),lang+"/"+key);
      const bubble=replies.last().locator(".bubble");
      if(subject){
        assert.ok(translated(guidance[subject]),lang+"/"+subject);
        await bubble.getByText(translated(guidance[subject]),{exact:false}).or(bubble.filter({hasText:translated(guidance[subject])})).first().waitFor();
      }
      if(key==="unsupported"){
        const menu=bubble.locator(".help-topics");await menu.locator("summary").click();
        const buttons=menu.locator("button");
        assert.equal(await buttons.count(),helpMenu.length);
        for(let i=0;i<helpMenu.length;i++){
          const label=translated(helpMenu[i][1]);assert.equal(await buttons.nth(i).innerText(),label);
          await buttons.nth(i).click();
          assert.ok((await menu.locator('[aria-live="polite"]').innerText()).trim(),lang+"/"+label);
        }
        await menu.locator("summary").click();
      }
    }
    await field.fill(input.name);await p.locator("#browse-help").click();
    assert.equal(await field.inputValue(),input.name,lang);
    await field.fill(input.pressure);await field.press("Enter");
    await p.locator('#conversation[data-stage="helper"]').waitFor();
    assert.equal(await p.locator("#review .chat-recap .help-topics").count(),0);
    assert.deepEqual(posts,[],lang);assert.deepEqual(errors,[],lang);
  } finally {await ctx.close();}
}
(async()=>{
  const resources=await import("../../public/interview-help.js");
  const codes=process.argv.length>2?process.argv.slice(2):Object.keys(samples);
  const browser=await webkit.launch();
  try {
    for(const lang of codes)await checkLocale(browser,lang,resources);
    console.log(JSON.stringify({languages:codes.length,typed:8*codes.length,menuSelections:resources.helpMenu.length*codes.length,helperPosts:0}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
