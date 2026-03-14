import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default async function PassportPage({ params }: { params: { id: string } }) {
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", params.id).single();

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Passport not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-8 max-w-sm w-full text-white shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs text-purple-300 uppercase tracking-widest">StarkSwipe Passport</p>
            <h1 className="text-2xl font-bold mt-1">{profile.name}</h1>
            <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full mt-1 inline-block capitalize">
              {profile.role}
            </span>
          </div>
          <div className="text-4xl">⚡</div>
        </div>

        {/* NFT Badge */}
        <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-3 mb-6 flex items-center gap-2">
          <span className="text-green-400">✅</span>
          <div>
            <p className="text-xs text-green-300">Verified on StarkNet</p>
            <p className="text-xs text-white/50 font-mono truncate">Token #{profile.passport_nft_id}</p>
          </div>
        </div>

        {/* Details */}
        {profile.role === "freelancer" && (
          <>
            <div className="mb-4">
              <p className="text-xs text-white/50 mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map((s: string) => (
                  <span key={s} className="bg-white/10 text-white text-xs px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <div className="mb-4 flex justify-between">
              <div>
                <p className="text-xs text-white/50">Hourly Rate</p>
                <p className="font-bold">₹{profile.hourly_rate}/hr</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Portfolio</p>
                <a href={profile.portfolio_url} target="_blank" className="text-purple-300 text-sm underline">View →</a>
              </div>
            </div>
          </>
        )}

        {profile.role === "client" && (
          <div className="mb-4">
            <p className="text-xs text-white/50 mb-1">Project Requirement</p>
            <p className="text-sm">{profile.requirements}</p>
            <p className="mt-2 font-bold text-purple-300">Budget: ₹{profile.budget}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 mt-2">
          <p className="text-xs text-white/30 text-center">
            StarkSwipe · Secured by StarkNet ZK Proofs
          </p>
        </div>
      </div>
    </div>
  );
}
