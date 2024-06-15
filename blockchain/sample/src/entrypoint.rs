use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
  account_info::{next_account_info, AccountInfo},
  entrypoint,
  entrypoint::ProgramResult,
  msg,
  program_error::ProgramError,
  pubkey::Pubkey,
};

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct GameState {
  pub players: Vec<Pubkey>,
  pub pot: u64,
  pub scores: Vec<u64>, // プレイヤーごとスコア(文字列類似度)を保持
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum GameInstruction {
  JoinGame { entry_fee: u64 },
  SetScores { scores: Vec<(Pubkey, u64)> },
}

// solana-program-sdkの `entrypoint` を呼び出し。
entrypoint!(process_instruction);

fn process_instruction(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  instruction_data: &[u8],
) -> ProgramResult {
  let instruction = GameInstruction::try_from_slice(instruction_data).map_err(|_| ProgramError::InvalidInstructionData)?;

  let accounts_iter = &mut accounts.iter();

  match instruction {
    GameInstruction::JoinGame { entry_fee } => {
      let player_account = next_account_info(accounts_iter)?;
      let game_state_account = next_account_info(accounts_iter)?;

      if **player_account.lamports.borrow() < entry_fee {
        return Err(ProgramError::InsufficientFunds);
      }

      let mut game_state: GameState = GameState::try_from_slice(&game_state_account.data.borrow())?;
      game_state.players.push(*player_account.key);
      game_state.scores.push(0); // 初期スコアは0
      game_state.pot += entry_fee;

      **player_account.lamports.borrow_mut() -= entry_fee;

      game_state.serialize(&mut &mut game_state_account.data.borrow_mut()[..])?;
      msg!("Player {:?} joined the game with an entry fee of {}!", player_account.key, entry_fee);
    }
    GameInstruction::SetScores { scores } => {
      let game_state_account = next_account_info(accounts_iter)?;

      let mut game_state: GameState = GameState::try_from_slice(&game_state_account.data.borrow())?;

      // 配分の更新
      for (player, score) in scores {
        if let Some(index) = game_state.players.iter().position(|&x| x == player) {
          game_state.scores[index] = score;
        } else {
          return Err(ProgramError::InvalidArgument)
        }
      }

      // スコアに基づいてSOLを分配
      let total_score: u64 = game_state.scores.iter().sum();
      for (i, player) in game_state.players.iter().enumerate() {
        let player_account = next_account_info(accounts_iter)?;
        let share = game_state.scores[i] * game_state.pot / total_score;
        **player_account.lamports.borrow_mut() += share;
      }
      game_state.pot = 0;

      game_state.serialize(&mut &mut game_state_account.data.borrow_mut()[..])?;
      msg!("Scores set and SOL distributed based on scores!");
    }
  }

  msg!("プログラム実行");
  Ok(())
}