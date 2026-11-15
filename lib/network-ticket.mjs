import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

const lifetime = 120;
const aad = Buffer.from("willforfree/help-network/v1");

// The browser contacts run.app directly. Only the last address added by that
// frontend represents its peer. A request through another proxy counts as that proxy.
export function directPeer(header) {
  if (typeof header !== "string") return undefined;
  const last = header.slice(header.lastIndexOf(",") + 1).trim();
  return isIP(last) ? last : undefined;
}

export function networkTickets(secret, clock = Date.now) {
  if (!secret || Buffer.byteLength(secret) < 32) throw Error("Configure the shared help signing secret.");
  const key = createHmac("sha256", secret).update(aad).digest();
  return {
    issue(address) {
      if (!isIP(address)) return null;
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(aad);
      const payload = JSON.stringify([Math.floor(clock() / 1000) + lifetime, address]);
      const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
    },
    read(ticket) {
      if (typeof ticket !== "string" || !/^[A-Za-z0-9_-]{60,160}$/.test(ticket)) return null;
      try {
        const bytes = Buffer.from(ticket, "base64url");
        const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
        decipher.setAAD(aad);
        decipher.setAuthTag(bytes.subarray(12, 28));
        const plain = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
        const [expires, address] = JSON.parse(plain.toString("utf8"));
        const now = Math.floor(clock() / 1000);
        return Number.isInteger(expires) && expires > now && expires <= now + lifetime && isIP(address) ? address : null;
      } catch {
        return null;
      }
    },
  };
}
