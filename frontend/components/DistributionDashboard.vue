<template>
  <div>
    <!-- Header -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon left>{{ mdiCashMultiple }}</v-icon>
        分配ダッシュボード
        <v-spacer></v-spacer>
        <v-chip 
          :color="getHealthColor(healthStatus?.status || '')"
          dark
          small
        >
          <v-icon left small>{{ mdiHeart }}</v-icon>
          {{ getHealthText(healthStatus?.status || '') }}
        </v-chip>
      </v-card-title>
      
      <v-card-actions>
        <v-btn 
          @click="refreshAllData"
          :loading="isLoading"
          color="primary"
          small
        >
          <v-icon left>{{ mdiRefresh }}</v-icon>
          更新
        </v-btn>
        
        <v-btn 
          @click="distributePendingPrizes"
          :loading="isLoading"
          color="orange"
          small
        >
          <v-icon left>{{ mdiClockOutline }}</v-icon>
          未分配を処理
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" dense class="mb-4">
      {{ error }}
    </v-alert>

    <!-- Loading State -->
    <div v-if="isLoading && !treasuryStats">
      <v-skeleton-loader
        v-for="i in 3"
        :key="i"
        type="article"
        class="mb-4"
      ></v-skeleton-loader>
    </div>

    <div v-else>
      <!-- Treasury Stats -->
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h4 primary--text">{{ currentBalanceSOL.toFixed(2) }}</div>
              <div class="text-caption">現在残高 (SOL)</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h4 green--text">{{ totalDistributedSOL.toFixed(2) }}</div>
              <div class="text-caption">総分配額 (SOL)</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h4 blue--text">{{ totalFeesSOL.toFixed(2) }}</div>
              <div class="text-caption">総手数料 (SOL)</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h4 orange--text">{{ pendingDistributionsSOL.toFixed(2) }}</div>
              <div class="text-caption">未分配額 (SOL)</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Health Status -->
      <v-card class="mb-4" v-if="healthStatus">
        <v-card-title>
          <v-icon left>{{ mdiChartLine }}</v-icon>
          システム状態 (過去24時間)
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6" md="2">
              <div class="text-center">
                <div class="text-h6">{{ healthStatus.last24Hours.total }}</div>
                <div class="text-caption">総分配</div>
              </div>
            </v-col>
            <v-col cols="6" md="2">
              <div class="text-center">
                <div class="text-h6 green--text">{{ healthStatus.last24Hours.successful }}</div>
                <div class="text-caption">成功</div>
              </div>
            </v-col>
            <v-col cols="6" md="2">
              <div class="text-center">
                <div class="text-h6 red--text">{{ healthStatus.last24Hours.failed }}</div>
                <div class="text-caption">失敗</div>
              </div>
            </v-col>
            <v-col cols="6" md="2">
              <div class="text-center">
                <div class="text-h6 orange--text">{{ healthStatus.last24Hours.pending }}</div>
                <div class="text-caption">待機中</div>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-center">
                <div class="text-h6">{{ healthStatus.last24Hours.successRate.toFixed(1) }}%</div>
                <div class="text-caption">成功率</div>
                <v-progress-linear
                  :value="healthStatus.last24Hours.successRate"
                  :color="healthStatus.last24Hours.successRate > 90 ? 'green' : 
                          healthStatus.last24Hours.successRate > 70 ? 'orange' : 'red'"
                  height="8"
                  class="mt-2"
                ></v-progress-linear>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Recent Distribution Summaries -->
      <v-card class="mb-4">
        <v-card-title>
          <v-icon left>{{ mdiListBox }}</v-icon>
          最近の分配サマリー
        </v-card-title>
        <v-card-text>
          <v-simple-table v-if="recentSummaries.length > 0" dense>
            <template v-slot:default>
              <thead>
                <tr>
                  <th>クイズID</th>
                  <th>ステータス</th>
                  <th>総額</th>
                  <th>賞金</th>
                  <th>手数料</th>
                  <th>成功/失敗</th>
                  <th>日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="summary in recentSummaries" :key="summary.quizId">
                  <td>{{ formatAddress(summary.quizId, 12) }}</td>
                  <td>
                    <v-chip :color="getStatusColor(summary.status)" x-small dark>
                      {{ getStatusText(summary.status) }}
                    </v-chip>
                  </td>
                  <td>{{ formatSOL(summary.totalDistributed) }}</td>
                  <td>{{ formatSOL(summary.totalPrize) }}</td>
                  <td>{{ formatSOL(summary.platformFee) }}</td>
                  <td>{{ summary.successfulTransactions }}/{{ summary.successfulTransactions + summary.failedTransactions }}</td>
                  <td>{{ formatDate(summary.createdAt) }}</td>
                  <td>
                    <v-btn
                      icon
                      x-small
                      @click="viewDetails(summary.quizId)"
                    >
                      <v-icon>{{ mdiEye }}</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
          <v-alert v-else type="info" dense>
            分配履歴がありません
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- Recent Transactions -->
      <v-card>
        <v-card-title>
          <v-icon left>{{ mdiSwapHorizontal }}</v-icon>
          最近のトランザクション
        </v-card-title>
        <v-card-text>
          <v-simple-table v-if="recentTransactions.length > 0" dense>
            <template v-slot:default>
              <thead>
                <tr>
                  <th>受取人</th>
                  <th>種類</th>
                  <th>金額</th>
                  <th>ステータス</th>
                  <th>署名</th>
                  <th>日時</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="transaction in recentTransactions" :key="`${transaction.quizId}-${transaction.signature}`">
                  <td>{{ formatAddress(transaction.recipient) }}</td>
                  <td>
                    <v-chip :color="transaction.type === 'prize' ? 'green' : 'blue'" x-small outlined>
                      {{ getTransactionTypeText(transaction.type) }}
                    </v-chip>
                  </td>
                  <td>{{ formatSOL(transaction.amount) }}</td>
                  <td>
                    <v-chip :color="getStatusColor(transaction.status)" x-small dark>
                      {{ getStatusText(transaction.status) }}
                    </v-chip>
                  </td>
                  <td>
                    <a 
                      v-if="transaction.signature"
                      :href="`https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`"
                      target="_blank"
                      class="text-decoration-none"
                    >
                      {{ formatAddress(transaction.signature, 12) }}
                      <v-icon x-small>{{ mdiOpenInNew }}</v-icon>
                    </a>
                    <span v-else class="grey--text">-</span>
                  </td>
                  <td>{{ formatDate(transaction.createdAt) }}</td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
          <v-alert v-else type="info" dense>
            トランザクション履歴がありません
          </v-alert>
        </v-card-text>
      </v-card>
    </div>

    <!-- Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="800px">
      <v-card v-if="selectedQuizId">
        <v-card-title>
          分配詳細: {{ formatAddress(selectedQuizId, 16) }}
          <v-spacer></v-spacer>
          <v-btn icon @click="detailsDialog = false">
            <v-icon>{{ mdiClose }}</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <QuizResults :quiz-id="selectedQuizId" />
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn 
            @click="executeManualDistribution(selectedQuizId)"
            :loading="isLoading"
            color="primary"
            :disabled="isDistributionCompleted(selectedQuizId)"
          >
            手動分配実行
          </v-btn>
          <v-btn @click="detailsDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDistribution } from '~/composables/useDistribution'
import { 
  mdiCashMultiple,
  mdiHeart,
  mdiRefresh,
  mdiClockOutline,
  mdiChartLine,
  mdiListBox,
  mdiSwapHorizontal,
  mdiEye,
  mdiOpenInNew,
  mdiClose
} from '@mdi/js'

const {
  distributionHistory,
  treasuryStats,
  healthStatus,
  isLoading,
  error,
  currentBalanceSOL,
  totalDistributedSOL,
  totalFeesSOL,
  pendingDistributionsSOL,
  recentSummaries,
  recentTransactions,
  fetchDistributionHistory,
  fetchTreasuryStats,
  fetchHealthStatus,
  executeManualDistribution,
  distributePendingPrizes,
  refreshAllData,
  formatSOL,
  formatAddress,
  formatDate,
  getStatusColor,
  getStatusText,
  getHealthColor,
  getHealthText,
  getTransactionTypeText
} = useDistribution()

const detailsDialog = ref(false)
const selectedQuizId = ref('')

const viewDetails = (quizId: string) => {
  selectedQuizId.value = quizId
  detailsDialog.value = true
}

const isDistributionCompleted = (quizId: string) => {
  const summary = recentSummaries.value.find(s => s.quizId === quizId)
  return summary?.status === 'completed'
}

onMounted(async () => {
  await refreshAllData()
})
</script>

<style scoped>
.text-h4 {
  font-weight: bold;
}

.v-simple-table {
  max-height: 400px;
  overflow-y: auto;
}
</style>