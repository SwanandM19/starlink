// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";
// import Groq from "groq-sdk";

// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// export async function POST(req: NextRequest) {
//   const { client_id } = await req.json();


  
//   const { data: client } = await supabase.from("profiles").select("*").eq("id", client_id).single();
//   const { data: freelancers } = await supabase.from("profiles").select("*").eq("role", "freelancer");

//   const prompt = `
// Client needs: ${client.requirements}, budget: ₹${client.budget}
// Rank these freelancers by match score (0-100) and return JSON array with id and score:
// ${freelancers?.map(f => `ID: ${f.id}, Skills: ${f.skills?.join(", ")}, Rate: ₹${f.hourly_rate}/hr`).join("\n")}
// `;

//   const result = await groq.chat.completions.create({
//     model: "llama-3.3-70b-versatile",
//     messages: [{ role: "user", content: prompt }],
//     response_format: { type: "json_object" },
//   });

//   const matches = JSON.parse(result.choices[0].message.content!);
//   return NextResponse.json(matches);
// }



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { client_id, freelancer_id, tg_id } = await req.json();

    // ── 1. Fetch client profile ──────────────────────────────────────
    const { data: client, error: clientErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // ── 2. Fetch all freelancers (or specific one if freelancer_id passed) ──
    const freelancerQuery = supabase.from("profiles").select("*").eq("role", "freelancer");
    if (freelancer_id) freelancerQuery.eq("id", freelancer_id);

    const { data: freelancers, error: flErr } = await freelancerQuery;

    if (flErr || !freelancers || freelancers.length === 0) {
      return NextResponse.json({ error: "No freelancers found" }, { status: 404 });
    }

    // ── 3. AI Scoring via Groq ───────────────────────────────────────
    const prompt = `
You are a freelance matching engine.

Client Project:
- Requirements: ${client.requirements}
- Budget: ₹${client.budget}

Freelancers:
${freelancers.map((f, i) =>
  `${i + 1}. ID: ${f.id} | Name: ${f.name} | Skills: ${f.skills?.join(", ")} | Rate: ₹${f.hourly_rate}/hr`
).join("\n")}

Score each freelancer from 0-100 based on how well they match the client's requirements and budget.
Return ONLY a valid JSON object like this:
{
  "matches": [
    { "id": "<freelancer_uuid>", "score": 85, "reason": "Strong React skills, within budget" },
    { "id": "<freelancer_uuid>", "score": 60, "reason": "Partial skill match" }
  ]
}
`;

    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const parsed = JSON.parse(aiResponse.choices[0].message.content!);
    const aiMatches: { id: string; score: number; reason: string }[] = parsed.matches;

    // ── 4. Save matches to Supabase ──────────────────────────────────
    const matchInserts = aiMatches.map((m) => ({
      client_id: client.id,
      freelancer_id: m.id,
      ai_score: m.score,
      status: "pending",
    }));

    const { error: matchErr } = await supabase
      .from("matches")
      .upsert(matchInserts, { onConflict: "client_id,freelancer_id" });

    if (matchErr) {
      console.error("Match insert error:", matchErr);
    }

    // ── 5. If a specific swipe-right happened, create a Deal too ─────
    if (freelancer_id) {
      const topMatch = aiMatches.find((m) => m.id === freelancer_id);

      const { data: existingDeal } = await supabase
        .from("deals")
        .select("id")
        .eq("client_id", client.id)
        .eq("freelancer_id", freelancer_id)
        .single();

      if (!existingDeal) {
        await supabase.from("deals").insert({
          client_id: client.id,
          freelancer_id: freelancer_id,
          terms: `Client requires: ${client.requirements}. AI match score: ${topMatch?.score ?? "N/A"}/100. Reason: ${topMatch?.reason ?? "Manual match"}.`,
          amount: client.budget,
          status: "pending",
          client_signed: false,
          freelancer_signed: false,
        });
      }

      // Fetch the deal to return its ID
      const { data: deal } = await supabase
        .from("deals")
        .select("id")
        .eq("client_id", client.id)
        .eq("freelancer_id", freelancer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return NextResponse.json({
        success: true,
        matches: aiMatches,
        deal_id: deal?.id ?? null,
        top_match: topMatch ?? null,
      });
    }

    // ── 6. Return all scored matches ─────────────────────────────────
    const enriched = aiMatches.map((m) => {
      const profile = freelancers.find((f) => f.id === m.id);
      return {
        ...m,
        name: profile?.name,
        skills: profile?.skills,
        hourly_rate: profile?.hourly_rate,
        portfolio_url: profile?.portfolio_url,
        passport_nft_id: profile?.passport_nft_id,
      };
    }).sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      matches: enriched,
    });

  } catch (err: any) {
    console.error("Match API error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
