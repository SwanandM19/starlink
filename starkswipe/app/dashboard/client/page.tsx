// "use client";
// import { Suspense, useEffect, useState } from "react";
// import { useSearchParams } from "next/navigation";
// import SwipeCard from "@/components/SwipeCard";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

// function ClientDashboardInner() {
//   const params = useSearchParams();
//   const tgId = params.get("tg");
//   const [freelancers, setFreelancers] = useState<any[]>([]);
//   const [index, setIndex] = useState(0);

//   useEffect(() => {
//     supabase.from("profiles").select("*").eq("role", "freelancer").then(({ data }) => {
//       if (data) setFreelancers(data);
//     });
//   }, []);

//   async function handleSwipe(dir: string) {
//     if (dir === "right") {
//       // Create a match
//       const { data: client } = await supabase.from("profiles").select("id").eq("telegram_id", tgId).single();
//       await supabase.from("matches").insert({
//         client_id: client?.id,
//         freelancer_id: freelancers[index].id,
//         ai_score: 80,
//       });
//       alert(`✅ Matched with ${freelancers[index].name}! Deal link sent.`);
//     }
//     setIndex((i) => i + 1);
//   }

//   const current = freelancers[index];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center">
//       <h1 className="text-3xl font-bold mb-8">⚡ StarkSwipe</h1>
//       <div className="relative h-96 w-80">
//         {current ? (
//           <SwipeCard freelancer={current} onSwipe={handleSwipe} />
//         ) : (
//           <p className="text-gray-400 text-center">
//             No more freelancers right now 😅
//           </p>
//         )}
//       </div>
//       <div className="flex gap-8 mt-10">
//         <button
//           onClick={() => handleSwipe("left")}
//           className="w-14 h-14 rounded-full bg-red-100 text-2xl flex items-center justify-center shadow"
//         >
//           ❌
//         </button>
//         <button
//           onClick={() => handleSwipe("right")}
//           className="w-14 h-14 rounded-full bg-green-100 text-2xl flex items-center justify-center shadow"
//         >
//           💚
//         </button>
//       </div>
//     </div>
//   );
// }

// export default function ClientDashboard() {
//   return (
//     <Suspense fallback={<div>Loading dashboard...</div>}>
//       <ClientDashboardInner />
//     </Suspense>
//   );
// }
"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SwipeCard from "@/components/SwipeCard";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ClientDashboardInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tgId = params.get("tg");
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);

  useEffect(() => {
    async function load() {
      // Load client profile
      if (tgId) {
        const { data: client } = await supabase
          .from("profiles").select("*").eq("telegram_id", tgId).single();
        setClientProfile(client);
      }
      // Load all freelancers
      const { data } = await supabase
        .from("profiles").select("*").eq("role", "freelancer");
      if (data) setFreelancers(data);
    }
    load();
  }, [tgId]);

  async function handleSwipe(dir: string) {
    if (dir === "right" && freelancers[index] && clientProfile) {
      setLoading(true);
      try {
        // Create match + deal directly in Supabase (no API needed)
        const freelancer = freelancers[index];

        // Insert match
        await supabase.from("matches").upsert({
          client_id: clientProfile.id,
          freelancer_id: freelancer.id,
          ai_score: 85,
          status: "pending",
        }, { onConflict: "client_id,freelancer_id" });

        // Insert deal
        const { data: deal, error } = await supabase
          .from("deals")
          .insert({
            client_id: clientProfile.id,
            freelancer_id: freelancer.id,
            terms: `Client requires: ${clientProfile.requirements ?? "Work to be discussed"}. Budget: ₹${clientProfile.budget ?? 0}.`,
            amount: clientProfile.budget ?? 0,
            status: "pending",
            client_signed: false,
            freelancer_signed: false,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Deal insert error:", error);
          alert("Error creating deal: " + error.message);
          setLoading(false);
          return;
        }

        if (deal?.id) {
          alert(`✅ Matched with ${freelancer.name}! Opening deal...`);
          router.push(`/deal/${deal.id}?tg=${tgId}`);
          return;
        }
      } catch (e: any) {
        console.error(e);
        alert("Something went wrong: " + e.message);
      }
      setLoading(false);
    }
    setIndex((i) => i + 1);
  }

  const current = freelancers[index];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">⚡ StarkSwipe</h1>
        {clientProfile && (
          <p className="text-sm text-gray-500 mt-1">Hi {clientProfile.name} 👋 Swipe to find your freelancer</p>
        )}
      </div>

      <div className="relative h-72 w-80">
        {current ? (
          <SwipeCard freelancer={current} onSwipe={handleSwipe} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">No more freelancers 😅<br />Check back later!</p>
          </div>
        )}
      </div>

      {loading && (
        <p className="mt-4 text-purple-600 font-medium animate-pulse">Creating deal...</p>
      )}

      <div className="flex gap-8 mt-10">
        <button
          onClick={() => handleSwipe("left")}
          disabled={loading}
          className="w-14 h-14 rounded-full bg-red-100 text-2xl flex items-center justify-center shadow hover:scale-110 transition"
        >❌</button>
        <button
          onClick={() => handleSwipe("right")}
          disabled={loading}
          className="w-14 h-14 rounded-full bg-green-100 text-2xl flex items-center justify-center shadow hover:scale-110 transition"
        >💚</button>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        {index}/{freelancers.length} freelancers reviewed
      </p>
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ClientDashboardInner />
    </Suspense>
  );
}
