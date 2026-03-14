// "use client";
// import { Suspense, useEffect, useState } from "react";
// import { useSearchParams } from "next/navigation";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

// function FreelancerDashboardInner() {
//   const params = useSearchParams();
//   const tgId = params.get("tg");
//   const [projects, setProjects] = useState<any[]>([]);

//   useEffect(() => {
//     // Load clients who need work (open projects)
//     supabase.from("profiles").select("*").eq("role", "client").then(({ data }) => {
//       if (data) setProjects(data);
//     });
//   }, []);

//   async function applyToProject(clientId: string) {
//     const { data: me } = await supabase
//       .from("profiles")
//       .select("id")
//       .eq("telegram_id", tgId)
//       .single();
//     await supabase
//       .from("matches")
//       .insert({ client_id: clientId, freelancer_id: me?.id, ai_score: 90 });
//     alert("Applied! Client will be notified.");
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
//       <h1 className="text-3xl font-bold mb-6">💻 Open Projects</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {projects.map((p) => (
//           <div key={p.id} className="bg-white rounded-xl shadow p-5">
//             <div className="flex justify-between items-start">
//               <div>
//                 <h2 className="font-semibold text-lg">{p.name}</h2>
//                 <p className="text-gray-500 text-sm mt-1">{p.requirements}</p>
//               </div>
//               {p.passport_nft_id && (
//                 <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
//                   ✅ Verified
//                 </span>
//               )}
//             </div>
//             <div className="flex justify-between items-center mt-4">
//               <span className="font-bold text-purple-600">₹{p.budget}</span>
//               <button
//                 onClick={() => applyToProject(p.id)}
//                 className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
//               >
//                 Apply →
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default function FreelancerDashboard() {
//   return (
//     <Suspense fallback={<div>Loading dashboard...</div>}>
//       <FreelancerDashboardInner />
//     </Suspense>
//   );
// }
"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function FreelancerDashboardInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tgId = params.get("tg");
  const [projects, setProjects] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myDeals, setMyDeals] = useState<any[]>([]);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (tgId) {
        const { data: me } = await supabase
          .from("profiles").select("*").eq("telegram_id", tgId).single();
        setMyProfile(me);

        if (me) {
          // Load my existing deals
          const { data: deals } = await supabase
            .from("deals")
            .select("*, client:client_id(*)")
            .eq("freelancer_id", me.id);
          if (deals) setMyDeals(deals);
        }
      }

      // Load open client projects
      const { data } = await supabase
        .from("profiles").select("*").eq("role", "client");
      if (data) setProjects(data);
    }
    load();
  }, [tgId]);

  async function applyToProject(clientId: string, clientName: string) {
    if (!myProfile) {
      alert("Profile not found. Make sure you registered via the bot first.");
      return;
    }
    setApplying(clientId);

    // Create match
    await supabase.from("matches").upsert({
      client_id: clientId,
      freelancer_id: myProfile.id,
      ai_score: 90,
      status: "pending",
    }, { onConflict: "client_id,freelancer_id" });

    // Create deal
    const { data: deal, error } = await supabase
      .from("deals")
      .insert({
        client_id: clientId,
        freelancer_id: myProfile.id,
        terms: `Freelancer ${myProfile.name} applied for this project.`,
        amount: projects.find(p => p.id === clientId)?.budget ?? 0,
        status: "pending",
        client_signed: false,
        freelancer_signed: false,
      })
      .select("id")
      .single();

    setApplying(null);

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    if (deal?.id) {
      alert(`✅ Applied to ${clientName}'s project! Opening deal to sign...`);
      router.push(`/deal/${deal.id}?tg=${tgId}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">💻 StarkSwipe</h1>
        {myProfile && (
          <p className="text-sm text-gray-500 mb-6">Hi {myProfile.name} 👋 Find your next project</p>
        )}

        {/* My Active Deals */}
        {myDeals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">📋 My Active Deals</h2>
            <div className="space-y-2">
              {myDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => router.push(`/deal/${deal.id}?tg=${tgId}`)}
                  className="bg-white rounded-xl p-4 shadow cursor-pointer hover:shadow-md transition flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{deal.client?.name ?? "Client"}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{deal.terms}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">₹{deal.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      deal.status === "completed" ? "bg-green-100 text-green-700" :
                      deal.client_signed && deal.freelancer_signed ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {deal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Projects */}
        <h2 className="text-lg font-semibold mb-3">🔍 Open Projects</h2>
        <div className="grid grid-cols-1 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow p-5 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {p.name?.[0] ?? "C"}
                    </div>
                    <div>
                      <h2 className="font-semibold">{p.name}</h2>
                      <p className="text-xs text-gray-400">Client</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mt-3">{p.requirements}</p>
                </div>
                {p.passport_nft_id && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2">✅ Verified</span>
                )}
              </div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                <span className="font-bold text-purple-600 text-lg">₹{p.budget}</span>
                <button
                  onClick={() => applyToProject(p.id, p.name)}
                  disabled={applying === p.id}
                  className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  {applying === p.id ? "Applying..." : "Apply →"}
                </button>
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <p className="text-gray-400 text-center py-10">No open projects yet 😅</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FreelancerDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <FreelancerDashboardInner />
    </Suspense>
  );
}
