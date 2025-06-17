<template>
  <v-card>
    <v-card-title class="text-h6">
      <v-icon left :color="isConnected ? 'success' : 'error'">
        {{ isConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}
      </v-icon>
      リアルタイムゲーム状況
    </v-card-title>
    
    <v-card-text>
      <!-- Connection Status -->
      <v-alert
        v-if="connectionError"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        接続エラー: {{ connectionError }}
      </v-alert>
      
      <v-alert
        v-else-if="!isConnected"
        type="warning" 
        variant="tonal"
        class="mb-4"
      >
        接続中...
      </v-alert>
      
      <!-- Active Quiz Info -->
      <div v-if="activeQuiz">
        <h3 class="text-h6 mb-3">アクティブなクイズ</h3>
        
        <v-row>
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-body-2 mb-1">ゲームID</div>
                <div class="text-h6">{{ activeQuiz.id }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-body-2 mb-1">残り時間</div>
                <div class="text-h6" :class="timeRemainingClass">
                  {{ formatTimeRemaining }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-body-2 mb-1">参加者数</div>
                <div class="text-h6">{{ activeQuiz.totalParticipants }}人</div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-body-2 mb-1">賞金プール</div>
                <div class="text-h6">{{ activeQuiz.pot }} SOL</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        
        <!-- Game Image -->
        <v-card v-if="activeQuiz.imageUrl" variant="outlined" class="mt-4">
          <v-card-title>生成された画像</v-card-title>
          <v-card-text>
            <v-img
              :src="activeQuiz.imageUrl"
              :alt="`Quiz ${activeQuiz.id} image`"
              aspect-ratio="1"
              class="rounded"
              cover
            >
              <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                </div>
              </template>
            </v-img>
          </v-card-text>
        </v-card>
        
        <!-- Participants List -->
        <v-card variant="outlined" class="mt-4">
          <v-card-title>
            参加者一覧 ({{ participants.length }}人)
            <v-spacer></v-spacer>
            <v-chip color="success" size="small">
              <v-icon left size="small">mdi-pulse</v-icon>
              リアルタイム更新
            </v-chip>
          </v-card-title>
          
          <v-card-text>
            <v-list v-if="participants.length > 0">
              <v-list-item
                v-for="participant in participants"
                :key="participant.id"
                class="px-0"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" size="32">
                    <v-icon>mdi-account</v-icon>
                  </v-avatar>
                </template>
                
                <v-list-item-title>
                  {{ formatWalletAddress(participant.walletAddress) }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  ベット: {{ participant.betAmount }} SOL
                  <span v-if="participant.score !== undefined">
                    | スコア: {{ participant.score }}点
                  </span>
                </v-list-item-subtitle>
                
                <template v-slot:append>
                  <v-chip
                    :color="participant.status === 'active' ? 'success' : 'grey'"
                    size="small"
                  >
                    {{ participant.status === 'active' ? '参加中' : '完了' }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
            
            <v-alert
              v-else
              type="info"
              variant="tonal"
            >
              まだ参加者がいません
            </v-alert>
          </v-card-text>
        </v-card>
        
      </div>
      
      <!-- No Active Quiz -->
      <v-alert
        v-else
        type="info"
        variant="tonal"
      >
        現在アクティブなクイズはありません
      </v-alert>
    </v-card-text>
    
    <v-card-actions>
      <v-btn
        @click="refreshConnection"
        :loading="!isConnected"
        prepend-icon="mdi-refresh"
      >
        再接続
      </v-btn>
      
      <v-spacer></v-spacer>
      
      <v-btn
        v-if="activeQuiz && isQuizActive"
        color="primary"
        prepend-icon="mdi-gamepad-variant"
        href="#participate"
      >
        参加する
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
const { 
  activeQuiz, 
  participants, 
  isConnected, 
  connectionError,
  subscribeToActiveQuiz,
  getTimeRemaining,
  isQuizActive
} = useRealtimeQuiz()

// Time formatting
const timeRemaining = ref(0)
const timeRemainingClass = computed(() => {
  if (timeRemaining.value > 60000) return 'text-success' // > 1 minute
  if (timeRemaining.value > 30000) return 'text-warning' // > 30 seconds
  return 'text-error' // < 30 seconds
})

const formatTimeRemaining = computed(() => {
  const total = timeRemaining.value
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  
  if (total <= 0) return '終了'
  if (minutes > 0) return `${minutes}分${seconds}秒`
  return `${seconds}秒`
})

// Update timer every second
let timerInterval: NodeJS.Timeout | null = null

const updateTimer = () => {
  timeRemaining.value = getTimeRemaining()
}

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(updateTimer, 1000)
  updateTimer()
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// Utility functions
const formatWalletAddress = (address: string): string => {
  if (!address) return 'Unknown'
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const refreshConnection = () => {
  subscribeToActiveQuiz()
}

// Lifecycle
onMounted(() => {
  subscribeToActiveQuiz()
  startTimer()
})

onUnmounted(() => {
  stopTimer()
})

// Watch for quiz changes to restart timer
watch(activeQuiz, (newQuiz) => {
  if (newQuiz && isQuizActive()) {
    startTimer()
  } else {
    stopTimer()
  }
})
</script>