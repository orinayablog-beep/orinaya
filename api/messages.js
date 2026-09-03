const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY || "",
    Authorization: `Bearer ${SUPABASE_KEY || ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function clean(s, max) {
  return String(s ?? "").trim().slice(0, max);
}

async function sendMail(message, name, anonymous) {
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.NOTIFY_EMAIL ||
    !process.env.EMAIL_FROM
  ) {
    return;
  }

  const safe = message.replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[c]));

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Nový vzkaz od žen ženám ✨</h2>
      <p><strong>${anonymous ? "Anonymně" : (name || "Bez podpisu")}</strong></p>
      <p>${safe}</p>
      <p>
        <a href="https://www.orinaya.blog/vzkazy-admin">
          Otevřít schvalování
        </a>
      </p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [process.env.NOTIFY_EMAIL],
      subject: "Nový vzkaz čeká na schválení 💜",
      html,
    }),
  });
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: "Databáze zatím není nastavená.",
    });
  }

  try {
    if (req.method === "GET") {
      const url =
        `${SUPABASE_URL}/rest/v1/orinaya_messages` +
        `?status=eq.approved` +
        `&select=id,message,name,anonymous,created_at,approved_at` +
        `&order=approved_at.desc` +
        `&limit=100`;

      const r = await fetch(url, {
        headers: headers(),
      });

      if (!r.ok) {
        throw new Error(await r.text());
      }

      return res.status(200).json({
        messages: await r.json(),
      });
    }

    if (req.method === "POST") {
      const message = clean(req.body?.message, 900);
      const name = clean(req.body?.name, 80);
      const anonymous = !!req.body?.anonymous;

      if (message.length < 3) {
        return res.status(400).json({
          error: "Napiš prosím trochu delší vzkaz.",
        });
      }

      const payload = {
        message,
        name: anonymous ? null : (name || null),
        anonymous,
        status: "pending",
      };

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/orinaya_messages`,
        {
          method: "POST",
          headers: headers({
            Prefer: "return=representation",
          }),
          body: JSON.stringify(payload),
        }
      );

      if (!r.ok) {
        throw new Error(await r.text());
      }

      sendMail(message, name, anonymous).catch(() => {});

      return res.status(201).json({
        ok: true,
      });
    }

    res.setHeader("Allow", "GET, POST");

    return res.status(405).json({
      error: "Method not allowed",
    });
  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: "Něco se nepovedlo. Zkus to prosím znovu.",
    });
  }
}
