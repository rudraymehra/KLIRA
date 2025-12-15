import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Klira } from "../target/types/klira";
import { Signer } from "@solana/web3.js";

describe("klira", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.klira as Program<Klira>;
  const payer: Signer = program.provider.wallet!.payer!;

  it("test", async () => {});
});
