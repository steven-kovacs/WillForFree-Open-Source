import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { text } from "node:stream/consumers";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = fileURLToPath(new URL("../", import.meta.url));
const project = "demo-willforfree";
const withCloudHelp = process.argv.includes("--cloud-help");

async function startEmulators() {
  const env = { ...process.env };
  // The CLI logs its child environment. Carry an existing AI key through stdin instead.
  const configuredKey = env.OPENAI_API_KEY;
  delete env.OPENAI_API_KEY;
  delete env.GOOGLE_APPLICATION_CREDENTIALS;
  delete env.WFF_PARTNER_TICKET_SECRET;
  delete env.WFF_HELP_SIGNING_SECRET;
  delete env.WFF_HELP_PROJECT;
  if (process.platform === "darwin") {
    const java = spawnSync("/usr/libexec/java_home", ["-v", "21+"], { encoding: "utf8" });
    if (java.status === 0) {
      env.JAVA_HOME = java.stdout.trim();
      env.PATH = path.join(env.JAVA_HOME, "bin") + path.delimiter + env.PATH;
    }
  }

  let command = "node scripts/dev.mjs --serve";
  if (withCloudHelp) command += " --cloud-help";
  if (configuredKey) command += " --key-stdin";
  const args = ["emulators:exec", "--non-interactive", "--only", "auth,firestore", "--project", project,
    "--config", "ops/firebase.json", command];
  const isWindows = process.platform === "win32";
  const child = spawn(isWindows ? "firebase.cmd" : "firebase", args, {
    cwd: website, env, stdio: [configuredKey ? "pipe" : "inherit", "inherit", "inherit"],
    detached: !isWindows, shell: isWindows
  });
  if (configuredKey) {
    // A missing CLI or an early emulator exit can close this pipe before the reader starts.
    child.stdin.on("error", error => { if (error.code !== "EPIPE") console.error("Could not pass the local AI configuration."); });
    child.stdin.end(configuredKey);
  }
  function stop(signal) {
    if (!child.pid || child.exitCode !== null || child.signalCode) return;
    try {
      if (isWindows) child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) { if (error.code !== "ESRCH") throw error; }
  }
  const interrupt = () => stop("SIGINT");
  const terminate = () => stop("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    const [code, signal] = await once(child, "exit");
    process.exitCode = code ?? (signal === "SIGINT" ? 0 : 1);
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
}

async function serve() {
  const { seedDemoPartner } = await import("./demo-partner.mjs");
  const { run } = await import("../server.mjs");
  const {email, password} = await seedDemoPartner(project);
  const partners = {config:{projectId:project,apiKey:"local-emulator",authEmulator:process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulator:process.env.FIRESTORE_EMULATOR_HOST},offers:[]};

  const cloud=withCloudHelp ? await import("./start-cloud-help.mjs") : null;
  let key;
  if (process.argv.includes("--key-stdin")) key = (await text(process.stdin)).trim();
  else if (cloud) key = await cloud.cloudHelpKey();
  const server = run({ key, partners, report:cloud?.helpAlertReporter });
  await once(server, "listening");
  console.log("Partner Portal: http://127.0.0.1:" + server.address().port + "/partner-portal/");
  console.log("Local test partner: " + email + "  |  Password: " + password);
}

try {
  if (process.argv[2] === "--serve") await serve();
  else await startEmulators();
} catch (error) {
  console.error(error.code === "ENOENT" ? "Install the Firebase CLI and Java 21 or newer to run the local demo." : error.message);
  process.exitCode = 1;
}
