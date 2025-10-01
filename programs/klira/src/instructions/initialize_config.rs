use anchor_lang::prelude::*;

use crate::state::ProtocolConfig;
use crate::{FEE_ACCOUNT, MAX_FEE_BPS, MAX_SLIPPAGE_BPS};
use crate::utils::ADDRESS_TREE;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 2 + 32 + 32 + 2 + 1 + 32,
        seeds = [b"protocol_config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.authority = ctx.accounts.payer.key();
    config.fee_bps = 10;
    config.fee_account = FEE_ACCOUNT;
    config.address_tree = ADDRESS_TREE;
    config.max_slippage_bps = 50;
    config.paused = false;
    config.pending_authority = Pubkey::default();

    msg!(
        "Protocol config initialized: authority={}, fee_bps={}, max_slippage_bps={}, max_fee_bps={}, max_slippage_limit={}",
        config.authority,
        config.fee_bps,
        config.max_slippage_bps,
        MAX_FEE_BPS,
        MAX_SLIPPAGE_BPS,
    );

    Ok(())
}
