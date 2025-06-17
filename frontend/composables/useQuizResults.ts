import { ref, computed } from 'vue'
import { useApi } from '~/composables/useApi'

export interface Winner {
  walletAddress: string
  rank: number
  score: number
  prize: number
  percentage: number
}

export interface DistributionDetail {
  walletAddress: string
  amount: number
  type: 'prize' | 'platform_fee' | 'runner_up'
  rank?: number
}

export interface QuizResult {
  quizId: string
  winners: Winner[]
  totalParticipants: number
  totalPot: number
  averageScore: number
  topScore: number
  distributionDetails: DistributionDetail[]
  calculatedAt: string
  status: 'calculated' | 'distributed' | 'failed'
}

export interface QuizStatistics {
  totalQuizzes: number
  totalParticipants: number
  totalPayout: number
  averageParticipants: number
  averageScore: number
  topScore: number
  distributionSuccess: number
  distributionFailed: number
}

export const useQuizResults = () => {
  const quizResult = ref<QuizResult | null>(null)
  const quizHistory = ref<QuizResult[]>([])
  const statistics = ref<QuizStatistics | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const api = useApi()
  
  // Computed properties
  const hasWinners = computed(() => {
    return quizResult.value && quizResult.value.winners.length > 0
  })
  
  const isDistributed = computed(() => {
    return quizResult.value?.status === 'distributed'
  })
  
  const distributionFailed = computed(() => {
    return quizResult.value?.status === 'failed'
  })
  
  const totalPrizeDistributed = computed(() => {
    if (!quizResult.value) return 0
    return quizResult.value.distributionDetails
      .filter(d => d.type === 'prize')
      .reduce((sum, d) => sum + d.amount, 0)
  })
  
  const platformFee = computed(() => {
    if (!quizResult.value) return 0
    const platformDetail = quizResult.value.distributionDetails
      .find(d => d.type === 'platform_fee')
    return platformDetail ? platformDetail.amount : 0
  })
  
  // Methods
  const fetchQuizResult = async (quizId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/results/${quizId}`)
      
      if (response.success) {
        quizResult.value = response.data
      } else {
        throw new Error(response.error || 'Failed to fetch quiz result')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch quiz result'
      console.error('Error fetching quiz result:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchQuizHistory = async (limit: number = 10, lastResultId?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const params = new URLSearchParams()
      params.append('limit', limit.toString())
      if (lastResultId) {
        params.append('lastResultId', lastResultId)
      }
      
      const response = await api.get(`/results?${params.toString()}`)
      
      if (response.success) {
        if (lastResultId) {
          // Append to existing results for pagination
          quizHistory.value = [...quizHistory.value, ...response.data.results]
        } else {
          // Replace results for fresh load
          quizHistory.value = response.data.results
        }
        return {
          results: response.data.results,
          hasMore: response.data.hasMore
        }
      } else {
        throw new Error(response.error || 'Failed to fetch quiz history')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch quiz history'
      console.error('Error fetching quiz history:', err)
      return { results: [], hasMore: false }
    } finally {
      isLoading.value = false
    }
  }
  
  const calculateQuizResult = async (quizId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/results/${quizId}/calculate`)
      
      if (response.success) {
        quizResult.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to calculate quiz result')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to calculate quiz result'
      console.error('Error calculating quiz result:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchStatistics = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get('/statistics')
      
      if (response.success) {
        statistics.value = response.data
      } else {
        throw new Error(response.error || 'Failed to fetch statistics')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch statistics'
      console.error('Error fetching statistics:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const clearResults = () => {
    quizResult.value = null
    quizHistory.value = []
    statistics.value = null
    error.value = null
  }
  
  // Utility functions
  const formatPrize = (lamports: number) => {
    return (lamports / 1000000000).toFixed(4) + ' SOL'
  }
  
  const formatPercentage = (percentage: number) => {
    return percentage.toFixed(2) + '%'
  }
  
  const formatAddress = (address: string, maxLength: number = 8) => {
    if (address === 'platform') return 'Platform'
    if (address.length <= maxLength) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (err) {
      return dateString
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'distributed':
        return 'green'
      case 'failed':
        return 'red'
      case 'calculated':
        return 'orange'
      default:
        return 'grey'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'distributed':
        return '分配完了'
      case 'failed':
        return '分配失敗'
      case 'calculated':
        return '計算済み'
      default:
        return '不明'
    }
  }
  
  return {
    // State
    quizResult: readonly(quizResult),
    quizHistory: readonly(quizHistory),
    statistics: readonly(statistics),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    hasWinners,
    isDistributed,
    distributionFailed,
    totalPrizeDistributed,
    platformFee,
    
    // Methods
    fetchQuizResult,
    fetchQuizHistory,
    calculateQuizResult,
    fetchStatistics,
    clearResults,
    
    // Utilities
    formatPrize,
    formatPercentage,
    formatAddress,
    formatDate,
    getStatusColor,
    getStatusText
  }
}