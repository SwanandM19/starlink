import { Bot, session, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const userState: Record<string, any> = {}; // simple in-memory state

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("👨‍💼 I'm a Client", "role_client")
    .text("💻 I'm a Freelancer", "role_freelancer");
  await ctx.reply("Welcome to StarkSwipe ⚡\nThe verified freelance matching platform.\n\nWhat's your role?", { reply_markup: keyboard });
});

bot.callbackQuery("role_client", async (ctx) => {
  const tgId = ctx.from.id.toString();
  userState[tgId] = { role: "client", step: "name" };
  await ctx.reply("Great! What's your name?");
});

bot.callbackQuery("role_freelancer", async (ctx) => {
  const tgId = ctx.from.id.toString();
  userState[tgId] = { role: "freelancer", step: "name" };
  await ctx.reply("Awesome! What's your name?");
});

bot.on("message:text", async (ctx) => {
  const tgId = ctx.from.id.toString();
  const state = userState[tgId];
  if (!state) return;

  if (state.role === "client") {
    if (state.step === "name") {
      state.name = ctx.message.text;
      state.step = "requirements";
      await ctx.reply("What kind of work do you need done? (Describe your project)");
    } else if (state.step === "requirements") {
      state.requirements = ctx.message.text;
      state.step = "budget";
      await ctx.reply("What's your budget in ₹?");
    } else if (state.step === "budget") {
      state.budget = parseFloat(ctx.message.text);
      // Save to Supabase
      await supabase.from("profiles").upsert({
        telegram_id: tgId,
        role: "client",
        name: state.name,
        requirements: state.requirements,
        budget: state.budget,
      });
      const dashboardUrl = `${process.env.NEXT_PUBLIC_URL}/dashboard/client?tg=${tgId}`;
      await ctx.reply(`✅ Profile created!\n\n🎉 Your NFT Passport is being minted on StarkNet...\n\n👉 Open your dashboard:\n${dashboardUrl}`);
      // Trigger NFT mint
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/mint-passport`, {
        method: "POST",
        body: JSON.stringify({ telegram_id: tgId, role: "client" }),
        headers: { "Content-Type": "application/json" },
      });
      delete userState[tgId];
    }
  }

  if (state.role === "freelancer") {
    if (state.step === "name") {
      state.name = ctx.message.text;
      state.step = "skills";
      await ctx.reply("List your top skills (comma separated, e.g. React, Node.js, Figma)");
    } else if (state.step === "skills") {
      state.skills = ctx.message.text.split(",").map((s: string) => s.trim());
      state.step = "portfolio";
      await ctx.reply("Share your portfolio URL (GitHub / Behance / website)");
    } else if (state.step === "portfolio") {
      state.portfolio_url = ctx.message.text;
      state.step = "rate";
      await ctx.reply("What's your hourly rate in ₹?");
    } else if (state.step === "rate") {
      state.hourly_rate = parseFloat(ctx.message.text);
      await supabase.from("profiles").upsert({
        telegram_id: tgId,
        role: "freelancer",
        name: state.name,
        skills: state.skills,
        portfolio_url: state.portfolio_url,
        hourly_rate: state.hourly_rate,
      });
      const dashboardUrl = `${process.env.NEXT_PUBLIC_URL}/dashboard/freelancer?tg=${tgId}`;
      await ctx.reply(`✅ Profile created!\n\n🎉 Minting your NFT Passport on StarkNet...\n\n👉 Open your dashboard:\n${dashboardUrl}`);
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/mint-passport`, {
        method: "POST",
        body: JSON.stringify({ telegram_id: tgId, role: "freelancer" }),
        headers: { "Content-Type": "application/json" },
      });
      delete userState[tgId];
    }
  }
});

export { bot };
