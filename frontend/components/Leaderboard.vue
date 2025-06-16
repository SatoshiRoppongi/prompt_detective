<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon left>{{ mdiTrophy }}</v-icon>
      リーダーボード
      <v-spacer></v-spacer>
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
      総参加者: {{ leaderboardData.totalParticipants }}名 | 
      平均スコア: {{ formatScore(leaderboardData.averageScore) }}点 |
      最高スコア: {{ formatScore(leaderboardData.topScore) }}点
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
              <v-icon v-if="entry.rank === 1" color="white">
                {{ mdiTrophy }}
              </v-icon>
              <v-icon v-else-if="entry.rank <= 3" color="white">
                {{ mdiMedal }}
              </v-icon>
              <span v-else class="white--text font-weight-bold">
                {{ entry.rank }}
              </span>
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
                <span>スコア: {{ formatScore(entry.score) }}点</span>
                <span>賭け金: {{ entry.bet }} SOL</span>
                <span>{{ formatTime(entry.submissionTime) }}</span>
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
                  @click="showPrompt(entry)"
                >
                  <v-icon>{{ mdiEye }}</v-icon>
                </v-btn>
              </template>
              <span>回答を見る</span>
            </v-tooltip>
          </v-list-item-action>
        </v-list-item>
        
        <!-- Current User (if not in top 10) -->
        <template v-if="currentUserEntry && !isUserInTop10">
          <v-divider class="my-2"></v-divider>
          <v-list-item
            class="primary lighten-4"
            :class="{ 'elevation-1': true }"
          >
            <v-list-item-avatar>
              <v-avatar color="primary" size="32">
                <span class="white--text font-weight-bold">
                  {{ currentUserEntry.rank }}
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
                  <span>スコア: {{ formatScore(currentUserEntry.score) }}点</span>
                  <span>賭け金: {{ currentUserEntry.bet }} SOL</span>
                  <span>{{ formatTime(currentUserEntry.submissionTime) }}</span>
                </div>
              </v-list-item-subtitle>
            </v-list-item-content>
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
        {{ formatAddress(selectedEntry.walletAddress) }} の回答
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
          <strong>スコア:</strong> {{ formatScore(selectedEntry.score) }}点<br>
          <strong>順位:</strong> {{ selectedEntry.rank }}位<br>
          <strong>投稿時刻:</strong> {{ formatTime(selectedEntry.submissionTime) }}
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useLeaderboard } from '~/composables/useLeaderboard'
import { 
  mdiTrophy, 
  mdiRefresh, 
  mdiMedal, 
  mdiAccount, 
  mdiEye 
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

const {
  leaderboardData,
  isLoading,
  error,
  topEntries,
  currentUserEntry,
  isUserInTop10,
  fetchLeaderboard,
  formatAddress,
  formatScore,
  formatTime,
  getRankBadgeColor
} = useLeaderboard()

const promptDialog = ref(false)
const selectedEntry = ref(null)
let refreshTimer: NodeJS.Timeout | null = null

const refresh = async () => {
  await fetchLeaderboard(props.quizId, props.walletAddress)
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