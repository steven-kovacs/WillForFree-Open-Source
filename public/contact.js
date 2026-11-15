import {display} from "./locale.js";
import {queueContact} from "./contact-api.js";

const template = document.createElement("template");
template.innerHTML = `<dialog class="contact-dialog" aria-labelledby="wff-contact-title">
  <div class="contact-top">
    <h2 id="wff-contact-title" tabindex="-1">Contact us<span aria-hidden="true">.</span></h2>
    <button type="button" class="contact-close" aria-label="Close contact form">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
    </button>
  </div>
  <div data-contact-entry>
    <div class="contact-switch" role="group" aria-label="Type of message">
      <button type="button" data-kind="support" aria-pressed="true">Support</button>
      <button type="button" data-kind="sponsor" aria-pressed="false">Sponsors</button>
    </div>
    <form class="contact-fields">
      <label for="wff-contact-email">Your email</label>
      <input id="wff-contact-email" name="email" type="email" autocomplete="email" maxlength="254" required>
      <div data-organization hidden>
        <label for="wff-contact-org">Organization</label>
        <input id="wff-contact-org" name="organization" autocomplete="organization" maxlength="120" disabled>
      </div>
      <label for="wff-contact-message">How can we help?</label>
      <textarea id="wff-contact-message" name="message" rows="4" maxlength="1800" aria-describedby="wff-contact-hint" required></textarea>
      <div class="contact-feedback">
        <p class="contact-hint" id="wff-contact-hint">Your will and chat stay private. Please leave personal will details out of your message.</p>
        <p class="contact-error" role="alert" hidden></p>
      </div>
      <div hidden aria-hidden="true"><label>Leave blank<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button type="submit" class="primary-btn contact-send">Send message <span aria-hidden="true">↗</span></button>
    </form>
    <span class="sr" role="status" data-contact-status></span>
  </div>
  <div data-contact-done hidden>
    <p role="status"></p>
    <button type="button" class="outline-btn contact-finish">Done</button>
  </div>
  <p class="contact-email">Email us directly at <a href="mailto:info@willforfree.com">info@willforfree.com</a>.</p>
</dialog>`;

function createContact() {
  const dialog = template.content.firstElementChild.cloneNode(true);
  document.body.append(dialog);
  const form = dialog.querySelector("form");
  const entry = dialog.querySelector("[data-contact-entry]");
  const done = dialog.querySelector("[data-contact-done]");
  const error = dialog.querySelector(".contact-error");
  const send = form.querySelector("[type=submit]");
  const close = dialog.querySelector(".contact-close");
  const email = form.elements.email;
  const message = form.elements.message;
  const org = form.elements.organization;
  const orgRow = dialog.querySelector("[data-organization]");
  const toggles = [...dialog.querySelectorAll("[data-kind]")];
  const label = message.labels[0];
  const hint = dialog.querySelector(".contact-hint");
  const drafts = {support: "", sponsor: ""};
  const attempts = new Map();
  let kind = "support";
  let submitting = false;
  let opener;
  let completedWhileClosed = false;

  function select(next) {
    drafts[kind] = message.value;
    kind = next;
    message.value = drafts[kind];
    message.setCustomValidity("");
    const sponsor = kind === "sponsor";
    orgRow.hidden = !sponsor;
    org.disabled = !sponsor;
    org.required = sponsor;
    for (const toggle of toggles) toggle.setAttribute("aria-pressed", String(toggle.dataset.kind === kind));
    label.textContent = sponsor ? "Who do you want to reach?" : "How can we help?";
    hint.textContent = sponsor ? "Tell us about your audience and whether you’re interested in a market sponsorship or a branded partner link." :
      "Your will and chat stay private. Please leave personal will details out of your message.";
    send.firstChild.textContent = sponsor ? "Send inquiry " : "Send message ";
    error.hidden = true;
  }

  function busy(value) {
    submitting = value;
    form.setAttribute("aria-busy", String(value));
    for (const button of [...toggles, send]) button.disabled = value;
    email.readOnly = message.readOnly = org.readOnly = value;
    dialog.querySelector("[data-contact-status]").textContent = value ? "Sending…" : "";
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    if (!message.value.trim()) {
      message.setCustomValidity(display("Write a message before sending."));
      message.reportValidity();
      return;
    }
    if (kind === "sponsor" && !org.value.trim()) {
      org.setCustomValidity(display("Enter your organization’s name."));
      org.reportValidity();
      return;
    }
    const data = {kind, email:email.value.trim(), organization:kind === "sponsor" ? org.value.trim() : "", message:message.value.trim()};
    const signature = JSON.stringify(data);
    let attempt = attempts.get(kind);
    if (attempt?.signature !== signature) {
      attempt = {signature, id:crypto.randomUUID()};
      attempts.set(kind, attempt);
    }
    error.hidden = true;
    busy(true);
    try {
      if (!form.elements.website.value) await queueContact(data, attempt.id, dialog);
      entry.hidden = true;
      done.hidden = false;
      completedWhileClosed = !dialog.open;
      done.querySelector("p").textContent = kind === "sponsor" ? "Your sponsor inquiry is on its way to our team." : "Your message is on its way to our team.";
      if (dialog.open) done.querySelector("button").focus({preventScroll:true});
      attempts.delete(kind);
      drafts[kind] = "";
      message.value = "";
      if (kind === "sponsor") org.value = "";
      email.value = "";
    } catch (failure) {
      error.textContent = failure.message === "invalid" ? "Please check your email and message, then try again."
        : "Couldn’t send. Try again or email us below.";
      error.hidden = false;
    } finally {
      busy(false);
    }
  }

  form.addEventListener("submit", submit);
  for (const field of [message, org]) field.addEventListener("input", () => field.setCustomValidity(""));
  for (const toggle of toggles) toggle.addEventListener("click", () => select(toggle.dataset.kind));
  close.addEventListener("click", () => dialog.close());
  done.querySelector("button").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { if (opener?.isConnected) opener.focus({preventScroll:true}); });
  return function open(trigger) {
    opener = trigger.closest(".mobile-navigation")?.querySelector("summary") || trigger;
    if (!submitting && !completedWhileClosed) {
      done.hidden = true;
      entry.hidden = false;
      select(trigger.dataset.contact === "sponsor" ? "sponsor" : "support");
    }
    completedWhileClosed = false;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("h2").focus({preventScroll:true});
  };
}

let openForm;
document.addEventListener("click", event => {
  const trigger = event.target.closest?.("a[data-contact]");
  if (!trigger || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      typeof HTMLDialogElement === "undefined") return;
  event.preventDefault();
  openForm ??= createContact();
  openForm(trigger);
});
