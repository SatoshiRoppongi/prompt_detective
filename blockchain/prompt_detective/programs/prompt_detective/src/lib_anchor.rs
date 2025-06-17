use anchor_lang::prelude::*;

declare_id!("CEbjWJ1jmh5VfpPFJdvwk8HrLFFZEW1f1YQDZ2SfZCVC");

#[program]
pub mod prompt_detective {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello, Solana DevNet!");
        Ok(())
    }

    pub fn join_quiz(ctx: Context<JoinQuiz>, bet: u64, fee: u64) -> Result<()> {
        let participant = &ctx.accounts.participant;
        let quiz_state = &mut ctx.accounts.quiz_state;

        msg!("Participant: {}, Bet: {}, Fee: {}", participant.key(), bet, fee);
        
        // Transfer SOL from participant to quiz_state account
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &participant.key(),
            &quiz_state.key(),
            bet + fee,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                participant.to_account_info(),
                quiz_state.to_account_info(),
            ],
        )?;

        msg!("Quiz joined successfully!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct JoinQuiz<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,
    #[account(mut)]
    /// CHECK: This is safe because we only use it to receive funds
    pub quiz_state: AccountInfo<'info>,
}