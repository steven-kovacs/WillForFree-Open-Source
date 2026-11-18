// The preference belongs to this tab. No question, answer or topic is stored with it.
const preferenceKey = "wff-chat-ai";

export function setupChatAI() {
  const toggles = document.querySelectorAll('button[aria-controls="chat-ai-dialog"]');
  const dialog = document.getElementById("chat-ai-dialog");
  const confirm = document.getElementById("chat-ai-confirm");
  let opener;
  let permission = new AbortController();

  function syncHomeURL() {
    if (location.pathname !== "/") return;
    const url = new URL(location.href);
    if (permission.signal.aborted) {
      if (url.searchParams.get("ai") === "off" && history.state?.wffAiOffApplied) return;
      url.searchParams.set("ai", "off");
      // Distinguish a fresh opt-out link from an old history entry after re-enabling.
      history.replaceState({...history.state, wffAiOffApplied:true}, "", url);
    } else if (url.searchParams.get("ai") === "off") {
      url.searchParams.delete("ai");
      history.replaceState(history.state, "", url);
    }
  }
  function apply(enabled) {
    if (!enabled) permission.abort();
    else if (permission.signal.aborted) permission = new AbortController();
    for (const toggle of toggles) toggle.setAttribute("aria-checked", String(enabled));
    syncHomeURL();
  }
  function setEnabled(enabled) {
    try {
      sessionStorage.setItem(preferenceKey, enabled ? "on" : "off");
    } catch { /* The switch and the home URL still work without storage. */ }
    apply(enabled);
  }
  function restore() {
    const offLink = new URL(location.href).searchParams.get("ai") === "off";
    if (offLink && !history.state?.wffAiOffApplied) return setEnabled(false);
    let enabled = !offLink && !permission.signal.aborted;
    try {
      const saved = sessionStorage.getItem(preferenceKey);
      if (saved === "on" || saved === "off") enabled = saved === "on";
    } catch {}
    apply(enabled);
  }
  restore();
  window.addEventListener("pageshow", event => { if (event.persisted) restore(); });
  function openDialog(event) {
    opener = event.currentTarget;
    const turnOn = permission.signal.aborted;
    confirm.value = turnOn ? "on" : "off";
    confirm.textContent = turnOn ? "Turn On" : "Turn Off";
    dialog.showModal();
    dialog.scrollTop = 0;
    document.getElementById("chat-ai-title").focus({preventScroll:true});
  }
  for (const toggle of toggles) toggle.addEventListener("click", openDialog);
  dialog.addEventListener("submit", event => {
    if (event.submitter === confirm) setEnabled(confirm.value === "on");
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    if (opener?.isConnected && !opener.closest("[hidden]") && !document.querySelector("dialog[open]")) {
      opener.focus({preventScroll:true});
    }
    opener = null;
  });
  return {get signal() { return permission.signal; }, disable: () => setEnabled(false), syncHomeURL};
}
