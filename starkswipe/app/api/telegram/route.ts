import { webhookCallback } from "grammy";
import { bot } from "@/lib/telegram-bot";
import { NextRequest } from "next/server";

const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(req: NextRequest) {
  return handleUpdate(req);
}
