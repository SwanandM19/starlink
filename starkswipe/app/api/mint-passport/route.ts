import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RpcProvider, Account, Contract, CallData, uint256 } from "starknet";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function POST(req: NextRequest) {
  const { telegram_id, role } = await req.json();

  // StarkNet mint
  const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
  const account = new Account({
    provider,
    address: process.env.STARKNET_ACCOUNT_ADDRESS!,
    signer: process.env.STARKNET_PRIVATE_KEY!,
  });

  const contract = new Contract({
    abi: PASSPORT_ABI,
    address: process.env.PASSPORT_CONTRACT_ADDRESS!,
    providerOrAccount: account,
  });

  const tokenId = Date.now(); // simple unique ID for MVP
  await contract.mint(account.address, uint256.bnToUint256(tokenId));

  // Save token ID to Supabase
  await supabase.from("profiles")
    .update({ passport_nft_id: tokenId.toString() })
    .eq("telegram_id", telegram_id);

  return NextResponse.json({ success: true, tokenId });
}

const PASSPORT_ABI: any[] = [/* minimal ERC721 ABI */];
