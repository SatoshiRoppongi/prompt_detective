<template>
    <v-btn @click="connectWallet" rounded="lg" size="x-large">
        <template v-if="walletAddress" v-slot:prepend>
            <Identicon :value="walletAddress" size="20" />
            {{ balance }} SOL
        </template>
        <template v-if="!walletAddress" v-slot:default>
            Connect Wallet
        </template>
    </v-btn>
</template>

<script setup lang="ts">
import { useWallet } from '~/composables/useWallets'

const { walletAddress, balance, connectWallet } = useWallet()
console.log('test')
console.log(balance.value)

</script>

<style scoped>
button {
    padding: 10px 20px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

button:hover {
    background-color: #2563eb;
}
</style>
