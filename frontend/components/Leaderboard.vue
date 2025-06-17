<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon left>{{ mdiTrophy }}</v-icon>
      リーダーボード
      <v-spacer></v-spacer>
      <!-- Debug: Force active game state for testing -->
      <v-btn 
        icon 
        small 
        @click="toggleTestMode"
        :color="testActiveMode ? 'green' : 'orange'"
        :title="testActiveMode ? 'Test: Disable Active Mode' : 'Test: Enable Active Mode'"
      >
        <v-icon>{{ testActiveMode ? mdiCheckCircle : mdiCog }}</v-icon>
      </v-btn>
      <v-btn 
        icon 
        small 
        @click="refresh"
        :loading="isLoading"
      >
        <v-icon>{{ mdiRefresh }}</v-icon>
      </v-btn>
    </v-card-title>
    
    <v-card-subtitle v-if="leaderboardData">
      <template v-if="isGameActive">
        総参加者: {{ leaderboardData.totalParticipants }}名 | 
        総賭け金: {{ totalBetsAmount.toFixed(2) }} SOL
        <br><small>ゲーム状態: {{ currentPhase }} (アクティブ)</small>
      </template>
      <template v-else>
        総参加者: {{ leaderboardData.totalParticipants }}名 | 
        平均スコア: {{ formatScore(leaderboardData.averageScore) }}点 |
        最高スコア: {{ formatScore(leaderboardData.topScore) }}点
        <br><small>ゲーム状態: {{ currentPhase }} (非アクティブ)</small>
      </template>
    </v-card-subtitle>
    
    <v-divider></v-divider>
    
    <!-- Loading State -->
    <v-card-text v-if="isLoading">
      <v-skeleton-loader
        v-for="i in 5"
        :key="i"
        type="list-item-avatar"
        class="mb-2"
      ></v-skeleton-loader>
    </v-card-text>
    
    <!-- Error State -->
    <v-card-text v-else-if="error">
      <v-alert type="error" dense>
        {{ error }}
      </v-alert>
    </v-card-text>
    
    <!-- Leaderboard Content -->
    <v-card-text v-else-if="leaderboardData" class="pa-0">
      <v-list dense>
        <!-- Top 10 -->
        <v-list-item
          v-for="entry in topEntries"
          :key="`top-${entry.walletAddress}`"
          :class="{
            'primary lighten-4': entry.isCurrentUser,
            'elevation-2': entry.rank <= 3
          }"
        >
          <v-list-item-avatar>
            <v-avatar 
              :color="getRankBadgeColor(entry.rank)"
              size="32"
            >
              <!-- During active games, show bet rank only -->
              <template v-if="isGameActive">
                <span class="white--text font-weight-bold">
                  {{ getBetRank(entry) }}
                </span>
              </template>
              <!-- During ended games, show ranking icons -->
              <template v-else>
                <v-icon v-if="entry.rank === 1" color="white">
                  {{ mdiTrophy }}
                </v-icon>
                <v-icon v-else-if="entry.rank <= 3" color="white">
                  {{ mdiMedal }}
                </v-icon>
                <span v-else class="white--text font-weight-bold">
                  {{ entry.rank }}
                </span>
              </template>
            </v-avatar>
          </v-list-item-avatar>
          
          <v-list-item-content>
            <v-list-item-title class="d-flex align-center">
              <span class="font-weight-bold mr-2">
                {{ formatAddress(entry.walletAddress) }}
              </span>
              <v-chip 
                v-if="entry.isCurrentUser" 
                x-small 
                color="primary"
                outlined
              >
                あなた
              </v-chip>
            </v-list-item-title>
            
            <v-list-item-subtitle>
              <div class="d-flex justify-space-between">
                <!-- During active games, hide scores -->
                <template v-if="isGameActive">
                  <span>賭け金: {{ entry.bet }} SOL ({{ formatBetPercentage(entry.bet) }})</span>
                  <span>{{ formatTime(entry.submissionTime) }}</span>
                </template>
                <!-- During ended games, show full info -->
                <template v-else>
                  <span>スコア: {{ formatScore(entry.score) }}点</span>
                  <span>賭け金: {{ entry.bet }} SOL</span>
                  <span>{{ formatTime(entry.submissionTime) }}</span>
                </template>
              </div>
            </v-list-item-subtitle>
          </v-list-item-content>
          
          <v-list-item-action>
            <!-- During active games, only allow viewing own prompt -->
            <template v-if="isGameActive">
              <v-tooltip bottom v-if="entry.isCurrentUser">
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    small
                    v-bind="attrs"
                    v-on="on"
                    @click="showPrompt(entry)"
                  >
                    <v-icon>{{ mdiEye }}</v-icon>
                  </v-btn>
                </template>
                <span>自分の回答を見る</span>
              </v-tooltip>
              <!-- Placeholder for other users during active games -->
              <v-btn v-else icon small disabled>
                <v-icon>{{ mdiEyeOff }}</v-icon>
              </v-btn>
            </template>
            <!-- During ended games, allow viewing all prompts -->
            <template v-else>
              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    small
                    v-bind="attrs"
                    v-on="on"
                    @click="showPrompt(entry)"
                  >
                    <v-icon>{{ mdiEye }}</v-icon>
                  </v-btn>
                </template>
                <span>回答を見る</span>
              </v-tooltip>
            </template>
          </v-list-item-action>
        </v-list-item>
        
        <!-- Current User (if not in displayed entries) -->
        <template v-if="shouldShowUserEntry">
          <v-divider class="my-2"></v-divider>
          <v-list-item
            class="primary lighten-4"
            :class="{ 'elevation-1': true }"
          >
            <v-list-item-avatar>
              <v-avatar color="primary" size="32">
                <span class="white--text font-weight-bold">
                  <template v-if="isGameActive">
                    {{ getBetRank(currentUserEntry) }}
                  </template>
                  <template v-else>
                    {{ currentUserEntry.rank }}
                  </template>
                </span>
              </v-avatar>
            </v-list-item-avatar>
            
            <v-list-item-content>
              <v-list-item-title class="d-flex align-center">
                <span class="font-weight-bold mr-2">
                  {{ formatAddress(currentUserEntry.walletAddress) }}
                </span>
                <v-chip x-small color="primary" outlined>
                  あなた
                </v-chip>
              </v-list-item-title>
              
              <v-list-item-subtitle>
                <div class="d-flex justify-space-between">
                  <template v-if="isGameActive">
                    <span>賭け金: {{ currentUserEntry.bet }} SOL ({{ formatBetPercentage(currentUserEntry.bet) }})</span>
                    <span>{{ formatTime(currentUserEntry.submissionTime) }}</span>
                  </template>
                  <template v-else>
                    <span>スコア: {{ formatScore(currentUserEntry.score) }}点</span>
                    <span>賭け金: {{ currentUserEntry.bet }} SOL</span>
                    <span>{{ formatTime(currentUserEntry.submissionTime) }}</span>
                  </template>
                </div>
              </v-list-item-subtitle>
            </v-list-item-content>
            
            <v-list-item-action>
              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    small
                    v-bind="attrs"
                    v-on="on"
                    @click="showPrompt(currentUserEntry)"
                  >
                    <v-icon>{{ mdiEye }}</v-icon>
                  </v-btn>
                </template>
                <span>自分の回答を見る</span>
              </v-tooltip>
            </v-list-item-action>
          </v-list-item>
        </template>
      </v-list>
    </v-card-text>
    
    <!-- No Data State -->
    <v-card-text v-else>
      <v-alert type="info" dense>
        まだ参加者がいません
      </v-alert>
    </v-card-text>
  </v-card>
  
  <!-- Prompt Dialog -->
  <v-dialog v-model="promptDialog" max-width="500px">
    <v-card v-if="selectedEntry">
      <v-card-title>
        <template v-if="selectedEntry.isCurrentUser">
          あなたの回答
        </template>
        <template v-else>
          {{ formatAddress(selectedEntry.walletAddress) }} の回答
        </template>
      </v-card-title>
      
      <v-card-text>
        <v-textarea
          :value="selectedEntry.guessPrompt"
          readonly
          outlined
          label="予想したプロンプト"
          rows="3"
        ></v-textarea>
        
        <div class="mt-2">
          <!-- During active games, hide score information -->
          <template v-if="isGameActive">
            <strong>賭け金:</strong> {{ selectedEntry.bet }} SOL ({{ formatBetPercentage(selectedEntry.bet) }})<br>
            <strong>ベット順位:</strong> {{ getBetRank(selectedEntry) }}位<br>
            <strong>投稿時刻:</strong> {{ formatTime(selectedEntry.submissionTime) }}
          </template>
          <!-- During ended games, show full information -->
          <template v-else>
            <strong>スコア:</strong> {{ formatScore(selectedEntry.score) }}点<br>
            <strong>順位:</strong> {{ selectedEntry.rank }}位<br>
            <strong>賭け金:</strong> {{ selectedEntry.bet }} SOL<br>
            <strong>投稿時刻:</strong> {{ formatTime(selectedEntry.submissionTime) }}
          </template>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="promptDialog = false">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLeaderboard } from '~/composables/useLeaderboard'
import { 
  mdiTrophy, 
  mdiRefresh, 
  mdiMedal, 
  mdiAccount, 
  mdiEye,
  mdiEyeOff,
  mdiCog,
  mdiCheckCircle
} from '@mdi/js'

interface Props {
  quizId: string
  walletAddress?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 30000 // 30 seconds
})

// Test mode for simulating active game state (must be defined before useLeaderboard)
const testActiveMode = ref(false)

const {
  leaderboardData,
  isLoading,
  error,
  topEntries,
  currentUserEntry,
  isUserInTop10,
  shouldShowUserEntry,
  isGameActive,
  isGameEnded,
  fetchLeaderboard,
  formatAddress,
  formatScore,
  formatTime,
  getRankBadgeColor,
  getBetRank,
  formatBetPercentage
} = useLeaderboard(props.quizId, testActiveMode)

const { currentPhase } = useGameState()

const promptDialog = ref(false)
const selectedEntry = ref(null)
let refreshTimer: NodeJS.Timeout | null = null

// Computed property for total bets
const totalBetsAmount = computed(() => {
  if (!leaderboardData.value) return 0
  return leaderboardData.value.entries.reduce((sum, entry) => sum + entry.bet, 0)
})

const refresh = async () => {
  await fetchLeaderboard(props.quizId, props.walletAddress)
}

// Toggle test mode for simulating active game state
const toggleTestMode = () => {
  testActiveMode.value = !testActiveMode.value
  console.log('Test active mode:', testActiveMode.value ? 'ON' : 'OFF')
}

const showPrompt = (entry: any) => {
  selectedEntry.value = entry
  promptDialog.value = true
}

const setupAutoRefresh = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer = setInterval(refresh, props.refreshInterval)
  }
}

const clearAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(async () => {
  await refresh()
  setupAutoRefresh()
})

onUnmounted(() => {
  clearAutoRefresh()
})

// Watch for prop changes
watch(() => props.quizId, async (newQuizId) => {
  if (newQuizId) {
    await refresh()
  }
})

watch(() => props.walletAddress, async (newWalletAddress) => {
  await refresh()
})
</script>

<style scoped>
.v-list-item.primary.lighten-4 {
  border-left: 4px solid var(--v-primary-base);
}

.elevation-2 {
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23) !important;
}
</style>