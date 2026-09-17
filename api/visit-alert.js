module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: "Missing environment variables" });
  }

  const path =
    typeof req.body?.path === "string"
      ? req.body.path.slice(0, 300)
      : "/";

  function decodeHeader(value) {
    if (!value) return "Neznámé";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  const city = decodeHeader(req.headers["x-vercel-ip-city"]);
  const country = decodeHeader(req.headers["x-vercel-ip-country"]);

  const text =
    `👀 Nová návštěva ORINAYA\n\n` +
    `📍 ${city}, ${country}\n` +
    `📄 ${path}`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text
        })
      }
    );

    if (!response.ok) {
      return res.status(502).json({ ok: false });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
};
