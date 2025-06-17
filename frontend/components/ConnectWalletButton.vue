<template>
  <div class="wallet-connection">
    <v-btn
      v-if="!walletAddress"
      color="primary"
      variant="outlined"
      @click="handleConnectWallet"
      :loading="isConnecting"
      :disabled="isConnecting"
      rounded="lg"
      size="large"
    >
      <v-icon left>{{ mdiWallet }}</v-icon>
      Connect Wallet
    </v-btn>
    
    <v-menu v-else>
      <template v-slot:activator="{ props }">
        <v-btn
          variant="outlined"
          color="green"
          rounded="lg" 
          size="large"
          v-bind="props"
        >
          <template v-slot:prepend>
            <v-icon>{{ mdiCheckCircle }}</v-icon>
          </template>
          <span class="wallet-info">
            {{ formatAddress(walletAddress) }} | {{ balance.toFixed(3) }} SOL
          </span>
        </v-btn>
      </template>
      
      <v-list>
        <v-list-item @click="handleDisconnectWallet">
          <template v-slot:prepend>
            <v-icon>{{ mdiLogout }}</v-icon>
          </template>
          <v-list-item-title>接続解除</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { 
  mdiWallet, 
  mdiCheckCircle, 
  mdiLogout 
} from '@mdi/js'

const { walletAddress, balance, connectWallet, disconnectWallet } = useWallet()

const isConnecting = ref(false)
const isDisconnecting = ref(false)

const handleConnectWallet = async () => {
  isConnecting.value = true
  try {
    await connectWallet()
  } catch (error) {
    console.error('Connect wallet error:', error)
  } finally {
    isConnecting.value = false
  }
}

const handleDisconnectWallet = async () => {
  isDisconnecting.value = true
  try {
    await disconnectWallet()
  } catch (error) {
    console.error('Disconnect wallet error:', error)
  } finally {
    isDisconnecting.value = false
  }
}

const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}
</script>

<style scoped>
.wallet-connection {
  display: flex;
  align-items: center;
}

.wallet-info {
  font-family: monospace;
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .wallet-info {
    font-size: 0.75rem;
  }
}
</style>
