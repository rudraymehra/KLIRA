use anchor_lang::prelude::*;

use crate::error::CustomError;
use crate::state::ProtocolConfig;
use crate::{MAX_FEE_BPS, MAX_SLIPPAGE_BPS};

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol_config"],
        bump,
        has_one = authority @ CustomError::InvalidAuthority
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateConfigParams {
    pub fee_bps: Option<u16>,
    pub fee_account: Option<Pubkey>,
    pub address_tree: Option<Pubkey>,
    pub max_slippage_bps: Option<u16>,
}

pub fn update_config(ctx: Context<UpdateConfig>, params: UpdateConfigParams) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;

    if let Some(fee_bps) = params.fee_bps {
        require!(fee_bps <= MAX_FEE_BPS, CustomError::FeeTooHigh);
        config.fee_bps = fee_bps;
    }

    if let Some(fee_account) = params.fee_account {
        require!(fee_account != Pubkey::default(), CustomError::InvalidAccount);
        config.fee_account = fee_account;
    }

    if let Some(address_tree) = params.address_tree {
        config.address_tree = address_tree;
    }

    if let Some(max_slippage_bps) = params.max_slippage_bps {
        require!(max_slippage_bps <= MAX_SLIPPAGE_BPS, CustomError::InvalidConfigParam);
        config.max_slippage_bps = max_slippage_bps;
    }

    Ok(())
}

// --- Pause / Unpause ---

#[derive(Accounts)]
pub struct PauseProtocol<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol_config"],
        bump,
        has_one = authority @ CustomError::InvalidAuthority
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

pub fn pause(ctx: Context<PauseProtocol>) -> Result<()> {
    ctx.accounts.protocol_config.paused = true;
    msg!("Protocol paused by {}", ctx.accounts.authority.key());
    Ok(())
}

pub fn unpause(ctx: Context<PauseProtocol>) -> Result<()> {
    ctx.accounts.protocol_config.paused = false;
    msg!("Protocol unpaused by {}", ctx.accounts.authority.key());
    Ok(())
}

// --- Transfer Authority ---

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol_config"],
        bump,
        has_one = authority @ CustomError::InvalidAuthority
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

pub fn transfer_authority(ctx: Context<TransferAuthority>, new_authority: Pubkey) -> Result<()> {
    // Prevent accidental transfer to zero/default pubkey which would permanently lock the protocol
    require!(
        new_authority != Pubkey::default(),
        CustomError::InvalidConfigParam
    );

    ctx.accounts.protocol_config.pending_authority = new_authority;
    msg!(
        "Authority transfer proposed: {} -> {}",
        ctx.accounts.protocol_config.authority,
        new_authority
    );
    Ok(())
}

// --- Accept Authority (two-step transfer) ---

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    pub new_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol_config"],
        bump,
        constraint = protocol_config.pending_authority == new_authority.key() @ CustomError::InvalidAuthority
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
    let old_authority = ctx.accounts.protocol_config.authority;
    let new_authority = ctx.accounts.new_authority.key();

    ctx.accounts.protocol_config.authority = new_authority;
    ctx.accounts.protocol_config.pending_authority = Pubkey::default();

    msg!(
        "Authority transferred from {} to {}",
        old_authority,
        new_authority
    );
    Ok(())
}
