<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon left>{{ mdiTrophy }}</v-icon>
      クイズ結果
      <v-spacer></v-spacer>
      <v-chip 
        :color="getStatusColor(quizResult?.status || '')"
        dark
        small
      >
        {{ getStatusText(quizResult?.status || '') }}
      </v-chip>
    </v-card-title>
    
    <!-- Loading State -->
    <v-card-text v-if="isLoading">
      <v-skeleton-loader
        type="article"
        class="mb-2"
      ></v-skeleton-loader>
    </v-card-text>
    
    <!-- Error State -->
    <v-card-text v-else-if="error">
      <v-alert type="error" dense>
        {{ error }}
      </v-alert>
    </v-card-text>
    
    <!-- Results Content -->
    <div v-else-if="quizResult">
      <!-- Statistics Summary -->
      <v-card-text>
        <v-row>
          <v-col cols="6" md="3">
            <v-card outlined>
              <v-card-text class="text-center">
                <div class="text-h6">{{ quizResult.totalParticipants }}</div>
                <div class="text-caption">参加者数</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card outlined>
              <v-card-text class="text-center">
                <div class="text-h6">{{ quizResult.totalPot }} SOL</div>
                <div class="text-caption">総ポット</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card outlined>
              <v-card-text class="text-center">
                <div class="text-h6">{{ quizResult.topScore }}</div>
                <div class="text-caption">最高スコア</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card outlined>
              <v-card-text class="text-center">
                <div class="text-h6">{{ quizResult.averageScore }}</div>
                <div class="text-caption">平均スコア</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
      
      <v-divider></v-divider>
      
      <!-- Winners Section -->
      <v-card-text v-if="hasWinners">
        <v-card-subtitle class="text-h6 mb-3">
          <v-icon left>{{ mdiCrown }}</v-icon>
          勝者 ({{ quizResult.winners.length }}名)
        </v-card-subtitle>
        
        <v-list dense>
          <v-list-item
            v-for="winner in quizResult.winners"
            :key="winner.walletAddress"
            class="elevation-2 mb-2"
          >
            <v-list-item-avatar>
              <v-avatar color="gold" size="40">
                <v-icon color="white">{{ mdiTrophy }}</v-icon>
              </v-avatar>
            </v-list-item-avatar>
            
            <v-list-item-content>
              <v-list-item-title class="d-flex align-center">
                <span class="font-weight-bold mr-2">
                  {{ formatAddress(winner.walletAddress) }}
                </span>
                <v-chip x-small color="gold" outlined>
                  {{ winner.rank }}位
                </v-chip>
              </v-list-item-title>
              
              <v-list-item-subtitle>
                <div class="d-flex justify-space-between">
                  <span>スコア: {{ winner.score }}点</span>
                  <span class="font-weight-bold primary--text">
                    {{ formatPrize(winner.prize) }} ({{ formatPercentage(winner.percentage) }})
                  </span>
                </div>
              </v-list-item-subtitle>
            </v-list-item-content>
            
            <v-list-item-action>
              <v-chip
                :color="isDistributed ? 'green' : distributionFailed ? 'red' : 'orange'"
                dark
                x-small
              >
                {{ isDistributed ? '支払済' : distributionFailed ? '失敗' : '待機中' }}
              </v-chip>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-card-text>
      
      <v-divider v-if="hasWinners"></v-divider>
      
      <!-- Distribution Details -->
      <v-card-text>
        <v-card-subtitle class="text-h6 mb-3">
          <v-icon left>{{ mdiCurrencyUsd }}</v-icon>
          分配詳細
        </v-card-subtitle>
        
        <v-simple-table dense>
          <template v-slot:default>
            <thead>
              <tr>
                <th>受取人</th>
                <th>種類</th>
                <th class="text-right">金額</th>
                <th class="text-right">順位</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="detail in quizResult.distributionDetails"
                :key="`${detail.walletAddress}-${detail.type}`"
              >
                <td>{{ formatAddress(detail.walletAddress) }}</td>
                <td>
                  <v-chip x-small :color="getDistributionTypeColor(detail.type)">
                    {{ getDistributionTypeText(detail.type) }}
                  </v-chip>
                </td>
                <td class="text-right">{{ formatPrize(detail.amount) }}</td>
                <td class="text-right">{{ detail.rank || '-' }}</td>
              </tr>
            </tbody>
          </template>
        </v-simple-table>
      </v-card-text>
      
      <!-- Calculation Info -->
      <v-card-text class="text-caption grey--text">
        計算完了時刻: {{ formatDate(quizResult.calculatedAt) }}
      </v-card-text>
    </div>
    
    <!-- No Results State -->
    <v-card-text v-else>
      <v-alert type="info" dense>
        結果が計算されていません
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useQuizResults } from '~/composables/useQuizResults'
import { 
  mdiTrophy, 
  mdiCrown,
  mdiCurrencyUsd
} from '@mdi/js'

interface Props {
  quizId: string
  autoFetch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoFetch: true
})

const {
  quizResult,
  isLoading,
  error,
  hasWinners,
  isDistributed,
  distributionFailed,
  fetchQuizResult,
  formatPrize,
  formatPercentage,
  formatAddress,
  formatDate,
  getStatusColor,
  getStatusText
} = useQuizResults()

const refresh = async () => {
  await fetchQuizResult(props.quizId)
}

const getDistributionTypeColor = (type: string) => {
  switch (type) {
    case 'prize':
      return 'green'
    case 'platform_fee':
      return 'blue'
    case 'runner_up':
      return 'orange'
    default:
      return 'grey'
  }
}

const getDistributionTypeText = (type: string) => {
  switch (type) {
    case 'prize':
      return '賞金'
    case 'platform_fee':
      return '手数料'
    case 'runner_up':
      return '準優勝'
    default:
      return type
  }
}

onMounted(async () => {
  if (props.autoFetch && props.quizId) {
    await refresh()
  }
})

// Watch for prop changes
watch(() => props.quizId, async (newQuizId) => {
  if (newQuizId && props.autoFetch) {
    await refresh()
  }
})

defineExpose({
  refresh
})
</script>

<style scoped>
.elevation-2 {
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23) !important;
}
</style>