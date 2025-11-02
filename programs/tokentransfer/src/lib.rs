use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::associated_token::AssociatedToken;

declare_id!("ALQEfQjpxyXa7xnvakAFf7FmhvJH5xMz3hznMGK7iKXP");

#[program]
pub mod my_token_program {
    use super::*;

    pub fn transfer_token(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
        // Check if the from account has enough balance
        if ctx.accounts.from.amount < amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        // Perform the token transfer
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        // Emit an event for the transfer
        emit!(TransferEvent {
            from: ctx.accounts.authority.key(),
            to: ctx.accounts.target.key(),
            amount,
        });

        msg!("Transfer completed successfully");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct TransferToken<'info> {
    pub token_mint: Account<'info, token::Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = authority,
    )]
    pub from: Account<'info, token::TokenAccount>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = target,
    )]
    pub to: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: This is the target wallet receiving tokens
    pub target: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds for transfer")]
    InsufficientFunds,
}

