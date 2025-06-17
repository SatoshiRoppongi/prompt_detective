import { ref, computed } from 'vue'
import { useApi } from '~/composables/useApi'

export interface DistributionTransaction {
  quizId: string
  signature: string
  recipient: string
  amount: number
  type: 'prize' | 'platform_fee'
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
  error?: string
}

export interface DistributionSummary {
  quizId: string
  totalDistributed: number
  totalPrize: number
  platformFee: number
  successfulTransactions: number
  failedTransactions: number
  status: 'pending' | 'completed' | 'partial' | 'failed'
  createdAt: string
  completedAt?: string
}

export interface TreasuryStats {
  currentBalance: number
  totalDistributed: number
  totalFees: number
  pendingDistributions: number
}

export interface DistributionHealth {
  status: 'healthy' | 'warning' | 'unhealthy'
  last24Hours: {
    total: number
    successful: number
    failed: number
    pending: number
    successRate: number
  }
  lastDistribution: DistributionSummary | null
}

export const useDistribution = () => {
  const distributionHistory = ref<{
    summaries: DistributionSummary[]
    transactions: DistributionTransaction[]
  }>({ summaries: [], transactions: [] })
  
  const treasuryStats = ref<TreasuryStats | null>(null)
  const healthStatus = ref<DistributionHealth | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const api = useApi()
  
  // Computed properties
  const totalDistributedSOL = computed(() => {
    if (!treasuryStats.value) return 0
    return treasuryStats.value.totalDistributed / 1000000000 // Convert lamports to SOL
  })
  
  const currentBalanceSOL = computed(() => {
    if (!treasuryStats.value) return 0
    return treasuryStats.value.currentBalance / 1000000000
  })
  
  const totalFeesSOL = computed(() => {
    if (!treasuryStats.value) return 0
    return treasuryStats.value.totalFees / 1000000000
  })
  
  const pendingDistributionsSOL = computed(() => {
    if (!treasuryStats.value) return 0
    return treasuryStats.value.pendingDistributions / 1000000000
  })
  
  const recentSummaries = computed(() => {
    return distributionHistory.value.summaries.slice(0, 10)
  })
  
  const recentTransactions = computed(() => {
    return distributionHistory.value.transactions.slice(0, 20)
  })
  
  const isSystemHealthy = computed(() => {
    return healthStatus.value?.status === 'healthy'
  })
  
  // Methods
  const fetchDistributionHistory = async (quizId?: string, limit: number = 50) => {
    isLoading.value = true
    error.value = null
    
    try {
      const endpoint = quizId ? `/distributions/${quizId}` : '/distributions'
      const params = new URLSearchParams()
      params.append('limit', limit.toString())
      
      const response = await api.get(`${endpoint}?${params.toString()}`)
      
      if (response.success) {
        distributionHistory.value = response.data
      } else {
        throw new Error(response.error || 'Failed to fetch distribution history')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch distribution history'
      console.error('Error fetching distribution history:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchTreasuryStats = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get('/treasury/stats')
      
      if (response.success) {
        treasuryStats.value = response.data
      } else {
        throw new Error(response.error || 'Failed to fetch treasury stats')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch treasury stats'
      console.error('Error fetching treasury stats:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchHealthStatus = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get('/distributions/health')
      
      if (response.success) {
        healthStatus.value = response.data
      } else {
        throw new Error(response.error || 'Failed to fetch health status')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch health status'
      console.error('Error fetching health status:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const executeManualDistribution = async (quizId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/distributions/${quizId}/execute`)
      
      if (response.success) {
        // Refresh data after successful distribution
        await Promise.all([
          fetchDistributionHistory(),
          fetchTreasuryStats(),
          fetchHealthStatus()
        ])
        return response.data
      } else {
        throw new Error(response.error || 'Failed to execute distribution')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to execute distribution'
      console.error('Error executing distribution:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const distributePendingPrizes = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post('/distributions/pending')
      
      if (response.success) {
        // Refresh data after processing pending distributions
        await Promise.all([
          fetchDistributionHistory(),
          fetchTreasuryStats(),
          fetchHealthStatus()
        ])
        return response.data
      } else {
        throw new Error(response.error || 'Failed to distribute pending prizes')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to distribute pending prizes'
      console.error('Error distributing pending prizes:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const refreshAllData = async () => {
    await Promise.all([
      fetchDistributionHistory(),
      fetchTreasuryStats(),
      fetchHealthStatus()
    ])
  }
  
  const clearData = () => {
    distributionHistory.value = { summaries: [], transactions: [] }
    treasuryStats.value = null
    healthStatus.value = null
    error.value = null
  }
  
  // Utility functions
  const formatSOL = (lamports: number) => {
    return (lamports / 1000000000).toFixed(4) + ' SOL'
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
      case 'completed':
      case 'confirmed':
        return 'green'
      case 'failed':
        return 'red'
      case 'pending':
        return 'orange'
      case 'partial':
        return 'yellow'
      default:
        return 'grey'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'confirmed':
        return '確認済み'
      case 'failed':
        return '失敗'
      case 'pending':
        return '待機中'
      case 'partial':
        return '部分的'
      default:
        return status
    }
  }
  
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'green'
      case 'warning':
        return 'orange'
      case 'unhealthy':
        return 'red'
      default:
        return 'grey'
    }
  }
  
  const getHealthText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '正常'
      case 'warning':
        return '注意'
      case 'unhealthy':
        return '不具合'
      default:
        return '不明'
    }
  }
  
  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'prize':
        return '賞金'
      case 'platform_fee':
        return 'プラットフォーム手数料'
      default:
        return type
    }
  }
  
  return {
    // State
    distributionHistory: readonly(distributionHistory),
    treasuryStats: readonly(treasuryStats),
    healthStatus: readonly(healthStatus),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    totalDistributedSOL,
    currentBalanceSOL,
    totalFeesSOL,
    pendingDistributionsSOL,
    recentSummaries,
    recentTransactions,
    isSystemHealthy,
    
    // Methods
    fetchDistributionHistory,
    fetchTreasuryStats,
    fetchHealthStatus,
    executeManualDistribution,
    distributePendingPrizes,
    refreshAllData,
    clearData,
    
    // Utilities
    formatSOL,
    formatAddress,
    formatDate,
    getStatusColor,
    getStatusText,
    getHealthColor,
    getHealthText,
    getTransactionTypeText
  }
}