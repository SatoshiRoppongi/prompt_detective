use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct QuizState {
    pub participants: Vec<Pubkey>,
    pub pot: u64,
    pub scores: Vec<u64>,
    pub fee_pot: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum QuizInstruction {
    JoinQuiz { bet: u64, fee: u64 },
    Distributes { scores: Vec<(Pubkey, u64)> },
}

entrypoint!(process_instruction);

fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Instruction data length: {}", instruction_data.len());
    msg!("Instruction data: {:?}", instruction_data);

    let instruction_result = QuizInstruction::try_from_slice(instruction_data);
    if let Err(ref err) = instruction_result {
        msg!("Failed to deserialize instruction data: {:?}", err);
        return Err(ProgramError::InvalidInstructionData);
    }

    let instruction = instruction_result?;
    msg!("Deserialized instruction: {:?}", instruction);

    let accounts_iter = &mut accounts.iter();

    match instruction {
        QuizInstruction::JoinQuiz { bet, fee } => {
            msg!("JoinQuiz instruction received with bet: {}, fee: {}", bet, fee);

            let participant_account = next_account_info(accounts_iter)?;
            let quiz_state_account = next_account_info(accounts_iter)?;
            msg!("participant_account: {:?}", participant_account);
            msg!("quiz_state_account: {:?}", quiz_state_account);

            if **participant_account.lamports.borrow() < bet + fee {
                return Err(ProgramError::InsufficientFunds);
            }

            let rent = Rent::get()?;
            let required_lamports = rent.minimum_balance(quiz_state_account.data_len());
            msg!("required_lamports: {}", required_lamports);

            if quiz_state_account.lamports() < required_lamports {
                return Err(ProgramError::AccountNotRentExempt);
            }

            msg!("check quiz_state_account.data.borrow().len(): {}", quiz_state_account.data.borrow().len());
            msg!("std::mem::sizeof::<QuizState>(): {}", std::mem::size_of::<QuizState>());

            // アカウントのデータ長が期待される長さであることを確認
            if quiz_state_account.data.borrow().len() < std::mem::size_of::<QuizState>() {
                return Err(ProgramError::InvalidAccountData);
            }
            msg!("check quiz_state");

            let mut quiz_state: QuizState = if quiz_state_account.data.borrow().is_empty() {
                msg!("first time to create QuizState");
                QuizState {
                    participants: Vec::new(),
                    pot: 0,
                    scores: Vec::new(),
                    fee_pot: 0,
                }
            } else {
                msg!("not first time to create QuizState");
                QuizState::try_from_slice(&quiz_state_account.data.borrow()).map_err(|err| {
                    msg!("Failed to deserialize QuizState: {:?}", err);
                    ProgramError::InvalidAccountData
                })?
            };

            msg!("set quiz_state");
            quiz_state.participants.push(*participant_account.key);
            quiz_state.scores.push(0);
            quiz_state.pot += bet;
            quiz_state.fee_pot += fee;

            msg!("calculate balance");

            **participant_account.lamports.borrow_mut() -= bet + fee;
            **quiz_state_account.lamports.borrow_mut() += bet + fee;

            msg!("quiz_state serializse");

            quiz_state.serialize(&mut &mut quiz_state_account.data.borrow_mut()[..]).map_err(|err| {
                msg!("Failed to serialize QuizState: {:?}", err);
                ProgramError::InvalidAccountData
            })?;
            msg!("Participant {:?} joined the quiz with an entry fee of {}!", participant_account.key, bet);
        }
        QuizInstruction::Distributes { scores } => {
            msg!("Distributes instruction received with scores: {:?}", scores);

            let quiz_state_account = next_account_info(accounts_iter)?;

            let mut quiz_state: QuizState = QuizState::try_from_slice(&quiz_state_account.data.borrow()).map_err(|err| {
                msg!("Failed to deserialize QuizState: {:?}", err);
                ProgramError::InvalidAccountData
            })?;

            for (participant, score) in scores {
                if let Some(index) = quiz_state.participants.iter().position(|&x| x == participant) {
                    quiz_state.scores[index] = score;
                } else {
                    return Err(ProgramError::InvalidArgument);
                }
            }

            let total_score: u64 = quiz_state.scores.iter().sum();
            if total_score == 0 {
                return Err(ProgramError::InvalidArgument);
            }

            for (i, participant) in quiz_state.participants.iter().enumerate() {
                let share = quiz_state.scores[i] * quiz_state.pot / total_score;
                let participant_account = accounts_iter.find(|&acc| acc.key == participant).ok_or(ProgramError::InvalidAccountData)?;
                **participant_account.lamports.borrow_mut() += share;
            }

            quiz_state.pot = 0;

            quiz_state.serialize(&mut &mut quiz_state_account.data.borrow_mut()[..]).map_err(|err| {
                msg!("Failed to serialize QuizState: {:?}", err);
                ProgramError::InvalidAccountData
            })?;
            msg!("Scores set and SOL distributed based on scores!");

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
