import { ref, computed } from 'vue'
import { useApi } from '~/composables/useApi'

export interface LeaderboardEntry {
  rank: number
  walletAddress: string
  score: number
  bet: number
  guessPrompt: string
  submissionTime: string
  isCurrentUser?: boolean
}

export interface LeaderboardData {
  entries: LeaderboardEntry[]
  totalParticipants: number
  averageScore: number
  topScore: number
  userRank?: number
}

export const useLeaderboard = () => {
  const leaderboardData = ref<LeaderboardData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const api = useApi()
  
  // Computed properties
  const topEntries = computed(() => {
    if (!leaderboardData.value) return []
    return leaderboardData.value.entries.filter(entry => entry.rank <= 10)
  })
  
  const currentUserEntry = computed(() => {
    if (!leaderboardData.value) return null
    return leaderboardData.value.entries.find(entry => entry.isCurrentUser)
  })
  
  const isUserInTop10 = computed(() => {
    if (!leaderboardData.value?.userRank) return false
    return leaderboardData.value.userRank <= 10
  })
  
  // Methods
  const fetchLeaderboard = async (quizId: string, walletAddress?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const params = new URLSearchParams()
      if (walletAddress) {
        params.append('walletAddress', walletAddress)
      }
      
      const queryString = params.toString()
      const url = `/leaderboard/${quizId}${queryString ? `?${queryString}` : ''}`
      
      const response = await api.get(url)
      
      if (response.success) {
        leaderboardData.value = response.data
      } else {
        throw new Error(response.error || 'Failed to fetch leaderboard')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch leaderboard'
      console.error('Error fetching leaderboard:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const getUserRank = async (quizId: string, walletAddress: string) => {
    try {
      const response = await api.get(`/leaderboard/${quizId}/rank?walletAddress=${walletAddress}`)
      
      if (response.success) {
        return response.data.rank
      } else {
        throw new Error(response.error || 'Failed to get user rank')
      }
    } catch (err: any) {
      console.error('Error getting user rank:', err)
      return null
    }
  }
  
  const refreshLeaderboard = async (quizId: string, walletAddress?: string) => {
    await fetchLeaderboard(quizId, walletAddress)
  }
  
  const formatAddress = (address: string, maxLength: number = 8) => {
    if (address.length <= maxLength) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }
  
  const formatScore = (score: number) => {
    return score.toFixed(2)
  }
  
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (err) {
      return timeString
    }
  }
  
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'amber'
    if (rank === 2) return 'grey lighten-1' 
    if (rank === 3) return 'brown lighten-2'
    if (rank <= 10) return 'blue lighten-3'
    return 'grey lighten-3'
  }
  
  
  return {
    // State
    leaderboardData: readonly(leaderboardData),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    topEntries,
    currentUserEntry,
    isUserInTop10,
    
    // Methods
    fetchLeaderboard,
    getUserRank,
    refreshLeaderboard,
    formatAddress,
    formatScore,
    formatTime,
    getRankBadgeColor
  }
}