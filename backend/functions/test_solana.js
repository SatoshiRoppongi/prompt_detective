// Simple test for Solana service without full toolchain
const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");

async function testSolanaConnection() {
  console.log("🔍 Testing Solana connection...");
  
  try {
    // Test devnet connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const version = await connection.getVersion();
    console.log("✅ Connected to Solana devnet");
    console.log("📋 Solana version:", version);
    
    // Test if our program ID is valid
    const programId = "CEbjWJ1jmh5VfpPFJdvwk8HrLFFZEW1f1YQDZ2SfZCVC";
    const programPubkey = new PublicKey(programId);
    console.log("✅ Program ID is valid:", programPubkey.toBase58());
    
    // Test PDA generation
    const gameId = "test-game-123";
    const [gamePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(gameId)],
      programPubkey
    );
    console.log("✅ Generated PDA:", gamePda.toBase58());
    console.log("📋 PDA bump:", bump);
    
    // Check if program exists on devnet (it probably doesn't yet)
    const accountInfo = await connection.getAccountInfo(programPubkey);
    if (accountInfo) {
      console.log("✅ Program account found on devnet");
      console.log("📋 Program data length:", accountInfo.data.length);
    } else {
      console.log("⚠️  Program not deployed to devnet yet (expected)");
    }
    
  } catch (error) {
    console.error("❌ Solana connection test failed:", error.message);
  }
}

async function testGamePDAGeneration() {
  console.log("\n🎮 Testing game PDA generation...");
  
  const programId = new PublicKey("CEbjWJ1jmh5VfpPFJdvwk8HrLFFZEW1f1YQDZ2SfZCVC");
  const gameIds = ["game-1", "game-2", "test-game-abc"];
  
  for (const gameId of gameIds) {
    const [gamePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(gameId)],
      programId
    );
    console.log(`Game ID: ${gameId} -> PDA: ${gamePda.toBase58()} (bump: ${bump})`);
  }
}

async function runTests() {
  console.log("🚀 Starting Solana integration tests...\n");
  
  await testSolanaConnection();
  await testGamePDAGeneration();
  
  console.log("\n✅ Solana integration tests completed!");
  console.log("💡 Next steps:");
  console.log("   1. Install Solana CLI to deploy the program");
  console.log("   2. Deploy program to devnet");
  console.log("   3. Update environment variables with deployed program ID");
  console.log("   4. Test full backend integration");
}

runTests().catch(console.error);