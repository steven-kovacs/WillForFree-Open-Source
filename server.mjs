import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHelpGuard } from "./lib/help-limits.mjs";
import { runtimeHelpGuard } from "./lib/help-runtime.mjs";
import { createTopicService } from "./lib/topic.mjs";
import { handleTopic } from "./lib/topic-http.mjs";
const pub = fileURLToPath(new URL("./public", import.meta.url));
const hosting = JSON.parse(
  await readFile(new URL("./firebase.json", import.meta.url), "utf8"),
).hosting;
const common = Object.fromEntries(
  hosting.headers[0].headers.map(({ key, value }) => [key, value]),
);
const informationPaths = new Set(["/why-do-i-need-a-will", "/why-do-i-need-a-will/after-the-will", "/our-mission", "/fine-print", "/free-and-private", "/open-source", "/partners", "/partners/brief", "/partners/ideas"]);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".sha256": "text/plain; charset=utf-8",
  ".json": "application/json",
};
export function makeServer({
  guard = createHelpGuard(),
  service = createTopicService({ key: process.env.OPENAI_API_KEY, reserveProvider:guard.provider }),
  partners = {},
  topicHelp = true,
  release = "workbench",
} = {}) {
  return http.createServer(async (req, res) => {
    const send = (
      status,
      body,
      type = "text/plain; charset=utf-8",
      extra = {},
    ) => {
      res.writeHead(status, {
        ...common,
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Type": type,
        "Cache-Control": "no-store",
        ...extra,
      });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    const notFound = async () => send(404, await readFile(path.join(pub, "404.html")), mime[".html"]);
    try {
      const host = req.headers.host || "";
      if (!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/i.test(host))
        return send(403, "Local preview only");
      const url = new URL(req.url, "http://" + host);
      if (["/partner-service.json","/sponsor-offers.json"].includes(url.pathname)) {
        if (!["GET","HEAD"].includes(req.method)) return send(405,"GET required");
        const value = url.pathname === "/partner-service.json" ? partners.config || {} : partners.offers || [];
        return send(200,JSON.stringify(value),"application/json");
      }
      if (url.pathname === "/api/topic") {
        return await handleTopic(req,res,send,{guard,service,origin:"http://"+host,
          address:req.socket.remoteAddress,secure:Boolean(req.socket.encrypted)});
      }
      if (!["GET", "HEAD"].includes(req.method))
        return send(405, "Method not allowed");
      if (url.pathname === "/runtime.json")
        return send(
          200,
          JSON.stringify({ topicHelp, release, partnerOffers:Boolean(partners.offers?.length) }),
          "application/json",
        );
      if (informationPaths.has(url.pathname)) {
        return send(308, "", "text/plain", {Location: url.pathname + "/" + url.search});
      }
      let file;
      try {
        file = decodeURIComponent(url.pathname).slice(1);
      } catch {
        return send(400, "Invalid path");
      }
      if (!file || file.endsWith("/")) file += "index.html";
      if (
        file
          .split("/")
          .some((s) => !s || s.startsWith(".") || s.includes("\\")) ||
        !mime[path.extname(file)]
      )
        return await notFound();
      let absolute;
      try {
        absolute = await realpath(path.join(pub, file));
        if (
          !absolute.startsWith((await realpath(pub)) + path.sep) ||
          !(await stat(absolute)).isFile()
        )
          return await notFound();
      } catch {
        return await notFound();
      }
      return send(200, await readFile(absolute), mime[path.extname(file)], {
        ...(file.startsWith("downloads/sponsors/") ? {"Content-Disposition":"attachment"} : {}),
        "Content-Security-Policy": (file === "partner-portal/index.html"
          ? common["Content-Security-Policy"].replace("https://get.geojs.io","https://identitytoolkit.googleapis.com")
          : common["Content-Security-Policy"]).replace("https://firestore.googleapis.com",
            [partners.config?.firestoreEmulator, ...(file === "partner-portal/index.html" ? [partners.config?.authEmulator] : [])]
              .filter(Boolean).map(host=>"http://"+host).concat("https://firestore.googleapis.com").join(" ")),
        "Cache-Control": /\.v2\.(woff2|ttf)$/.test(file)
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      });
    } catch {
      return send(500, "Request could not be completed.");
    }
  });
}
export function run({
  key = process.env.OPENAI_API_KEY,
  partners,
  report,
  port = Number(process.env.PORT || 4179),
} = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Invalid port");
  const guard=key ? runtimeHelpGuard({report}) : createHelpGuard();
  const server = makeServer({
    partners,guard,
    service: createTopicService({ key, reserveProvider:guard.provider }),
    topicHelp: Boolean(key),
    release: "workbench",
  });
  server.on("error", (e) => {
    console.error(
      e.code === "EADDRINUSE"
        ? "Local port is already in use."
        : "Could not start local preview.",
    );
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      "WillForFree: http://127.0.0.1:" +
        port +
        "/ (" +
        (key ? "AI topic help" : "local guided chat") +
        ")",
    ),
  );
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  run({partners:await (await import("./lib/partners/registry.mjs")).localReporting()});
