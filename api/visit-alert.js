module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Missing environment variables");
    return res.status(500).json({
      ok: false,
      error: "Missing environment variables"
    });
  }

  const body = req.body || {};

  const action =
    body.action === "update" ? "update" : "enter";

  const path =
    typeof body.path === "string"
      ? body.path.slice(0, 300)
      : "/";

  const journey =
    Array.isArray(body.journey)
      ? body.journey
          .filter(x => typeof x === "string")
          .slice(-10)
      : [path];

  const messageId = Number(body.messageId);

  const seconds = Math.max(
    0,
    Math.min(86400, Number(body.seconds) || 0)
  );

  function decodeHeader(value) {
    if (!value) return "Neznámé";

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function formatDuration(total) {
    const s = Math.floor(total % 60);
    const m = Math.floor((total / 60) % 60);
    const h = Math.floor(total / 3600);

    if (h > 0) {
      return `${h} h ${m} min ${s} s`;
    }

    if (m > 0) {
      return `${m} min ${s} s`;
    }

    return `${s} s`;
  }

  const city = decodeHeader(
    req.headers["x-vercel-ip-city"]
  );

  const country = decodeHeader(
    req.headers["x-vercel-ip-country"]
  );

  const route = journey.join(" → ");

  let text =
    `👀 Návštěva ORINAYA\n\n` +
    `📍 ${city}, ${country}\n` +
    `🧭 ${route}\n` +
    `📄 Teď: ${path}`;

  if (action === "update") {
    text +=
      `\n⏱ Aktivní čas: ${formatDuration(seconds)}`;
  }

  try {
    const method =
      action === "update"
        ? "editMessageText"
        : "sendMessage";

    if (
      action === "update" &&
      (!Number.isInteger(messageId) || messageId <= 0)
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid messageId"
      });
    }

    const payload =
      action === "update"
        ? {
            chat_id: chatId,
            message_id: messageId,
            text
          }
        : {
            chat_id: chatId,
            text
          };

    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const telegramBody =
      await response.json().catch(() => ({}));

    if (!response.ok || telegramBody.ok === false) {
      console.error(
        "Telegram error:",
        response.status,
        telegramBody
      );

      return res.status(502).json({
        ok: false,
        telegramStatus: response.status
      });
    }

    return res.status(200).json({
      ok: true,
      messageId:
        telegramBody.result?.message_id || messageId
    });

  } catch (error) {
    console.error("Visit alert error:", error);

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
};
