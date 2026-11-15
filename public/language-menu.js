import {languages, currentLanguage, savedLanguage, setLanguage, languagePreference, hasCopy, display} from "./locale.js";

// Copy transcript display nodes with their authored text so earlier turns follow a later language switch.
export function cloneOriginal(node) {
  if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(remember(node,node.data).source);
  const clone=node.cloneNode(false);
  for(const c of node.childNodes)clone.append(cloneOriginal(c));
  return clone;
}
const ignore = "script, style, svg, noscript, [data-verbatim], [data-language-control]";
const inline = new Set("SPAN A STRONG EM B I ABBR CODE TIME SMALL BR SVG IMG WBR".split(" "));
const leaf = new Set(["BR","SVG","IMG","WBR"]);
const group = "p,h1,h2,h3,h4,li,dt,dd,figcaption,summary,label,legend,button,a,small,strong,em,span,th,td,option,title";
const attributes = ["aria-label","aria-description","aria-valuetext","placeholder","alt","title","content","label"];
const originals = new WeakMap(), attrOriginals = new WeakMap(), structures = new WeakMap();
function remember(node, text) {
  const prior = originals.get(node);
  return prior?.last === text ? prior : {source:text,last:text};
}
function text(node) {
  const state=remember(node,node.data);
  const next=display(state.source);
  if(node.data!==next) node.data=next;
  state.last=next; originals.set(node,state);
}
function attrs(node) {
  const records=attrOriginals.get(node) || {};
  for (const name of attributes) {
    if(!node.hasAttribute(name) || (name==="content" && !node.matches('meta[name="description"]'))) continue;
    const current=node.getAttribute(name), prev=records[name];
    const source=prev?.last===current ? prev.source : current;
    const next=display(source);
    if(current!==next)node.setAttribute(name,next);
    records[name]={source,last:next};
  }
  attrOriginals.set(node,records);
}
function readStructure(node) {
  const elements=[];
  function content(el) {
    let out="";
    for(const child of el.childNodes) {
      if(child.nodeType===Node.TEXT_NODE){out+=remember(child,child.data).source;continue;}
      if(child.nodeType!==Node.ELEMENT_NODE)continue;
      const tag=child.tagName.toUpperCase();
      if(!inline.has(tag) || child.matches("[data-verbatim]"))throw 0;
      const i=elements.push(child)-1;
      out+=leaf.has(tag) || child.getAttribute("aria-hidden")==="true" ? "{"+i+"/}" : "{"+i+"+}"+content(child)+"{"+i+"-}";
    }
    return out;
  }
  try{const source=content(node);return {source,elements,rendered:null};}catch{return null;}
}
// Reorder the original inline elements so translated sentences keep working links and emphasis.
// Translations are plain text. Only the element references already in the source may be reused.
function rich(node) {
  if(!node.children.length || !node.matches(group))return false;
  let state=structures.get(node);
  if(state && state.rendered!==node.innerHTML) state=null;
  if(!state)state=readStructure(node);
  if(!state)return false;
  const key=state.source.replace(/\s+/gu," ").trim();
  if(!hasCopy(key) && !structures.has(node))return false;
  const out=hasCopy(key)?display(key):state.source;
  if(state.value===out && state.rendered===node.innerHTML)return true;
  const root=document.createDocumentFragment(), stack=[root], frames=[], used=new Set();
  let cursor=0;
  for(const match of out.matchAll(/\{(\d+)([+\-/])\}/g)) {
    stack.at(-1).append(out.slice(cursor,match.index));cursor=match.index+match[0].length;
    const n=Number(match[1]), code=match[2], el=state.elements[n];
    if(!el)return false;
    if(code==="-"){if(frames.pop()!==n)return false;stack.pop();continue;}
    if(used.has(n))return false;used.add(n);
    // Build in detached fragments and commit only after checking all nesting.
    const slot=document.createComment("wff:"+n);stack.at(-1).append(slot);
    if(code==="+"){frames.push(n);slot._wffContent=document.createDocumentFragment();stack.push(slot._wffContent);}
  }
  if(stack.length!==1 || used.size!==state.elements.length)return false;
  root.append(out.slice(cursor));
  function restore(parent) {
    for(const child of [...parent.childNodes]) {
      if(child.nodeType!==Node.COMMENT_NODE)continue;
      const el=state.elements[Number(child.data.slice(4))];
      if(child._wffContent){restore(child._wffContent);el.replaceChildren(child._wffContent);}
      attrs(el);child.replaceWith(el);
    }
  }
  restore(root);node.replaceChildren(root);state.value=out;state.rendered=node.innerHTML;structures.set(node,state);
  return true;
}
function walk(node) {
  if(node.nodeType===Node.TEXT_NODE){if(!node.parentElement?.closest(ignore))text(node);return;}
  if(node.nodeType!==Node.ELEMENT_NODE || node.closest(ignore))return;
  attrs(node);if(rich(node))return;
  for(const child of [...node.childNodes])walk(child);
}
let observer;
const watch=()=>observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
function updateAll(){
  observer?.disconnect();
  walk(document.head);walk(document.body);
  for(const menu of document.querySelectorAll("[data-language-control]"))paintMenu(menu);
  if(observer)watch();
}
function paintMenu(host){
  const select=host.querySelector("select");select.setAttribute("aria-label",display("Language"));
  const badge=host.querySelector("[data-code]"), code=currentLanguage()==="zh-Hans"?"中文":currentLanguage().toUpperCase();
  if(badge.textContent!==code)badge.textContent=code;
  select.title=display("Language")+" · "+languages[currentLanguage()];
  select.options[0].textContent=display("Automatic (browser language)")+" · "+languages[currentLanguage()];
  select.value=languagePreference();
}
function mount() {
  const nav=document.querySelector(".mast nav");
  if(!nav)return;
  const existing=nav.querySelector("[data-language-control]");
  if(existing){paintMenu(existing);return;}
  const host=document.createElement("label");host.className="language-control";host.dataset.languageControl="";
  host.innerHTML='<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4.2" ry="9"/><path d="M3 12h18"/></svg><span data-code></span><span aria-hidden="true" class="language-caret">▾</span>';
  const select=document.createElement("select");select.add(new Option("Automatic (browser language)",""));
  for(const [code,name] of Object.entries(languages)){const option=new Option(name,code);option.lang=code;select.add(option);}
  host.append(select);nav.append(host);paintMenu(host);
  const links = nav.querySelectorAll(':scope > :is(.mast-privacy, .fine-link, .contact-icon)');
  if (!links.length) return;
  const details=document.createElement("details");details.className="mobile-navigation";
  const summary=document.createElement("summary");summary.setAttribute("aria-label","Menu");summary.title="Menu";
  summary.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const list=document.createElement("div");list.className="mobile-navigation-links";
  for (const link of links) {
    const copy = link.cloneNode(false);
    copy.removeAttribute("class");
    copy.removeAttribute("id");
    if (link.matches(".contact-icon")) {
      copy.removeAttribute("aria-label");
      copy.textContent = "Contact";
    } else if (link.matches('.mast-privacy, [href="/"]')) {
      copy.className = "compact-nav-link";
      copy.textContent = link.matches(".mast-privacy") ? "Is this private?" : "Back to chat";
    } else {
      copy.textContent = "Fine print";
    }
    list.append(copy);
  }
  details.append(summary,list);nav.append(details);walk(details);
}
document.addEventListener("change",async event=>{
  const select=event.target.closest("[data-language-control] select");if(!select)return;
  try{await setLanguage(select.value);select.setCustomValidity("");}
  catch(error){select.value=languagePreference();select.setCustomValidity(display(error.message==="Wait for the download to finish." ? error.message : "This language could not be loaded. Please try again."));select.reportValidity();}
});
document.addEventListener("click",e=>{for(const item of document.querySelectorAll(".mobile-navigation[open]"))if(!item.querySelector("summary").contains(e.target))item.open=false;});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){const open=document.querySelector(".mobile-navigation[open]");if(open){open.open=false;open.querySelector("summary").focus();}}});
document.addEventListener("wff:language",updateAll);
mount();updateAll();
observer=new MutationObserver(records=>{
  observer.disconnect();
  const dirty=new Set();
  for(const r of records) {
    if(r.type==="attributes"){if(!r.target.closest(ignore))attrs(r.target);continue;}
    if(r.type==="characterData"){dirty.add(r.target.parentElement);continue;}
    if(r.target.nodeType===Node.ELEMENT_NODE && r.target.matches(group))dirty.add(r.target);
    else for(const node of r.addedNodes)dirty.add(node);
  }
  for(const node of dirty)if(node?.isConnected)walk(node);
  mount();watch();
});
watch();
await setLanguage(savedLanguage(),{remember:false}).catch(()=>{});
