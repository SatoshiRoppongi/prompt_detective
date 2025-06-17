import { ref, computed } from 'vue'
import { useApi } from '~/composables/useApi'

export interface UserStats {
  totalQuizzes: number
  totalWins: number
  totalBets: number
  totalWinnings: number
  bestScore: number
  averageScore: number
  winRate: number
  currentStreak: number
  bestStreak: number
  totalSpent: number
  netProfit: number
}

export interface UserPreferences {
  notifications: boolean
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  emailNotifications: boolean
  soundEffects: boolean
}

export interface User {
  id?: string
  name: string | null
  walletAddress: string
  email?: string
  avatar?: string
  bio?: string
  stats?: UserStats
  preferences?: UserPreferences
  createdAt?: any
  updatedAt?: any
  lastLoginAt?: any
}

export interface QuizHistory {
  quizId: string
  secretPrompt: string
  guessPrompt: string
  score: number
  bet: number
  winnings: number
  rank: number
  totalParticipants: number
  createdAt: any
  isWinner: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: any
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface UserProfile {
  user: User
  stats: UserStats
  recentHistory: QuizHistory[]
  achievements: Achievement[]
}

export const useUserProfile = () => {
  const profile = ref<UserProfile | null>(null)
  const stats = ref<UserStats | null>(null)
  const history = ref<QuizHistory[]>([])
  const achievements = ref<Achievement[]>([])
  const isLoading = ref(false)
  const isLoadingHistory = ref(false)
  const error = ref<string | null>(null)
  
  const api = useApi()
  
  // Computed properties
  const isProfileLoaded = computed(() => {
    return profile.value !== null
  })
  
  const userRank = computed(() => {
    if (!stats.value) return null
    
    if (stats.value.winRate >= 80) return 'レジェンド'
    if (stats.value.winRate >= 60) return 'エキスパート'
    if (stats.value.winRate >= 40) return 'ベテラン'
    if (stats.value.winRate >= 20) return 'ビギナー'
    return '初心者'
  })
  
  const userLevel = computed(() => {
    if (!stats.value) return 1
    return Math.floor(stats.value.totalQuizzes / 5) + 1
  })
  
  const nextLevelProgress = computed(() => {
    if (!stats.value) return 0
    const currentLevelQuizzes = (userLevel.value - 1) * 5
    const quizzesInCurrentLevel = stats.value.totalQuizzes - currentLevelQuizzes
    return (quizzesInCurrentLevel / 5) * 100
  })
  
  const profitabilityStatus = computed(() => {
    if (!stats.value) return 'neutral'
    
    if (stats.value.netProfit > 0) return 'profit'
    if (stats.value.netProfit < 0) return 'loss'
    return 'neutral'
  })
  
  const recentPerformance = computed(() => {
    if (history.value.length === 0) return null
    
    const recent5 = history.value.slice(0, 5)
    const wins = recent5.filter(h => h.isWinner).length
    const averageScore = recent5.reduce((sum, h) => sum + h.score, 0) / recent5.length
    
    return {
      wins,
      total: recent5.length,
      winRate: (wins / recent5.length) * 100,
      averageScore
    }
  })
  
  // Methods
  const fetchUserProfile = async (walletAddress: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response: any = await api.get(`/users/${walletAddress}/profile`)
      
      if (response.success) {
        profile.value = response.data
        stats.value = response.data.stats
        history.value = response.data.recentHistory
        achievements.value = response.data.achievements
      } else {
        throw new Error(response.error || 'Failed to fetch user profile')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user profile'
      console.error('Error fetching user profile:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchUserStats = async (walletAddress: string) => {
    try {
      const response: any = await api.get(`/users/${walletAddress}/stats`)
      
      if (response.success) {
        stats.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch user stats')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user stats'
      console.error('Error fetching user stats:', err)
      return null
    }
  }
  
  const fetchUserHistory = async (walletAddress: string, limit: number = 50) => {
    isLoadingHistory.value = true
    
    try {
      const response: any = await api.get(`/users/${walletAddress}/history?limit=${limit}`)
      
      if (response.success) {
        history.value = response.data.history
        return response.data.history
      } else {
        throw new Error(response.error || 'Failed to fetch user history')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user history'
      console.error('Error fetching user history:', err)
      return []
    } finally {
      isLoadingHistory.value = false
    }
  }
  
  const fetchUserAchievements = async (walletAddress: string) => {
    try {
      const response: any = await api.get(`/users/${walletAddress}/achievements`)
      
      if (response.success) {
        achievements.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch user achievements')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user achievements'
      console.error('Error fetching user achievements:', err)
      return []
    }
  }
  
  const updateUserPreferences = async (walletAddress: string, preferences: Partial<UserPreferences>) => {
    try {
      const response: any = await api.put(`/users/${walletAddress}/preferences`, { preferences })
      
      if (response.success) {
        if (profile.value) {
          profile.value.user.preferences = { ...profile.value.user.preferences, ...preferences } as UserPreferences
        }
        return true
      } else {
        throw new Error(response.error || 'Failed to update user preferences')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to update user preferences'
      console.error('Error updating user preferences:', err)
      return false
    }
  }
  
  const updateLastLogin = async (walletAddress: string) => {
    try {
      await api.post('/users/login', { walletAddress })
    } catch (err) {
      console.error('Error updating last login:', err)
    }
  }
  
  const clearProfile = () => {
    profile.value = null
    stats.value = null
    history.value = []
    achievements.value = []
    error.value = null
  }
  
  // Utility functions
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'orange'
      case 'epic':
        return 'purple'
      case 'rare':
        return 'blue'
      case 'common':
        return 'green'
      default:
        return 'grey'
    }
  }
  
  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(3)} SOL`
  }
  
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
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
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success'
    if (score >= 70) return 'warning'
    if (score >= 50) return 'info'
    return 'error'
  }
  
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'success'
    if (winRate >= 50) return 'warning'
    if (winRate >= 30) return 'info'
    return 'error'
  }
  
  return {
    // State
    profile: readonly(profile),
    stats: readonly(stats),
    history: readonly(history),
    achievements: readonly(achievements),
    isLoading: readonly(isLoading),
    isLoadingHistory: readonly(isLoadingHistory),
    error: readonly(error),
    
    // Computed
    isProfileLoaded,
    userRank,
    userLevel,
    nextLevelProgress,
    profitabilityStatus,
    recentPerformance,
    
    // Methods
    fetchUserProfile,
    fetchUserStats,
    fetchUserHistory,
    fetchUserAchievements,
    updateUserPreferences,
    updateLastLogin,
    clearProfile,
    
    // Utilities
    getRarityColor,
    formatCurrency,
    formatPercentage,
    formatDate,
    getScoreColor,
    getWinRateColor
  }
}