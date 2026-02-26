use anchor_lang::prelude::*;
use light_sdk::{LightDiscriminator, LightHasher};

#[account]
pub struct ProtocolConfig {
    pub authority: Pubkey,       // 32 bytes — admin who can update
    pub fee_bps: u16,            // 2 bytes  — fee in basis points
    pub fee_account: Pubkey,     // 32 bytes — fee recipient
    pub address_tree: Pubkey,    // 32 bytes — Light Protocol address tree
    pub max_slippage_bps: u16,   // 2 bytes  — max allowed slippage
    pub paused: bool,            // 1 byte   — emergency pause
    pub pending_authority: Pubkey, // 32 bytes — pending authority for two-step transfer
}

#[derive(
    Debug, Clone, Copy, Default, AnchorDeserialize, AnchorSerialize, LightDiscriminator, LightHasher,
)]
pub struct EscrowAccount {
    #[hash]
    pub maker: Pubkey,
    pub unique_id: u64,
    pub tokens: Tokens,
    pub amount: Amount,
    pub expired_at: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub fee_bps: u16,
}

#[derive(
    Debug, Clone, Copy, Default, AnchorDeserialize, AnchorSerialize, LightDiscriminator, LightHasher,
)]
pub struct Tokens {
    #[hash]
    pub input_mint: Pubkey,
    #[hash]
    pub output_mint: Pubkey,
    #[hash]
    pub input_token_program: Pubkey,
    #[hash]
    pub output_token_program: Pubkey,
}

#[derive(
    Debug, Clone, Copy, Default, AnchorDeserialize, AnchorSerialize, LightDiscriminator, LightHasher,
)]
pub struct Amount {
    pub ori_making_amount: u64,
    pub ori_taking_amount: u64,
    pub making_amount: u64,
    pub taking_amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Copy)]
pub struct AccountParams {
    pub maker: Pubkey,
    pub unique_id: u64,
    pub amount: Amount,
    pub fee_bps: u16,
    pub expired_at: i64,
    pub created_at: i64,
    pub updated_at: i64,
}
