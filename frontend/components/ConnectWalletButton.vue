<template>
  <v-menu>
    <template v-slot:activator="{ props }">
      <v-btn @click="connectWallet" rounded="lg" size="x-large" v-bind="props">
        <template v-if="walletAddress" v-slot:prepend>
          {{ balance }} sol
          <Identicon :value="walletAddress" :size="20" />
        </template>
        <template v-if="!walletAddress" v-slot:default>
          Connect Wallet
        </template>
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        v-for="(item, index) in items"
        :key="index"
        :value="index"
        @click="handleClick(index, item)"
      >
        <v-list-item-title>{{ item.title }} </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { useWallet } from "~/composables/useWallets";

const { walletAddress, balance, connectWallet, disconnectWallet } = useWallet();

const items = ref([
  { title: "click me" },
  { title: "click me2" },
  { title: "click me3" },
  { key: "disconnect", title: "接続解除" },
]);

const handleClick = async (index: number, item: any) => {
  const key = item.key;
  switch (key) {
    case "disconnect":
      await disconnectWallet();
      break;

    default:
      break;
  }
};
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
