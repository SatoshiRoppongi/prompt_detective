import { ref, computed } from 'vue'
import { useApi } from '~/composables/useApi'

export enum GamePhase {
  WAITING = "waiting",
  ACTIVE = "active",
  GRACE_PERIOD = "grace",
  SCORING = "scoring",
  RESULTS = "results",
  DISTRIBUTION = "distribution",
  COMPLETED = "completed"
}

export interface GameTimer {
  quizId: string
  phase: GamePhase
  startTime: string
  endTime: string
  remainingTime: number
  lastUpdated: string
  isActive: boolean
  autoTransitions: boolean
}

export interface PhaseTransition {
  from: GamePhase
  to: GamePhase
  triggeredAt: string
  triggeredBy: 'timer' | 'manual' | 'condition'
  reason?: string
}

export interface GameStateHistory {
  quizId: string
  transitions: PhaseTransition[]
  totalDuration: number
  activePhaseDuration: number
  createdAt: string
}

export const useGameState = () => {
  const gameTimer = ref<GameTimer | null>(null)
  const gameHistory = ref<GameStateHistory | null>(null)
  const activeGames = ref<GameTimer[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const api = useApi()
  
  // Computed properties
  const currentPhase = computed(() => gameTimer.value?.phase || GamePhase.WAITING)
  
  const isGameActive = computed(() => gameTimer.value?.isActive === true)
  
  const timeRemaining = computed(() => {
    if (!gameTimer.value) return 0
    return gameTimer.value.remainingTime
  })
  
  const formattedTimeRemaining = computed(() => {
    const totalSeconds = timeRemaining.value
    if (totalSeconds <= 0) return '終了'
    
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}時間${minutes}分${seconds}秒`
    } else if (minutes > 0) {
      return `${minutes}分${seconds}秒`
    } else {
      return `${seconds}秒`
    }
  })
  
  const phaseProgress = computed(() => {
    if (!gameTimer.value) return 0
    
    const phases = Object.values(GamePhase)
    const currentIndex = phases.indexOf(gameTimer.value.phase)
    return ((currentIndex + 1) / phases.length) * 100
  })
  
  const canAcceptAnswers = computed(() => {
    return currentPhase.value === GamePhase.ACTIVE || currentPhase.value === GamePhase.GRACE_PERIOD
  })
  
  const isGracePeriod = computed(() => {
    return currentPhase.value === GamePhase.GRACE_PERIOD
  })
  
  // Methods
  const fetchGameState = async (quizId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/gamestate/${quizId}`)
      
      if (response.success) {
        gameTimer.value = response.data
      } else {
        throw new Error(response.error || 'Failed to fetch game state')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch game state'
      console.error('Error fetching game state:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const initializeGameState = async (
    quizId: string, 
    durationHours: number = 24, 
    autoTransitions: boolean = true
  ) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/gamestate/${quizId}/initialize`, {
        durationHours,
        autoTransitions
      })
      
      if (response.success) {
        gameTimer.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to initialize game state')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to initialize game state'
      console.error('Error initializing game state:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const updateGameState = async (quizId: string) => {
    try {
      const response = await api.put(`/gamestate/${quizId}/update`)
      
      if (response.success) {
        gameTimer.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to update game state')
      }
    } catch (err: any) {
      console.error('Error updating game state:', err)
      return null
    }
  }
  
  const transitionPhase = async (quizId: string, phase: GamePhase, reason?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.put(`/gamestate/${quizId}/transition`, {
        phase,
        reason
      })
      
      if (response.success) {
        gameTimer.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to transition phase')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to transition phase'
      console.error('Error transitioning phase:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchActiveGames = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get('/gamestate')
      
      if (response.success) {
        activeGames.value = response.data.timers
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch active games')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch active games'
      console.error('Error fetching active games:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchGameHistory = async (quizId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/gamestate/${quizId}/history`)
      
      if (response.success) {
        gameHistory.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch game history')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch game history'
      console.error('Error fetching game history:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const startAutoUpdate = (quizId: string, intervalSeconds: number = 30) => {
    return setInterval(() => {
      updateGameState(quizId)
    }, intervalSeconds * 1000)
  }
  
  const clearData = () => {
    gameTimer.value = null
    gameHistory.value = null
    activeGames.value = []
    error.value = null
  }
  
  // Utility functions
  const getPhaseDisplayName = (phase: GamePhase): string => {
    const phaseNames: Record<GamePhase, string> = {
      [GamePhase.WAITING]: '開始待ち',
      [GamePhase.ACTIVE]: 'アクティブ',
      [GamePhase.GRACE_PERIOD]: '猶予期間',
      [GamePhase.SCORING]: 'スコア計算中',
      [GamePhase.RESULTS]: '結果発表',
      [GamePhase.DISTRIBUTION]: '賞金分配中',
      [GamePhase.COMPLETED]: '完了'
    }
    
    return phaseNames[phase] || phase
  }
  
  const getPhaseColor = (phase: GamePhase): string => {
    const phaseColors: Record<GamePhase, string> = {
      [GamePhase.WAITING]: 'grey',
      [GamePhase.ACTIVE]: 'green',
      [GamePhase.GRACE_PERIOD]: 'orange',
      [GamePhase.SCORING]: 'blue',
      [GamePhase.RESULTS]: 'purple',
      [GamePhase.DISTRIBUTION]: 'indigo',
      [GamePhase.COMPLETED]: 'teal'
    }
    
    return phaseColors[phase] || 'grey'
  }
  
  const getPhaseIcon = (phase: GamePhase): string => {
    const phaseIcons: Record<GamePhase, string> = {
      [GamePhase.WAITING]: 'mdi-clock-outline',
      [GamePhase.ACTIVE]: 'mdi-play-circle',
      [GamePhase.GRACE_PERIOD]: 'mdi-timer-sand',
      [GamePhase.SCORING]: 'mdi-calculator',
      [GamePhase.RESULTS]: 'mdi-trophy',
      [GamePhase.DISTRIBUTION]: 'mdi-cash-multiple',
      [GamePhase.COMPLETED]: 'mdi-check-circle'
    }
    
    return phaseIcons[phase] || 'mdi-help-circle'
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
  
  const getPhaseDescription = (phase: GamePhase): string => {
    const descriptions: Record<GamePhase, string> = {
      [GamePhase.WAITING]: 'ゲーム開始を待機中です',
      [GamePhase.ACTIVE]: '回答を受け付けています',
      [GamePhase.GRACE_PERIOD]: '回答の猶予期間です',
      [GamePhase.SCORING]: 'スコアを計算しています',
      [GamePhase.RESULTS]: '結果を発表中です',
      [GamePhase.DISTRIBUTION]: '賞金を分配中です',
      [GamePhase.COMPLETED]: 'ゲームが完了しました'
    }
    
    return descriptions[phase] || ''
  }
  
  return {
    // State
    gameTimer: readonly(gameTimer),
    gameHistory: readonly(gameHistory),
    activeGames: readonly(activeGames),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    currentPhase,
    isGameActive,
    timeRemaining,
    formattedTimeRemaining,
    phaseProgress,
    canAcceptAnswers,
    isGracePeriod,
    
    // Methods
    fetchGameState,
    initializeGameState,
    updateGameState,
    transitionPhase,
    fetchActiveGames,
    fetchGameHistory,
    startAutoUpdate,
    clearData,
    
    // Utilities
    getPhaseDisplayName,
    getPhaseColor,
    getPhaseIcon,
    getPhaseDescription,
    formatDate
  }
}