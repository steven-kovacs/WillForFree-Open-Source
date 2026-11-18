// The original disclosure text remains readable when JavaScript is unavailable.
export function setupConnectionInfo(root) {
  const section = root.querySelector("[data-connection-info]");
  if (!section) return;
  const dialog = section.querySelector("dialog");
  const title = dialog.querySelector("h3");
  const content = dialog.querySelector("[data-dialog-copy]");
  const close = dialog.querySelector("button");
  let opener;
  for (const details of section.querySelectorAll("details")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "connection-trigger with-arrow";
    button.textContent = details.querySelector("summary").textContent;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", dialog.id);
    button.addEventListener("click", () => {
      opener = button;
      title.textContent = button.textContent;
      content.replaceChildren(...[...details.children].slice(1).map(node => node.cloneNode(true)));
      dialog.showModal();
      title.focus({preventScroll:true});
    });
    details.replaceWith(button);
  }
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => opener?.focus({preventScroll:true}));
}

if (document.querySelector("main[data-info-page] [data-connection-info]")) setupConnectionInfo(document);
