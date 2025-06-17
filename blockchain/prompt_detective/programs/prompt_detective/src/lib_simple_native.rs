use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    program::invoke,
};

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Prompt Detective program entrypoint");
    msg!("Program ID: {}", program_id);
    msg!("Instruction data length: {}", instruction_data.len());

    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    let instruction_type = instruction_data[0];
    
    match instruction_type {
        0 => {
            msg!("Initialize instruction");
            initialize(accounts)
        }
        1 => {
            msg!("Join quiz instruction");
            join_quiz(accounts, &instruction_data[1..])
        }
        _ => {
            msg!("Unknown instruction");
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

fn initialize(_accounts: &[AccountInfo]) -> ProgramResult {
    msg!("Prompt Detective initialized successfully!");
    Ok(())
}

fn join_quiz(accounts: &[AccountInfo], instruction_data: &[u8]) -> ProgramResult {
    if instruction_data.len() < 16 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let accounts_iter = &mut accounts.iter();
    let participant = next_account_info(accounts_iter)?;
    let treasury = next_account_info(accounts_iter)?;

    if !participant.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Parse bet and fee from instruction data (little-endian u64)
    let bet_bytes: [u8; 8] = instruction_data[0..8].try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let fee_bytes: [u8; 8] = instruction_data[8..16].try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    let bet = u64::from_le_bytes(bet_bytes);
    let fee = u64::from_le_bytes(fee_bytes);

    msg!("Participant: {}", participant.key);
    msg!("Treasury: {}", treasury.key);
    msg!("Bet: {} lamports", bet);
    msg!("Fee: {} lamports", fee);

    let total_amount = bet + fee;
    msg!("Total transfer: {} lamports", total_amount);

    // Create transfer instruction
    let transfer_instruction = system_instruction::transfer(
        participant.key,
        treasury.key,
        total_amount,
    );

    // Execute the transfer
    invoke(
        &transfer_instruction,
        &[participant.clone(), treasury.clone()],
    )?;

    msg!("Quiz joined successfully! Transferred {} lamports", total_amount);
    Ok(())
}