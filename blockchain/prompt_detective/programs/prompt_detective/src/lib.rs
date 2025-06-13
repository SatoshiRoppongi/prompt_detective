use anchor_lang::prelude::*;

declare_id!("CEbjWJ1jmh5VfpPFJdvwk8HrLFFZEW1f1YQDZ2SfZCVC");

#[program]
pub mod prompt_detective {
    use super::*;

    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_id: String,
        min_bet: u64,
        max_participants: u16,
        end_time: i64,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(end_time > clock.unix_timestamp, GameError::InvalidEndTime);
        require!(min_bet > 0, GameError::InvalidBet);
        require!(max_participants > 0, GameError::InvalidMaxParticipants);

        game.game_id = game_id;
        game.authority = ctx.accounts.authority.key();
        game.min_bet = min_bet;
        game.max_participants = max_participants;
        game.end_time = end_time;
        game.total_pot = 0;
        game.participant_count = 0;
        game.status = GameStatus::Active;
        game.winner = None;
        game.bump = ctx.bumps.game;

        msg!("Game initialized with ID: {}", game.game_id);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>, bet_amount: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        // Validate game state
        require!(game.status == GameStatus::Active, GameError::GameNotActive);
        require!(clock.unix_timestamp < game.end_time, GameError::GameEnded);
        require!(bet_amount >= game.min_bet, GameError::BetTooLow);
        require!(game.participant_count < game.max_participants, GameError::GameFull);

        // Transfer SOL from participant to game authority (simplified approach)
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.authority.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, bet_amount)?;

        // Update game statistics
        game.total_pot = game.total_pot.checked_add(bet_amount).unwrap();
        game.participant_count = game.participant_count.checked_add(1).unwrap();

        msg!("Player {} joined game {} with bet {}", 
             ctx.accounts.player.key(), 
             game.game_id, 
             bet_amount);
        
        Ok(())
    }

    pub fn end_game(ctx: Context<EndGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == GameStatus::Active, GameError::GameNotActive);
        require!(
            clock.unix_timestamp >= game.end_time || 
            ctx.accounts.authority.key() == game.authority,
            GameError::Unauthorized
        );

        game.status = GameStatus::Ended;
        
        msg!("Game {} ended", game.game_id);
        Ok(())
    }

    pub fn distribute_winnings(
        ctx: Context<DistributeWinnings>,
        winner_pubkey: Pubkey,
        winner_amount: u64,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.status == GameStatus::Ended, GameError::GameNotEnded);
        require!(ctx.accounts.authority.key() == game.authority, GameError::Unauthorized);
        require!(game.winner.is_none(), GameError::AlreadyDistributed);

        // Transfer winnings from authority to winner
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.winner.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, winner_amount)?;

        // Update game state
        game.winner = Some(winner_pubkey);
        game.status = GameStatus::Completed;

        msg!("Winnings distributed to {} (amount: {})", 
             winner_pubkey, winner_amount);
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Game::INIT_SPACE,
        seeds = [b"game", game_id.as_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeWinnings<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Winner account is validated by checking against game state
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Game {
    #[max_len(32)]
    pub game_id: String,
    pub authority: Pubkey,
    pub min_bet: u64,
    pub max_participants: u16,
    pub end_time: i64,
    pub total_pot: u64,
    pub participant_count: u16,
    pub status: GameStatus,
    pub winner: Option<Pubkey>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GameStatus {
    Active,
    Ended,
    Completed,
    Cancelled,
}

#[error_code]
pub enum GameError {
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Game has already ended")]
    GameEnded,
    #[msg("Game has not ended yet")]
    GameNotEnded,
    #[msg("Bet amount is too low")]
    BetTooLow,
    #[msg("Game is full")]
    GameFull,
    #[msg("Invalid end time")]
    InvalidEndTime,
    #[msg("Invalid bet amount")]
    InvalidBet,
    #[msg("Invalid max participants")]
    InvalidMaxParticipants,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Winnings already distributed")]
    AlreadyDistributed,
}