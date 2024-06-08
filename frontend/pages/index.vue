<template>
    <v-app>
        <v-app-bar app>
            <v-toolbar-title>プロンプト探偵</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn @click="connectWallet">Connect Wallet</v-btn>
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
                        <v-form @submit.prevent="submitForm">
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

const submitForm = () => {
    // Form submission logic
    console.log('Form submitted with input:', input.value)
}
</script>

<style scoped>
/* Add any custom styles here */
</style>
