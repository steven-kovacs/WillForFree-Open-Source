// Shared by the browser and the private topic service. The request can contain only these labels.
export const allowedTopics = ["notes","process","executor","children","signing","privacy","price","province","asset"];
export const helpContexts = ["choice","gift","people","signing","notes","location","opening"];
export function safeTopic(body) {
  if (
    !body ||
    !Array.isArray(body.topics) ||
    body.topics.length < 1 ||
    body.topics.length > allowedTopics.length ||
    body.topics.some((t) => !allowedTopics.includes(t)) ||
    Object.keys(body).some((k) => !["topics","context"].includes(k)) ||
    (Object.hasOwn(body,"context") && !helpContexts.includes(body.context))
  )
    return null;
  return [...new Set(body.topics)];
}
export function firstTopic(tokens) {
  return (
    [
      "privacy",
      "children",
      "executor",
      "signing",
      "price",
      "province",
      "asset",
      "notes",
      "process",
    ].find((k) => tokens.includes(k)) ?? "general"
  );
}
export function chooseLocalTopic(tags,area) {
  const preferred=({gift:"asset",people:"executor",signing:"signing",location:"province",notes:"notes"})[area];
  return tags.includes(preferred) ? preferred : firstTopic(tags);
}
