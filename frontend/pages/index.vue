<template>
    <v-app>
        <v-app-bar app>
            <v-toolbar-title>プロンプト探偵</v-toolbar-title>
            <v-spacer></v-spacer>
            <connectWalletButton />
        </v-app-bar>
        <v-main>
            <v-container>
                <v-row>
                    <v-col cols="12">
                        <h1>Home Page</h1>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="3">
                        <v-card>
                            <v-card-title>Advertisement</v-card-title>
                            <v-card-text>
                                <!-- Advertisement content -->
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="6">
                        <!--
                        <v-img src="path/to/your/image.jpg" aspect-ratio="1.77"></v-img>
                    -->
                        <v-img
                            lazy-src="https://oaidalleapiprodscus.blob.core.windows.net/private/org-WZB1pNkPUHzh6UvEIAbkeSpi/user-5riXo2d62EoWc13ZqQ7FDjQE/img-prxolspv0ltdoBIQrsmyATHO.png?st=2024-06-12T07%3A31%3A04Z&se=2024-06-12T09%3A31%3A04Z&sp=r&sv=2023-11-03&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2024-06-11T19%3A02%3A36Z&ske=2024-06-12T19%3A02%3A36Z&sks=b&skv=2023-11-03&sig=qLE4rmyQH3zjeHkpCaoHmU4aGA%2BqoGslnEEQfasoA9o%3D"
                            src="https://oaidalleapiprodscus.blob.core.windows.net/private/org-WZB1pNkPUHzh6UvEIAbkeSpi/user-5riXo2d62EoWc13ZqQ7FDjQE/img-prxolspv0ltdoBIQrsmyATHO.png?st=2024-06-12T07%3A31%3A04Z&se=2024-06-12T09%3A31%3A04Z&sp=r&sv=2023-11-03&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2024-06-11T19%3A02%3A36Z&ske=2024-06-12T19%3A02%3A36Z&sks=b&skv=2023-11-03&sig=qLE4rmyQH3zjeHkpCaoHmU4aGA%2BqoGslnEEQfasoA9o%3D""
                            >


                        </v-img>
                        

                        <v-form @submit.prevent=" submitForm">
                            <v-text-field v-model="input" label="Input"></v-text-field>
                            <v-btn type="submit">Submit</v-btn>
                            </v-form>
                    </v-col>
                    <v-col cols="3">
                        <v-card>
                            <v-card-title>Summary Information</v-card-title>
                            <v-card-text>
                                <!-- Summary and details about the image -->
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-container>
        </v-main>
    </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
    TransactionInstruction,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    Connection,
    Account
} from '@solana/web3.js';

import connectWalletButton from '~/components/ConnectWalletButton'

const { $solana } = useNuxtApp()

const input = ref('')

const connectWallet = async () => {
    try {
        const { solana } = window as any
        console.log('aaa')
        console.log(solana)
        if (solana && solana.isPhantom) {
            await solana.connect()
            console.log('Connected to wallet:', solana.publicKey.toString())
        } else {
            alert('Solana wallet not found. Please install Phantom wallet.')
        }
    } catch (error) {
        console.error('Error connecting to wallet:', error)
    }
}

const test = (connection, account) => {
    const instruction = new TransactionInstruction({
        keys: [],
        // sampleプログラムのID
        programId: new PublicKey('63687Zt1ikkr3ZPTdvPZ6qpbThnWzkzkgqubKVcYFLoE'),
        data: '',
    });
    console.log("account:", account.publicKey.toBase58())
    sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [account],
        {
            skipPreflight: true,
            commitment: "confirmed",
        },
    ).then(() => { console.log("done 20240610") }).catch((e) => (console.log('error', e)));
}


const submitForm = async () => {
    console.log('Form submitted with input:', input.value);

    // プログラムを実行するためのアカウント作成
    const account = new Account();
    const lamports = 2 * 1000000000;

    try {
        await requestAirdropWithRetry(account.publicKey, lamports);
        console.log("test airdrop done 20240610");
        test($solana.connection, account);
    } catch (e) {
        console.error('Error in submitForm:', e);
    }
}

const requestAirdropWithRetry = async (publicKey, lamports, retries = 5, delay = 500) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i + 1}: Requesting airdrop...`);
            const signature = await $solana.connection.requestAirdrop(publicKey, lamports);
            await $solana.connection.confirmTransaction(signature);
            return;
        } catch (e) {
            if (i < retries - 1) {
                console.log(`Server responded with 429. Retrying after ${delay}ms delay...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw e;
            }
        }
    }
}

</script>

<style scoped>
/* Add any custom styles here */
</style>
