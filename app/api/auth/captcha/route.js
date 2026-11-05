import crypto from "crypto";

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || process.env.JWT_SECRET || "ckk_captcha_secret_2026_x88!";

function createHmacSignature(payload) {
  return crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex");
}

export function generateCaptchaToken(answer) {
  const expiresAt = Date.now() + 3 * 60 * 1000; // 3 menit
  const normalizedAnswer = String(answer).trim().toLowerCase();
  const answerHash = crypto.createHash("sha256").update(normalizedAnswer).digest("hex");
  const payloadStr = JSON.stringify({ h: answerHash, exp: expiresAt });
  const encodedPayload = Buffer.from(payloadStr).toString("base64url");
  const signature = createHmacSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyCaptchaToken(token, userAnswer) {
  if (!token || !userAnswer) return false;
  const parts = String(token).split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;
  const expectedSig = createHmacSignature(encodedPayload);
  if (signature !== expectedSig) return false;

  try {
    const payloadStr = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const { h: answerHash, exp } = JSON.parse(payloadStr);
    if (Date.now() > exp) return false; // Expired
    const userHash = crypto.createHash("sha256").update(String(userAnswer).trim().toLowerCase()).digest("hex");
    return userHash === answerHash;
  } catch {
    return false;
  }
}

export async function GET() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 15) + 1;
  const isPlus = Math.random() > 0.3;
  const question = isPlus ? `${a} + ${b} = ?` : `${Math.max(a, b)} - ${Math.min(a, b)} = ?`;
  const answer = isPlus ? String(a + b) : String(Math.max(a, b) - Math.min(a, b));

  const token = generateCaptchaToken(answer);

  // Buat visual SVG yang aman dan rapi
  const width = 160;
  const height = 48;
  const line1 = `<line x1="${Math.random()*30}" y1="${Math.random()*48}" x2="${120+Math.random()*40}" y2="${Math.random()*48}" stroke="#8B0000" stroke-width="1.5" stroke-opacity="0.25"/>`;
  const line2 = `<line x1="${Math.random()*30}" y1="${Math.random()*48}" x2="${120+Math.random()*40}" y2="${Math.random()*48}" stroke="#A0522D" stroke-width="1.2" stroke-opacity="0.2"/>`;
  const dots = Array.from({ length: 15 }, () => `<circle cx="${Math.random()*160}" cy="${Math.random()*48}" r="${1 + Math.random()}" fill="#8B0000" opacity="0.2"/>`).join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #FAF8F5; border-radius: 8px;">
      <defs>
        <pattern id="noise" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.5" fill="#6D0808" opacity="0.08"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#noise)"/>
      ${dots}
      ${line1}
      ${line2}
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="monospace, sans-serif" font-weight="900" font-size="22" fill="#6D0808" letter-spacing="3">
        ${question}
      </text>
    </svg>
  `.trim();

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return new Response(JSON.stringify({ captchaImage: dataUri, captchaToken: token }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
