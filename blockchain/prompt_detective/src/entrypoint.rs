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
    InitializeQuizState,
    JoinQuiz { bet: u64, fee: u64 },
    Distributes { scores: Vec<(Pubkey, u64)> },
}

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Instruction data length: {}", instruction_data.len());
    msg!("Instruction data: {:?}", instruction_data);

    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    match instruction_data[0] {
        0 => initialize_quiz_state(accounts, &instruction_data[1..]),
        1 => join_quiz(program_id, accounts, &instruction_data[1..]),
        2 => distribute_scores(accounts, &instruction_data[1..]),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn initialize_quiz_state(accounts: &[AccountInfo], _data: &[u8]) -> ProgramResult {
    msg!("Initializing QuizState");
    let accounts_iter = &mut accounts.iter();
    let quiz_state_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;

    if !quiz_state_account.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let rent = Rent::get()?;
    if !rent.is_exempt(quiz_state_account.lamports(), quiz_state_account.data_len()) {
        return Err(ProgramError::AccountNotRentExempt);
    }

    let quiz_state = QuizState {
        participants: Vec::new(),
        pot: 0,
        scores: Vec::new(),
        fee_pot: 0,
    };

    quiz_state.serialize(&mut &mut quiz_state_account.data.borrow_mut()[..])?;
    msg!("QuizState initialized successfully");
    Ok(())
}

fn join_quiz(_program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    msg!("JoinQuiz instruction received");
    let accounts_iter = &mut accounts.iter();
    let participant_account = next_account_info(accounts_iter)?;
    let quiz_state_account = next_account_info(accounts_iter)?;
    // let _system_program = next_account_info(accounts_iter)?;
    
    let JoinQuizData { bet, fee } = JoinQuizData::try_from_slice(data)?;
    msg!("Bet: {}, Fee: {}", bet, fee);

    // 参加者がトランザクションに署名していることを確認
    if !participant_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // quiz_stateのデータを取得
    let mut quiz_state = QuizState::try_from_slice(&quiz_state_account.data.borrow())?;

    // participantsにparticipant_accountのkeyを追加
    quiz_state.participants.push(*participant_account.key);

    // scoresに0をpush
    quiz_state.scores.push(0);

    // potにbetを加算
    quiz_state.pot = quiz_state.pot.checked_add(bet).ok_or(ProgramError::ArithmeticOverflow)?;

    // fee_potにfeeを加算
    quiz_state.fee_pot = quiz_state.fee_pot.checked_add(fee).ok_or(ProgramError::ArithmeticOverflow)?;

    // betとfeeの合計を計算
    let total_transfer = bet.checked_add(fee).ok_or(ProgramError::ArithmeticOverflow)?;

    // SOLの転送を実行
    **participant_account.try_borrow_mut_lamports()? = participant_account.lamports()
        .checked_sub(total_transfer)
        .ok_or(ProgramError::InsufficientFunds)?;

    **quiz_state_account.try_borrow_mut_lamports()? = quiz_state_account.lamports()
        .checked_add(total_transfer)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // 更新されたquiz_stateを保存
    quiz_state.serialize(&mut &mut quiz_state_account.data.borrow_mut()[..])?;

    msg!("Participant joined the quiz successfully");
    Ok(())
}

fn distribute_scores(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    msg!("Distributes instruction received");
    let accounts_iter = &mut accounts.iter();
    let quiz_state_account = next_account_info(accounts_iter)?;
    let DistributesData { scores } = DistributesData::try_from_slice(data)?;
    msg!("Scores: {:?}", scores);

    // クイズの状態を取得
    let mut quiz_state = QuizState::try_from_slice(&quiz_state_account.data.borrow())?;

    // 総スコアを計算
    let total_score: u64 = scores.iter().map(|(_, score)| score).sum();

    // 各参加者の報酬を計算し、転送する
    for (pubkey, score) in scores.iter() {
        let participant_account = next_account_info(accounts_iter)?;
        if participant_account.key != pubkey {
            return Err(ProgramError::InvalidAccountData);
        }

        // 参加者の元の掛け金を取得
        let original_bet = quiz_state.pot / quiz_state.participants.len() as u64;

        // スコアに基づいて報酬を計算
        let reward = if total_score > 0 {
            (quiz_state.pot as f64 * (*score as f64 / total_score as f64)) as u64
        } else {
            original_bet // 全員のスコアが0の場合、元の掛け金を返す
        };

        // 報酬を転送
        **quiz_state_account.try_borrow_mut_lamports()? = quiz_state_account.lamports()
            .checked_sub(reward)
            .ok_or(ProgramError::InsufficientFunds)?;

        **participant_account.try_borrow_mut_lamports()? = participant_account.lamports()
            .checked_add(reward)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        msg!("Distributed {} lamports to {}", reward, pubkey);
    }

    // クイズの状態をリセット
    quiz_state.participants.clear();
    quiz_state.scores.clear();
    quiz_state.pot = 0;

    // 更新されたquiz_stateを保存
    quiz_state.serialize(&mut &mut quiz_state_account.data.borrow_mut()[..])?;

    msg!("Scores distributed successfully");
    Ok(())
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
struct JoinQuizData {
    bet: u64,
    fee: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
struct DistributesData {
    scores: Vec<(Pubkey, u64)>,
}