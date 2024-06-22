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
pub struct QuizState {
  pub participants: Vec<Pubkey>,
  pub pot: u64,
  pub scores: Vec<u64>, // プレイヤーごとスコア(文字列類似度)を保持
  pub fee_pot: u64, // 手数料用のフィールド
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum QuizInstruction {
  JoinQuiz { bet: u64, fee: u64 },
  Distributes { scores: Vec<(Pubkey, u64)> },
}

// solana-program-sdkの `entrypoint` を呼び出し。
entrypoint!(process_instruction);

fn process_instruction(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  instruction_data: &[u8],
) -> ProgramResult {
  let instruction = QuizInstruction::try_from_slice(instruction_data).map_err(|_| ProgramError::InvalidInstructionData)?;

  let accounts_iter = &mut accounts.iter();

  match instruction {
    QuizInstruction::JoinQuiz { bet, fee} => {
      let participant_account = next_account_info(accounts_iter)?;
      let quiz_state_account = next_account_info(accounts_iter)?;

      if **participant_account.lamports.borrow() < bet + fee {
        return Err(ProgramError::InsufficientFunds);
      }

      let mut quiz_state: QuizState = QuizState::try_from_slice(&quiz_state_account.data.borrow())?;
      quiz_state.participants.push(*participant_account.key);
      quiz_state.scores.push(0); // 初期スコアは0
      quiz_state.pot += bet;
      quiz_state.fee_pot += fee;

      **participant_account.lamports.borrow_mut() -= bet + fee;
      **quiz_state_account.lamports.borrow_mut() += bet + fee;

      quiz_state.serialize(&mut &mut quiz_state_account.data.borrow_mut()[..])?;
      msg!("Participant {:?} joined the quiz with an entry fee of {}!", participant_account.key, bet);
    }
    QuizInstruction::Distributes { scores } => {
      let quiz_state_account = next_account_info(accounts_iter)?;

      let mut quiz_state: QuizState = QuizState::try_from_slice(&quiz_state_account.data.borrow())?;

      // 配分の更新
      for (participant, score) in scores {
        if let Some(index) = quiz_state.participants.iter().position(|&x| x == participant) {
          quiz_state.scores[index] = score;
        } else {
          return Err(ProgramError::InvalidArgument)
        }
      }

      // スコアに基づいてSOLを分配
      let total_score: u64 = quiz_state.scores.iter().sum();
      if total_score == 0 {
        return Err(ProgramError::InvalidArgument);
      }

      for (i, participant) in quiz_state.participants.iter().enumerate() {
        // 下の方に記述しているparticipant_accountでうまくいかなかったらこちらをアンコメントアウトする
        // let participant_account = next_account_info(accounts_iter)?;
        let share = quiz_state.scores[i] * quiz_state.pot / total_score;

        
        let participant_account = accounts_iter.find(|&acc| acc.key == participant).ok_or(ProgramError::InvalidAccountData)?;
  
        **participant_account.lamports.borrow_mut() += share;
      }

      quiz_state.pot = 0;

      quiz_state.serialize(&mut &mut quiz_state_account.data.borrow_mut()[..])?;
      msg!("Scores set and SOL distributed based on scores!");

      // 余剰手数料の返還
      if !quiz_state.participants.is_empty() {
        let fee_per_participant = quiz_state.fee_pot / (quiz_state.participants.len() as u64);
        for participant in quiz_state.participants.iter() {
          let participant_account = accounts_iter.find(|&acc| acc.key == participant).ok_or(ProgramError::InvalidAccountData)?;
          **participant_account.lamports.borrow_mut() += fee_per_participant;
        }
        quiz_state.fee_pot = 0;
      }
    }
  }

  msg!("プログラム実行");
  Ok(())
}