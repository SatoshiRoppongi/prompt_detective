<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-avatar class="mr-3" :color="getRankColor(userRank)" size="40">
        <v-icon dark>{{ mdiAccount }}</v-icon>
      </v-avatar>
      <div>
        <div class="text-h6">{{ userName }}</div>
        <div class="text-caption">{{ formatWalletAddress(walletAddress) }}</div>
      </div>
      <v-spacer></v-spacer>
      <v-chip 
        :color="getRankColor(userRank)"
        dark
        small
      >
        Lv.{{ userLevel }} {{ userRank }}
      </v-chip>
    </v-card-title>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
    </div>

    <!-- Stats Grid -->
    <v-card-text v-else-if="stats">
      <v-row>
        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5 primary--text">{{ stats.totalQuizzes }}</div>
            <div class="text-caption">参加数</div>
          </div>
        </v-col>
        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5 success--text">{{ stats.totalWins }}</div>
            <div class="text-caption">勝利数</div>
          </div>
        </v-col>
        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5" :class="`${getWinRateColor(stats.winRate)}--text`">
              {{ formatPercentage(stats.winRate) }}
            </div>
            <div class="text-caption">勝率</div>
          </div>
        </v-col>
        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5" :class="getProfitColor(stats.netProfit)">
              {{ formatCurrency(stats.netProfit) }}
            </div>
            <div class="text-caption">純利益</div>
          </div>
        </v-col>
      </v-row>

      <!-- Level Progress -->
      <div class="mt-3">
        <div class="d-flex justify-space-between text-caption mb-1">
          <span>レベル {{ userLevel }}</span>
          <span>{{ nextLevelProgress.toFixed(0) }}%</span>
        </div>
        <v-progress-linear
          :value="nextLevelProgress"
          color="primary"
          height="6"
          rounded
        ></v-progress-linear>
      </div>

      <!-- Recent Performance -->
      <div v-if="recentPerformance && showRecentPerformance" class="mt-3">
        <v-divider class="mb-2"></v-divider>
        <div class="text-caption mb-1">最近のパフォーマンス (直近5戦)</div>
        <div class="d-flex align-center">
          <v-chip
            :color="getWinRateColor(recentPerformance.winRate)"
            dark
            small
            class="mr-2"
          >
            {{ recentPerformance.wins }}/{{ recentPerformance.total }}
          </v-chip>
          <span class="text-caption">
            平均スコア: {{ recentPerformance.averageScore.toFixed(1) }}
          </span>
        </div>
      </div>

      <!-- Action Button -->
      <div v-if="showViewProfile" class="mt-3">
        <v-btn
          @click="$emit('view-profile')"
          color="primary"
          outlined
          small
          block
        >
          <v-icon left small>{{ mdiAccountDetails }}</v-icon>
          詳細プロフィール
        </v-btn>
      </div>
    </v-card-text>

    <!-- Error State -->
    <v-card-text v-else-if="error">
      <v-alert type="error" dense>
        {{ error }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserProfile } from '~/composables/useUserProfile'
import { 
  mdiAccount,
  mdiAccountDetails
} from '@mdi/js'

const props = defineProps<{
  walletAddress: string
  userName?: string
  showRecentPerformance?: boolean
  showViewProfile?: boolean
}>()

const emit = defineEmits<{
  'view-profile': []
}>()

const {
  stats,
  isLoading,
  error,
  userRank,
  userLevel,
  nextLevelProgress,
  recentPerformance,
  fetchUserStats,
  formatCurrency,
  formatPercentage,
  getWinRateColor
} = useUserProfile()

// Computed
const displayName = computed(() => {
  return props.userName || 'Anonymous'
})

// Methods
const formatWalletAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const getRankColor = (rank: string) => {
  switch (rank) {
    case 'レジェンド': return 'orange'
    case 'エキスパート': return 'purple'
    case 'ベテラン': return 'blue'
    case 'ビギナー': return 'green'
    default: return 'grey'
  }
}

const getProfitColor = (profit: number) => {
  if (profit > 0) return 'success--text'
  if (profit < 0) return 'error--text'
  return 'grey--text'
}

// Lifecycle
onMounted(async () => {
  await fetchUserStats(props.walletAddress)
})
</script>