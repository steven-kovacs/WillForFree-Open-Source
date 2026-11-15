import { chooseLocalTopic, safeTopic } from "../public/topic-contract.js";
export const MODEL = "gpt-6-luna";
// Only vocabulary from the public allowlist is accepted, never arbitrary user input.
export function createTopicService({
  key,
  fetcher = globalThis.fetch,
  cap = 24,
  reserveProvider,
  timeout = 3500,
} = {}) {
  const cache = new Map(),
    pending = new Map();
  let used = 0,
    windowStart = Date.now();
  return {
    stats: () => ({ calls: used, cacheEntries: cache.size }),
    async classify(payload) {
      const tags = safeTopic(payload);
      if (!tags) return null;
      const fallback = chooseLocalTopic(tags,payload.context);
      if (tags.length === 1) return { topic: fallback, mode: "local" };
      const cacheKey = (payload.context || "") + ":" + [...tags].sort().join("|");
      if (cache.has(cacheKey))
        return { topic: cache.get(cacheKey), mode: "cached" };
      if (!key) return { topic: fallback, mode: "local" };
      if (pending.has(cacheKey)) return pending.get(cacheKey);
      const job = (async () => {
        try {
          if (Date.now() - windowStart >= 3600000) { windowStart=Date.now(); used=0; }
          const permitted=reserveProvider ? await reserveProvider() : used<cap;
          if(!permitted)return {topic:fallback,mode:"local"};
          used++;
          const res = await fetcher("https://api.openai.com/v1/responses", {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(timeout),
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: MODEL,
              store: false,
              reasoning: { effort: "none" },
              max_output_tokens: 64,
              instructions:
                "Select the most useful single help topic from the supplied topic list for a local will kit. Consider the current kind of question when choosing among labels. Prefer a specific topic to generic process. Do not give advice. Return only the specified JSON.",
              input: payload.context ? "Current kind of question: "+payload.context+". Possible help topics: "+tags.join(", ") : tags.join(", "),
              text: {
                format: {
                  type: "json_schema",
                  name: "topic_choice",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: { topic: { type: "string", enum: tags } },
                    required: ["topic"],
                    additionalProperties: false,
                  },
                },
              },
            }),
          });
          if (!res.ok) return { topic: fallback, mode: "local" };
          const json = await res.json();
          const raw = json.output
            ?.flatMap((i) => i.content || [])
            .find((x) => x.type === "output_text")?.text;
          const topic = JSON.parse(raw || "null")?.topic;
          if (!tags.includes(topic)) return { topic: fallback, mode: "local" };
          cache.set(cacheKey, topic);
          return { topic, mode: "openai" };
        } catch {
          return { topic: fallback, mode: "local" };
        }
      })();
      pending.set(cacheKey, job);
      try {
        return await job;
      } finally {
        pending.delete(cacheKey);
      }
    },
  };
}
