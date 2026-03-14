import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RpcProvider, Account, Contract } from "starknet";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function POST(req: NextRequest) {
  const { deal_id, action } = await req.json();

  const { data: deal } = await supabase.from("deals").select("*").eq("id", deal_id).single();

  const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
  const account = new Account({
    provider,
    address: process.env.STARKNET_ACCOUNT_ADDRESS!,
    signer: process.env.STARKNET_PRIVATE_KEY!,
  });

  if (action === "create") {
    // Deploy escrow contract for this deal
    const { transaction_hash } = await account.execute({
      contractAddress: process.env.ESCROW_CONTRACT_ADDRESS!,
      entrypoint: "initialize",
      calldata: [deal.amount.toString()],
    });
    await supabase.from("deals")
      .update({ escrow_contract: transaction_hash, status: "signed" })
      .eq("id", deal_id);
    return NextResponse.json({ success: true, tx: transaction_hash });
  }

  if (action === "release") {
    const { transaction_hash } = await account.execute({
      contractAddress: deal.escrow_contract,
      entrypoint: "release",
      calldata: [],
    });
    await supabase.from("deals")
      .update({ status: "completed" })
      .eq("id", deal_id);
    return NextResponse.json({ success: true, tx: transaction_hash });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
