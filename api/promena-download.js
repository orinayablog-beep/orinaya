const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function cleanEmail(value){
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

function validEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res){
  if (req.method !== "POST"){
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    return res.status(500).json({ error: "Stažení teď není dostupné." });
  }

  const email = cleanEmail(req.body?.email);

  if (!validEmail(email)){
    return res.status(400).json({ error: "Prosím, zadej platný e-mail." });
  }

  try{
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/orinaya_guide_downloads?on_conflict=email`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=ignore-duplicates,return=minimal"
        },
        body: JSON.stringify({
          email,
          source: "promena"
        })
      }
    );

    if (!response.ok){
      const detail = await response.text();
      console.error("Supabase guide download error:", detail);
      return res.status(500).json({
        error: "Průvodce se teď nepodařilo zpřístupnit."
      });
    }

    return res.status(200).json({
      ok: true,
      downloadUrl: "/PROMENA_ORINAYA.pdf"
    });

  }catch(error){
    console.error("Guide download API error:", error);

    return res.status(500).json({
      error: "Průvodce se teď nepodařilo zpřístupnit."
    });
  }
}
