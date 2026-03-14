"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function DealPage() {
  const { id } = useParams();
  const params = useSearchParams();
  const tgId = params.get("tg");
  const [deal, setDeal] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("deals").select("*, client:client_id(*), freelancer:freelancer_id(*)").eq("id", id).single()
      .then(({ data }) => setDeal(data));
    supabase.from("profiles").select("*").eq("telegram_id", tgId).single()
      .then(({ data }) => setMe(data));
  }, [id, tgId]);

  async function signDeal() {
    setLoading(true);
    const isClient = me?.id === deal?.client_id;
    await supabase.from("deals").update(
      isClient ? { client_signed: true } : { freelancer_signed: true }
    ).eq("id", id);

    // If both signed, call escrow release API
    const updated = isClient
      ? { ...deal, client_signed: true }
      : { ...deal, freelancer_signed: true };

    if (updated.client_signed && updated.freelancer_signed) {
      await fetch("/api/escrow", {
        method: "POST",
        body: JSON.stringify({ deal_id: id, action: "release" }),
        headers: { "Content-Type": "application/json" },
      });
      alert("🎉 Both signed! Escrow released on StarkNet.");
    } else {
      alert("✅ You signed! Waiting for other party.");
    }
    setLoading(false);
    window.location.reload();
  }

  if (!deal) return <div className="min-h-screen flex items-center justify-center">Loading deal...</div>;

  const isSigned = me?.role === "client" ? deal.client_signed : deal.freelancer_signed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        <h1 className="text-2xl font-bold mb-2">📜 Deal Contract</h1>
        <span className={`text-xs px-2 py-1 rounded-full ${deal.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          {deal.status.toUpperCase()}
        </span>

        <div className="mt-6 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <p><span className="font-semibold">Client:</span> {deal.client?.name}</p>
          <p><span className="font-semibold">Freelancer:</span> {deal.freelancer?.name}</p>
          <p><span className="font-semibold">Amount:</span> ₹{deal.amount}</p>
          <p><span className="font-semibold">Terms:</span> {deal.terms}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3 text-center text-sm ${deal.client_signed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {deal.client_signed ? "✅ Client Signed" : "⏳ Client Pending"}
          </div>
          <div className={`rounded-xl p-3 text-center text-sm ${deal.freelancer_signed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {deal.freelancer_signed ? "✅ Freelancer Signed" : "⏳ Freelancer Pending"}
          </div>
        </div>

        {!isSigned && deal.status !== "completed" && (
          <button
            onClick={signDeal}
            disabled={loading}
            className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition"
          >
            {loading ? "Signing on StarkNet..." : "✍️ Sign This Deal"}
          </button>
        )}

        {deal.escrow_contract && (
          <p className="mt-4 text-xs text-gray-400 break-all">
            🔗 Escrow Contract: {deal.escrow_contract}
          </p>
        )}
      </div>
    </div>
  );
}
