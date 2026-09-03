const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY || "",
    Authorization: `Bearer ${SUPABASE_KEY || ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function auth(req) {
  return (
    ADMIN_KEY &&
    req.headers["x-admin-key"] === ADMIN_KEY
  );
}

export default async function handler(req, res) {

  if (!auth(req)) {
    return res.status(401).json({
      error: "Neplatné administrátorské heslo.",
    });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: "Databáze není nastavená.",
    });
  }

  try {

    /* =========================
       NAČTENÍ VZKAZŮ
       ========================= */

    if (req.method === "GET") {

      const requestedStatus =
        String(req.query?.status || "pending")
          .trim()
          .toLowerCase();

      const status =
        requestedStatus === "approved"
          ? "approved"
          : "pending";

      const order =
        status === "approved"
          ? "approved_at.desc"
          : "created_at.asc";

      const url =
        `${SUPABASE_URL}/rest/v1/orinaya_messages` +
        `?status=eq.${status}` +
        `&select=id,message,name,anonymous,status,created_at,approved_at` +
        `&order=${order}` +
        `&limit=200`;

      const r = await fetch(url, {
        headers: headers(),
      });

      if (!r.ok) {
        throw new Error(await r.text());
      }

      const messages = await r.json();

      return res.status(200).json({
        status,
        messages,
      });
    }


    /* =========================
       ID
       ========================= */

    const id =
      String(req.body?.id || "").trim();

    if (!id) {
      return res.status(400).json({
        error: "Chybí id.",
      });
    }


    /* =========================
       SCHVÁLENÍ
       ========================= */

    if (
      req.method === "PATCH" &&
      req.body?.action === "approve"
    ) {

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/orinaya_messages?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",

          headers: headers({
            Prefer: "return=minimal",
          }),

          body: JSON.stringify({
            status: "approved",
            approved_at: new Date().toISOString(),
          }),
        }
      );

      if (!r.ok) {
        throw new Error(await r.text());
      }

      return res.status(200).json({
        ok: true,
      });
    }


    /* =========================
       SMAZÁNÍ
       ========================= */

    if (req.method === "DELETE") {

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/orinaya_messages?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",

          headers: headers({
            Prefer: "return=minimal",
          }),
        }
      );

      if (!r.ok) {
        throw new Error(await r.text());
      }

      return res.status(200).json({
        ok: true,
      });
    }


    res.setHeader(
      "Allow",
      "GET, PATCH, DELETE"
    );

    return res.status(405).json({
      error: "Method not allowed",
    });

  } catch (e) {

    console.error(e);

    return res.status(500).json({
      error: "Něco se nepovedlo.",
    });
  }
}
