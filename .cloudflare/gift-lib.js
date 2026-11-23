// Helpers for the gift endpoint: email checks and sending mail through Gmail SMTP.
// Pure module (no Cloudflare imports) so it can be tested in Node.

// ---------- email checks ----------

// Common throw-away / temporary inbox services.
export const DISPOSABLE = new Set([
  "mailinator.com", "mailinator.net", "mailinator.org", "10minutemail.com", "10minutemail.net", "10minemail.com",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz", "guerrillamail.de",
  "guerrillamailblock.com", "sharklasers.com", "grr.la", "pokemail.net", "spam4.me", "yopmail.com", "yopmail.net",
  "yopmail.fr", "temp-mail.org", "temp-mail.io", "tempmail.com", "tempmail.net", "tempmail.dev", "tempmailo.com",
  "tempail.com", "tempr.email", "temp-mail.ru", "throwawaymail.com", "trashmail.com", "trashmail.de", "trashmail.net",
  "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "mohmal.com", "emailondeck.com", "fakeinbox.com",
  "mintemail.com", "mailnesia.com", "moakt.com", "mytemp.email", "1secmail.com", "1secmail.org", "1secmail.net",
  "burnermail.io", "spamgourmet.com", "mailcatch.com", "inboxkitten.com", "tmail.ws", "tmpmail.org", "tmpmail.net",
  "emailfake.com", "fakemail.net", "mail.tm", "mailpoof.com", "discard.email", "spambox.us", "33mail.com",
  "anonaddy.me", "linshiyouxiang.net", "byom.de", "harakirimail.com", "mailsac.com", "mvrht.net", "cuvox.de",
  "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com",
  "teleworm.us", "armyspy.com", "tempinbox.com", "dropmail.me", "emltmp.com", "tempmailaddress.com", "crazymailing.com",
  "spamdecoy.net", "mailforspam.com", "wegwerfmail.de", "wegwerfmail.net", "trbvm.com", "kasmail.com", "luxusmail.org",
]);

// Frequent misspellings of big providers -> the right domain.
const TYPOS = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.co": "gmail.com", "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com", "gmail.om": "gmail.com", "gmail.comm": "gmail.com", "gmali.com": "gmail.com",
  "gmeil.com": "gmail.com", "gmail.cmo": "gmail.com", "gmail.c": "gmail.com", "gimail.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com", "hotmil.com": "hotmail.com", "hotamil.com": "hotmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com", "yhoo.com": "yahoo.com",
  "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.co": "outlook.com", "outlook.con": "outlook.com",
  "iclod.com": "icloud.com", "icoud.com": "icloud.com", "icloud.co": "icloud.com", "icloud.con": "icloud.com",
};

// Returns {email, user, domain} (trimmed, lower case) or null when the address is not well formed.
export function parseEmail(raw) {
  const e = String(raw || "").trim().toLowerCase();
  if (e.length > 254) return null;
  const m = /^([a-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64})@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24})$/.exec(e);
  if (!m) return null;
  const [, user, domain] = m;
  if (user.startsWith(".") || user.endsWith(".") || user.includes("..")) return null;
  return { email: e, user, domain };
}

// "name@gmial.com" -> "name@gmail.com"; null when there is nothing to fix.
export function typoFix(p) {
  const fix = TYPOS[p.domain];
  return fix ? p.user + "@" + fix : null;
}

export function isDisposable(domain) {
  if (DISPOSABLE.has(domain)) return true;
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) if (DISPOSABLE.has(parts.slice(i).join("."))) return true;
  return false;
}

// Does the domain accept mail? true / false, or null when DNS could not be asked.
export async function domainTakesMail(domain, fetchFn = fetch) {
  try {
    const r = await fetchFn(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, { headers: { accept: "application/dns-json" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.Status === 3) return false; // domain does not exist
    if (j.Status !== 0) return null;
    const mx = (j.Answer || []).filter((a) => a.type === 15).map((a) => String(a.data).trim().split(/\s+/));
    // "0 ." is a null MX: the domain says it takes no mail
    return mx.some(([, host]) => host && host !== ".");
  } catch {
    return null;
  }
}

// ---------- mail ----------

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const wrap76 = (s) => s.replace(/.{1,76}/g, "$&\r\n").trimEnd();
const encWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

export function buildMessage({ from, fromName, to, subject, text, html, domain = "morz.lol" }) {
  const boundary = "mz_" + crypto.randomUUID().replace(/-/g, "");
  const id = crypto.randomUUID() + "@" + domain;
  return [
    `From: ${encWord(fromName)} <${from}>`,
    `To: <${to}>`,
    `Subject: ${encWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(text)),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(html)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

// Sends one message over an already open (TLS) SMTP connection: {readable, writable}.
export async function smtpSend(sock, { user, pass, to, message, helo = "morz.lol" }) {
  const reader = sock.readable.getReader();
  const writer = sock.writable.getWriter();
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = "";
  async function reply() {
    for (;;) {
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3}(?: |$)/.test(lines[i])) {
          const text = lines.slice(0, i + 1).join("\n");
          buf = lines.slice(i + 1).join("\r\n");
          return { code: Number(lines[i].slice(0, 3)), text };
        }
      }
      const { value, done } = await reader.read();
      if (done) throw new Error("smtp: connection closed");
      buf += dec.decode(value, { stream: true });
    }
  }
  async function cmd(line, ok, label) {
    if (line != null) await writer.write(enc.encode(line + "\r\n"));
    const r = await reply();
    if (!ok.includes(r.code)) throw new Error(`smtp ${label || line.split(" ")[0]}: ${r.text.slice(0, 200)}`);
    return r;
  }
  await cmd(null, [220], "greeting");
  await cmd("EHLO " + helo, [250]);
  await cmd("AUTH PLAIN " + b64("\0" + user + "\0" + pass), [235], "AUTH");
  await cmd(`MAIL FROM:<${user}>`, [250], "MAIL");
  await cmd(`RCPT TO:<${to}>`, [250, 251], "RCPT");
  await cmd("DATA", [354]);
  const body = message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
  await cmd(body + (body.endsWith("\r\n") ? "" : "\r\n") + ".", [250], "DATA end");
  try { await writer.write(enc.encode("QUIT\r\n")); } catch { /* ignore */ }
}

// ---------- the gift email ----------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function giftEmail({ code, percent, minutes, shopUrl }) {
  const subject = `🎁 Your MORZ gift: ${percent}% OFF code`;
  const link = `${shopUrl}/?gift=${encodeURIComponent(code)}`;
  const text = [
    `Your personal MORZ gift code: ${code}`,
    `${percent}% OFF. It works for ${minutes} minutes and can be used once.`,
    "",
    "How to use it:",
    "1. Open the product you want on morz.lol.",
    "2. Tap the red \"Buy now\" button.",
    "3. On the payment page, tap \"Promo code & details\" at the top, paste your code and tap Apply.",
    "",
    "Works with the Buy now card payment and bundles. Not for orders made with \"Add to cart\".",
    "",
    `Open your gift: ${link}`,
  ].join("\n");
  const step = (n, t) => `<tr><td style="padding:6px 0;vertical-align:top;width:30px"><div style="width:24px;height:24px;border-radius:12px;background:#e2323f;color:#fff;font:bold 13px/24px Arial,sans-serif;text-align:center">${n}</div></td><td style="padding:6px 0;font:15px/1.45 Arial,sans-serif;color:#222">${t}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#b3121f;background-image:linear-gradient(135deg,#d42a3a,#8b0f1c);padding:26px 24px;text-align:center;color:#fff">
<div style="font-size:40px;line-height:1">🎁</div>
<div style="font:bold 22px/1.3 Arial,sans-serif;margin-top:8px">Your gift from MORZ</div>
<div style="font:15px/1.4 Arial,sans-serif;opacity:.9;margin-top:4px">${percent}% OFF your order</div></td></tr>
<tr><td style="padding:24px">
<div style="font:15px/1.5 Arial,sans-serif;color:#444;text-align:center">This is your personal code:</div>
<div style="margin:12px 0 6px;padding:14px;border:2px dashed #e0a800;border-radius:12px;background:#fff8e1;text-align:center;font:bold 28px/1.2 'Courier New',monospace;letter-spacing:4px;color:#1a1200">${esc(code)}</div>
<div style="font:bold 14px/1.4 Arial,sans-serif;color:#c8202f;text-align:center">⏳ Works for ${minutes} minutes · one use</div>
<div style="margin:22px 0 8px;font:bold 13px/1 Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#b07d00">How to use it</div>
<table role="presentation" cellpadding="0" cellspacing="0">
${step(1, "Open the product you want on <b>morz.lol</b>.")}
${step(2, "Tap the red <b>Buy now</b> button.")}
${step(3, "On the payment page, tap <b>Promo code &amp; details</b> at the top, paste your code and tap <b>Apply</b>.")}
</table>
<div style="margin-top:10px;font:13px/1.4 Arial,sans-serif;color:#777">Works with the Buy now card payment and bundles. Not for orders made with “Add to cart”.</div>
<div style="text-align:center;margin-top:22px"><a href="${esc(link)}" style="display:inline-block;background:#e2323f;color:#fff;text-decoration:none;font:bold 16px/1 Arial,sans-serif;padding:15px 28px;border-radius:10px">Open my gift</a></div>
</td></tr></table>
<div style="font:12px/1.4 Arial,sans-serif;color:#999;margin-top:14px">You got this email because you asked for a gift on morz.lol.</div>
</td></tr></table></body></html>`;
  return { subject, text, html };
}
