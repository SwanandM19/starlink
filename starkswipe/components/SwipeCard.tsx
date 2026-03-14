"use client";
import { motion, useMotionValue, useTransform } from "framer-motion";

export default function SwipeCard({ freelancer, onSwipe }: { freelancer: any; onSwipe: (dir: string) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  function handleDragEnd(_: any, info: any) {
    if (info.offset.x > 100) onSwipe("right");
    else if (info.offset.x < -100) onSwipe("left");
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute w-80 bg-white rounded-2xl shadow-2xl p-6 cursor-grab"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xl">
          {freelancer.name?.[0]}
        </div>
        <div>
          <h2 className="font-bold text-lg">{freelancer.name}</h2>
          <p className="text-sm text-gray-500">₹{freelancer.hourly_rate}/hr</p>
        </div>
        {freelancer.passport_nft_id && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ NFT Verified</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {freelancer.skills?.map((s: string) => (
          <span key={s} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">{s}</span>
        ))}
      </div>
      <a href={freelancer.portfolio_url} target="_blank" className="text-sm text-blue-500 underline">View Portfolio →</a>
    </motion.div>
  );
}
