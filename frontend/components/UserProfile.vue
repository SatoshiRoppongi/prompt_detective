<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon left>{{ mdiAccount }}</v-icon>
      プロフィール
      <v-spacer></v-spacer>
      <v-chip 
        :color="getRankColor(userRank)"
        dark
        small
      >
        {{ userRank }}
      </v-chip>
    </v-card-title>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <div class="mt-2">プロフィールを読み込み中...</div>
    </div>

    <!-- Error State -->
    <v-alert v-if="error" type="error" dense class="ma-4">
      {{ error }}
    </v-alert>

    <!-- Profile Content -->
    <div v-if="profile && !isLoading">
      <v-tabs v-model="activeTab">
        <v-tab>概要</v-tab>
        <v-tab>統計</v-tab>
        <v-tab>履歴</v-tab>
        <v-tab>実績</v-tab>
        <v-tab>設定</v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab">
        <!-- Overview Tab -->
        <v-tab-item>
          <v-card-text>
            <v-row>
              <!-- User Info -->
              <v-col cols="12" sm="12" md="6">
                <v-card outlined>
                  <v-card-title class="text-h6">ユーザー情報</v-card-title>
                  <v-card-text>
                    <div class="mb-2">
                      <strong>名前:</strong> {{ profile.user.name || 'Anonymous' }}
                    </div>
                    <div class="mb-2">
                      <strong>ウォレット:</strong>
                      <span class="text-caption d-block d-sm-inline">{{ formatWalletAddress(profile.user.walletAddress) }}</span>
                    </div>
                    <div class="mb-2">
                      <strong>レベル:</strong> {{ userLevel }}
                      <v-progress-linear
                        :value="nextLevelProgress"
                        color="primary"
                        height="8"
                        class="mt-1"
                      ></v-progress-linear>
                      <div class="text-caption">次のレベルまで {{ Math.ceil((userLevel * 5 - stats.totalQuizzes)) }} クイズ</div>
                    </div>
                    <div class="mb-2">
                      <strong>参加日:</strong> {{ formatDate(profile.user.createdAt) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Quick Stats -->
              <v-col cols="12" sm="12" md="6">
                <v-card outlined>
                  <v-card-title class="text-h6">パフォーマンス概要</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="6" sm="3" md="6">
                        <div class="text-center">
                          <div class="text-h4 primary--text">{{ stats.totalQuizzes }}</div>
                          <div class="text-caption">参加クイズ数</div>
                        </div>
                      </v-col>
                      <v-col cols="6" sm="3" md="6">
                        <div class="text-center">
                          <div class="text-h4 success--text">{{ stats.totalWins }}</div>
                          <div class="text-caption">勝利数</div>
                        </div>
                      </v-col>
                      <v-col cols="6" sm="3" md="6">
                        <div class="text-center">
                          <div class="text-h4" :class="`${getWinRateColor(stats.winRate)}--text`">
                            {{ formatPercentage(stats.winRate) }}
                          </div>
                          <div class="text-caption">勝率</div>
                        </div>
                      </v-col>
                      <v-col cols="6" sm="3" md="6">
                        <div class="text-center">
                          <div class="text-h4" :class="getProfitColor(stats.netProfit)">
                            {{ formatCurrency(stats.netProfit) }}
                          </div>
                          <div class="text-caption">純利益</div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Recent Performance -->
              <v-col cols="12" v-if="recentPerformance">
                <v-card outlined>
                  <v-card-title class="text-h6">最近のパフォーマンス (直近5戦)</v-card-title>
                  <v-card-text>
                    <div class="d-flex flex-column flex-sm-row align-start align-sm-center">
                      <div class="mr-sm-4 mb-1 mb-sm-0">
                        <strong>{{ recentPerformance.wins }}/{{ recentPerformance.total }} 勝利</strong>
                      </div>
                      <div class="mr-sm-4 mb-1 mb-sm-0">
                        <strong>勝率: {{ formatPercentage(recentPerformance.winRate) }}</strong>
                      </div>
                      <div>
                        <strong>平均スコア: {{ recentPerformance.averageScore.toFixed(1) }}</strong>
                      </div>
                    </div>
                    <v-progress-linear
                      :value="recentPerformance.winRate"
                      :color="getWinRateColor(recentPerformance.winRate)"
                      height="8"
                      class="mt-2"
                    ></v-progress-linear>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-tab-item>

        <!-- Statistics Tab -->
        <v-tab-item>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="12" md="6">
                <v-card outlined>
                  <v-card-title class="text-h6">ゲーム統計</v-card-title>
                  <v-card-text>
                    <div class="stat-item">
                      <span>参加クイズ数:</span>
                      <span class="font-weight-bold">{{ stats.totalQuizzes }}</span>
                    </div>
                    <div class="stat-item">
                      <span>勝利数:</span>
                      <span class="font-weight-bold success--text">{{ stats.totalWins }}</span>
                    </div>
                    <div class="stat-item">
                      <span>勝率:</span>
                      <span class="font-weight-bold" :class="`${getWinRateColor(stats.winRate)}--text`">
                        {{ formatPercentage(stats.winRate) }}
                      </span>
                    </div>
                    <div class="stat-item">
                      <span>最高スコア:</span>
                      <span class="font-weight-bold" :class="`${getScoreColor(stats.bestScore)}--text`">
                        {{ stats.bestScore }}
                      </span>
                    </div>
                    <div class="stat-item">
                      <span>平均スコア:</span>
                      <span class="font-weight-bold">{{ stats.averageScore.toFixed(1) }}</span>
                    </div>
                    <div class="stat-item">
                      <span>現在の連勝:</span>
                      <span class="font-weight-bold warning--text">{{ stats.currentStreak }}</span>
                    </div>
                    <div class="stat-item">
                      <span>最高連勝:</span>
                      <span class="font-weight-bold warning--text">{{ stats.bestStreak }}</span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" sm="12" md="6">
                <v-card outlined>
                  <v-card-title class="text-h6">財務統計</v-card-title>
                  <v-card-text>
                    <div class="stat-item">
                      <span>総ベット額:</span>
                      <span class="font-weight-bold">{{ formatCurrency(stats.totalBets) }}</span>
                    </div>
                    <div class="stat-item">
                      <span>総獲得額:</span>
                      <span class="font-weight-bold success--text">{{ formatCurrency(stats.totalWinnings) }}</span>
                    </div>
                    <div class="stat-item">
                      <span>純利益:</span>
                      <span class="font-weight-bold" :class="getProfitColor(stats.netProfit)">
                        {{ formatCurrency(stats.netProfit) }}
                      </span>
                    </div>
                    <div class="stat-item">
                      <span>ROI:</span>
                      <span class="font-weight-bold" :class="getProfitColor(stats.netProfit)">
                        {{ formatPercentage(stats.totalBets > 0 ? (stats.netProfit / stats.totalBets) * 100 : 0) }}
                      </span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-tab-item>

        <!-- History Tab -->
        <v-tab-item>
          <v-card-text>
            <div class="d-flex flex-column flex-sm-row align-center mb-4">
              <v-text-field
                v-model="historySearch"
                label="検索"
                prepend-inner-icon="mdi-magnify"
                outlined
                dense
                clearable
                class="mr-sm-4 mb-2 mb-sm-0"
                style="width: 100%;"
              ></v-text-field>
              <v-btn
                @click="refreshHistory"
                color="primary"
                outlined
                :loading="isLoadingHistory"
                class="flex-shrink-0"
              >
                <v-icon left>{{ mdiRefresh }}</v-icon>
                更新
              </v-btn>
            </div>

            <v-data-table
              :headers="historyHeaders"
              :items="filteredHistory"
              :loading="isLoadingHistory"
              class="elevation-1"
              :items-per-page="10"
              mobile-breakpoint="960"
              :hide-default-footer="$vuetify.breakpoint.xs"
            >
              <template v-slot:item.isWinner="{ item }">
                <v-chip 
                  :color="item.isWinner ? 'success' : 'error'"
                  small
                  dark
                >
                  {{ item.isWinner ? '勝利' : '敗北' }}
                </v-chip>
              </template>

              <template v-slot:item.score="{ item }">
                <span :class="`${getScoreColor(item.score)}--text font-weight-bold`">
                  {{ item.score }}
                </span>
              </template>

              <template v-slot:item.rank="{ item }">
                <v-chip 
                  :color="getRankChipColor(item.rank, item.totalParticipants)"
                  small
                  dark
                >
                  {{ item.rank }}/{{ item.totalParticipants }}
                </v-chip>
              </template>

              <template v-slot:item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-tab-item>

        <!-- Achievements Tab -->
        <v-tab-item>
          <v-card-text>
            <div v-if="achievements.length === 0" class="text-center pa-8">
              <v-icon size="64" color="grey">{{ mdiTrophy }}</v-icon>
              <div class="text-h6 mt-2">実績がありません</div>
              <div class="text-caption">クイズに参加して実績を解除しましょう！</div>
            </div>

            <v-row v-else>
              <v-col 
                v-for="achievement in achievements" 
                :key="achievement.id"
                cols="12" 
                sm="6"
                md="6" 
                lg="4"
              >
                <v-card 
                  outlined
                  :color="getRarityColor(achievement.rarity)"
                  dark
                >
                  <v-card-text class="text-center">
                    <v-icon size="48" class="mb-2">{{ achievement.icon }}</v-icon>
                    <div class="text-h6">{{ achievement.name }}</div>
                    <div class="text-caption">{{ achievement.description }}</div>
                    <v-chip 
                      :color="getRarityColor(achievement.rarity)"
                      dark
                      small
                      class="mt-2"
                    >
                      {{ getRarityText(achievement.rarity) }}
                    </v-chip>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-tab-item>

        <!-- Settings Tab -->
        <v-tab-item>
          <v-card-text>
            <v-form @submit.prevent="savePreferences">
              <v-row>
                <v-col cols="12" sm="12" md="6">
                  <v-card outlined>
                    <v-card-title class="text-h6">表示設定</v-card-title>
                    <v-card-text>
                      <v-select
                        v-model="localPreferences.theme"
                        :items="themeOptions"
                        label="テーマ"
                        outlined
                        dense
                      ></v-select>

                      <v-select
                        v-model="localPreferences.language"
                        :items="languageOptions"
                        label="言語"
                        outlined
                        dense
                      ></v-select>

                      <v-select
                        v-model="localPreferences.timezone"
                        :items="timezoneOptions"
                        label="タイムゾーン"
                        outlined
                        dense
                      ></v-select>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" sm="12" md="6">
                  <v-card outlined>
                    <v-card-title class="text-h6">通知設定</v-card-title>
                    <v-card-text>
                      <v-switch
                        v-model="localPreferences.notifications"
                        label="通知を有効にする"
                      ></v-switch>

                      <v-switch
                        v-model="localPreferences.emailNotifications"
                        label="メール通知"
                        :disabled="!localPreferences.notifications"
                      ></v-switch>

                      <v-switch
                        v-model="localPreferences.soundEffects"
                        label="効果音"
                      ></v-switch>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12">
                  <v-btn
                    type="submit"
                    color="primary"
                    :loading="isSavingPreferences"
                  >
                    <v-icon left>{{ mdiContentSave }}</v-icon>
                    設定を保存
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-tab-item>
      </v-tabs-items>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useUserProfile } from '~/composables/useUserProfile'
import { useWallets } from '~/composables/useWallets'
import { 
  mdiAccount,
  mdiRefresh,
  mdiTrophy,
  mdiContentSave
} from '@mdi/js'

const props = defineProps<{
  walletAddress?: string
}>()

const {
  profile,
  stats,
  history,
  achievements,
  isLoading,
  isLoadingHistory,
  error,
  userRank,
  userLevel,
  nextLevelProgress,
  recentPerformance,
  fetchUserProfile,
  fetchUserHistory,
  updateUserPreferences,
  formatCurrency,
  formatPercentage,
  formatDate,
  getScoreColor,
  getWinRateColor,
  getRarityColor
} = useUserProfile()

const { walletAddress: currentWallet } = useWallets()

// Reactive state
const activeTab = ref(0)
const historySearch = ref('')
const isSavingPreferences = ref(false)
const localPreferences = ref({
  notifications: true,
  theme: 'auto' as const,
  language: 'ja',
  timezone: 'Asia/Tokyo',
  emailNotifications: false,
  soundEffects: true,
})

// Options
const themeOptions = [
  { text: 'ライト', value: 'light' },
  { text: 'ダーク', value: 'dark' },
  { text: '自動', value: 'auto' }
]

const languageOptions = [
  { text: '日本語', value: 'ja' },
  { text: 'English', value: 'en' }
]

const timezoneOptions = [
  { text: '東京', value: 'Asia/Tokyo' },
  { text: 'UTC', value: 'UTC' }
]

const historyHeaders = [
  { text: '結果', value: 'isWinner', sortable: false },
  { text: 'スコア', value: 'score' },
  { text: '順位', value: 'rank', sortable: false },
  { text: 'ベット', value: 'bet' },
  { text: '獲得', value: 'winnings' },
  { text: '日時', value: 'createdAt' }
]

// Computed
const targetWallet = computed(() => {
  return props.walletAddress || currentWallet.value
})

const filteredHistory = computed(() => {
  if (!historySearch.value) return history.value
  
  const search = historySearch.value.toLowerCase()
  return history.value.filter(item => 
    item.guessPrompt.toLowerCase().includes(search) ||
    item.secretPrompt.toLowerCase().includes(search)
  )
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

const getRankChipColor = (rank: number, total: number) => {
  const ratio = rank / total
  if (ratio <= 0.1) return 'success'
  if (ratio <= 0.3) return 'warning'
  return 'error'
}

const getRarityText = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return '伝説'
    case 'epic': return 'エピック'
    case 'rare': return 'レア'
    case 'common': return 'コモン'
    default: return rarity
  }
}

const refreshHistory = async () => {
  if (targetWallet.value) {
    await fetchUserHistory(targetWallet.value, 50)
  }
}

const savePreferences = async () => {
  if (!targetWallet.value) return
  
  isSavingPreferences.value = true
  try {
    await updateUserPreferences(targetWallet.value, localPreferences.value)
  } finally {
    isSavingPreferences.value = false
  }
}

// Watchers
watch(() => targetWallet.value, async (newWallet) => {
  if (newWallet) {
    await fetchUserProfile(newWallet)
  }
}, { immediate: true })

watch(() => profile.value?.user.preferences, (newPreferences) => {
  if (newPreferences) {
    localPreferences.value = { ...newPreferences }
  }
}, { deep: true })

// Lifecycle
onMounted(async () => {
  if (targetWallet.value) {
    await fetchUserProfile(targetWallet.value)
  }
})
</script>

<style scoped>
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.stat-item:last-child {
  border-bottom: none;
}

/* Mobile specific styles */
@media (max-width: 600px) {
  .text-h4 {
    font-size: 1.5rem !important;
  }
  
  .text-h6 {
    font-size: 1.1rem !important;
  }
  
  .v-card-title {
    padding: 12px 16px !important;
  }
  
  .v-card-text {
    padding: 8px 16px !important;
  }
  
  .stat-item {
    padding: 6px 0;
    font-size: 0.875rem;
  }
}

/* Tablet specific styles */
@media (min-width: 601px) and (max-width: 960px) {
  .text-h4 {
    font-size: 1.75rem !important;
  }
}

/* Ensure tabs are scrollable on mobile */
@media (max-width: 600px) {
  .v-tabs {
    overflow-x: auto;
  }
  
  .v-tab {
    min-width: 80px;
    font-size: 0.875rem;
  }
}
</style>