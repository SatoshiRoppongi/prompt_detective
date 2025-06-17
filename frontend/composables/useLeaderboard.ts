import { ref, computed, type Ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { useGameState, GamePhase } from '~/composables/useGameState'
import { getCurrentFrontendConfig, debugLog } from '~/config/e2eConfig'

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

export const useLeaderboard = (quizId?: string, testActiveMode?: Ref<boolean>) => {
  const leaderboardData = ref<LeaderboardData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const api = useApi()
  const { currentPhase, canAcceptAnswers, fetchGameState, gameTimer } = useGameState()
  
  // Computed properties for game state awareness
  const isGameActive = computed(() => {
    // If test mode is enabled, use that
    if (testActiveMode?.value) return true
    
    // If no game state is available, assume game is ended to show all information
    if (!gameTimer.value) return false
    return canAcceptAnswers.value || currentPhase.value === GamePhase.SCORING
  })
  
  const isGameEnded = computed(() => {
    // If test mode is enabled, game is not ended
    if (testActiveMode?.value) return false
    
    // If no game state is available, assume game is ended to show all information
    if (!gameTimer.value) return true
    return currentPhase.value === GamePhase.RESULTS || currentPhase.value === GamePhase.COMPLETED
  })
  
  const topEntries = computed(() => {
    if (!leaderboardData.value) return []
    
    // During active games, show top 5 sorted by bet amount only
    if (isGameActive.value) {
      const sortedByBet = [...leaderboardData.value.entries]
        .sort((a, b) => b.bet - a.bet)
      return sortedByBet.slice(0, 5)
    }
    
    // During ended games, show top 10 by final ranking (score-based)
    return leaderboardData.value.entries.filter(entry => entry.rank <= 10)
  })
  
  const currentUserEntry = computed(() => {
    if (!leaderboardData.value) return null
    return leaderboardData.value.entries.find(entry => entry.isCurrentUser)
  })
  
  const shouldShowUserEntry = computed(() => {
    if (!currentUserEntry.value) return false
    
    // During active games, show user entry if not in top 5 by bet amount
    if (isGameActive.value) {
      const sortedByBet = [...(leaderboardData.value?.entries || [])]
        .sort((a, b) => b.bet - a.bet)
      const top5ByBet = sortedByBet.slice(0, 5)
      
      return !top5ByBet.find(entry => entry.isCurrentUser)
    }
    
    // During ended games, show user entry if not in top 10 by rank
    return !isUserInTop10.value
  })
  
  const isUserInTop10 = computed(() => {
    if (isGameActive.value) {
      // During active games, check if user is in top 5 by bet amount
      if (!currentUserEntry.value) return false
      const sortedByBet = [...(leaderboardData.value?.entries || [])]
        .sort((a, b) => b.bet - a.bet)
      const top5ByBet = sortedByBet.slice(0, 5)
      return top5ByBet.find(entry => entry.isCurrentUser) !== undefined
    }
    
    // During ended games, use normal ranking
    if (!leaderboardData.value?.userRank) return false
    return leaderboardData.value.userRank <= 10
  })
  
  // Methods
  const fetchLeaderboard = async (quizId: string, walletAddress?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      // Fetch leaderboard data
      const params = new URLSearchParams()
      if (walletAddress) {
        params.append('walletAddress', walletAddress)
      }
      
      const queryString = params.toString()
      const url = `/leaderboard/${quizId}${queryString ? `?${queryString}` : ''}`
      const leaderboardResponse = await api.get(url)
      
      // Try to fetch game state but don't fail if it doesn't exist
      try {
        await fetchGameState(quizId)
      } catch (gameStateError) {
        console.warn('Game state not available:', gameStateError)
      }
      
      if (leaderboardResponse.success) {
        leaderboardData.value = leaderboardResponse.data
        debugLog('Leaderboard data fetched', leaderboardResponse.data)
        
        const config = getCurrentFrontendConfig()
        if (config.SHOW_DETAILED_LOGS) {
          console.log('Leaderboard data:', leaderboardResponse.data)
          console.log('Game timer:', gameTimer.value)
          console.log('Current game phase:', currentPhase.value)
          console.log('Is game active:', isGameActive.value)
          console.log('Is game ended:', isGameEnded.value)
        }
      } else {
        throw new Error(leaderboardResponse.error || 'Failed to fetch leaderboard')
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
    // During active games, use neutral colors to avoid suggesting ranking
    if (isGameActive.value) {
      return 'blue-grey lighten-2'
    }
    
    // During ended games, use distinctive ranking colors
    if (rank === 1) return 'amber'
    if (rank === 2) return 'grey lighten-1' 
    if (rank === 3) return 'brown lighten-2'
    if (rank <= 10) return 'blue lighten-3'
    return 'grey lighten-3'
  }
  
  const getBetRank = (entry: LeaderboardEntry) => {
    if (!leaderboardData.value) return 0
    
    const sortedByBet = [...leaderboardData.value.entries]
      .sort((a, b) => b.bet - a.bet)
    
    return sortedByBet.findIndex(e => e.walletAddress === entry.walletAddress) + 1
  }
  
  const formatBetPercentage = (bet: number) => {
    if (!leaderboardData.value) return '0%'
    
    const totalBets = leaderboardData.value.entries.reduce((sum, entry) => sum + entry.bet, 0)
    if (totalBets === 0) return '0%'
    
    const percentage = (bet / totalBets) * 100
    return `${percentage.toFixed(1)}%`
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
    isGameActive,
    isGameEnded,
    shouldShowUserEntry,
    
    // Methods
    fetchLeaderboard,
    getUserRank,
    refreshLeaderboard,
    formatAddress,
    formatScore,
    formatTime,
    getRankBadgeColor,
    getBetRank,
    formatBetPercentage
  }
}