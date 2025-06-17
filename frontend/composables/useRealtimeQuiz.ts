// Real-time quiz functionality using Firebase SDK v9
import { ref, onUnmounted } from 'vue'
import { doc, onSnapshot, collection, query, where, orderBy, type Unsubscribe } from 'firebase/firestore'
import { useFirestore } from './useFirestore'

interface Quiz {
  id: string
  secretPrompt: string
  imageName: string
  imageUrl?: string
  status: 'active' | 'completed' | 'force-ended'
  minBet: number
  maxParticipants: number
  endTime: any
  createdAt: any
  pot: number
  totalParticipants: number
  averageScore: number
}

interface Participant {
  id: string
  walletAddress: string
  guess: string
  betAmount: number
  joinedAt: any
  score?: number
  status: 'active' | 'completed'
}

export const useRealtimeQuiz = () => {
  const { db } = useFirestore()
  
  // Reactive state
  const activeQuiz = ref<Quiz | null>(null)
  const participants = ref<Participant[]>([])
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)
  
  // Unsubscribe functions
  let unsubscribeQuiz: Unsubscribe | null = null
  let unsubscribeParticipants: Unsubscribe | null = null
  let unsubscribeActiveQuizzes: Unsubscribe | null = null

  // Subscribe to active quiz changes
  const subscribeToActiveQuiz = () => {
    if (!db) {
      connectionError.value = 'Firestore not initialized'
      return
    }

    try {
      // Listen to active quizzes
      const activeQuizzesQuery = query(
        collection(db, 'quiz'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      )

      unsubscribeActiveQuizzes = onSnapshot(
        activeQuizzesQuery,
        (snapshot) => {
          isConnected.value = true
          connectionError.value = null

          if (!snapshot.empty) {
            const latestQuiz = snapshot.docs[0]
            const quizData = { id: latestQuiz.id, ...latestQuiz.data() } as Quiz
            activeQuiz.value = quizData

            // Subscribe to participants for this quiz
            subscribeToParticipants(quizData.id)
          } else {
            activeQuiz.value = null
            participants.value = []
          }
        },
        (error) => {
          console.error('Error listening to active quiz:', error)
          connectionError.value = error.message
          isConnected.value = false
        }
      )
    } catch (error: any) {
      console.error('Error setting up active quiz subscription:', error)
      connectionError.value = error.message
      isConnected.value = false
    }
  }

  // Subscribe to specific quiz
  const subscribeToQuiz = (quizId: string) => {
    if (!db || !quizId) return

    try {
      const quizRef = doc(db, 'quiz', quizId)
      
      unsubscribeQuiz = onSnapshot(
        quizRef,
        (doc) => {
          isConnected.value = true
          connectionError.value = null

          if (doc.exists()) {
            activeQuiz.value = { id: doc.id, ...doc.data() } as Quiz
            subscribeToParticipants(quizId)
          } else {
            activeQuiz.value = null
          }
        },
        (error) => {
          console.error('Error listening to quiz:', error)
          connectionError.value = error.message
          isConnected.value = false
        }
      )
    } catch (error: any) {
      console.error('Error setting up quiz subscription:', error)
      connectionError.value = error.message
    }
  }

  // Subscribe to participants
  const subscribeToParticipants = (quizId: string) => {
    if (!db || !quizId) return

    try {
      const participantsQuery = query(
        collection(db, 'quiz', quizId, 'participants'),
        orderBy('joinedAt', 'desc')
      )

      unsubscribeParticipants = onSnapshot(
        participantsQuery,
        (snapshot) => {
          const participantList: Participant[] = []
          
          snapshot.forEach((doc) => {
            participantList.push({ id: doc.id, ...doc.data() } as Participant)
          })
          
          participants.value = participantList
          console.log(`🔄 Participants updated: ${participantList.length} participants`)
        },
        (error) => {
          console.error('Error listening to participants:', error)
          connectionError.value = error.message
        }
      )
    } catch (error: any) {
      console.error('Error setting up participants subscription:', error)
      connectionError.value = error.message
    }
  }

  // Get quiz time remaining
  const getTimeRemaining = (): number => {
    if (!activeQuiz.value?.endTime) return 0
    
    const endTime = activeQuiz.value.endTime.toDate ? 
      activeQuiz.value.endTime.toDate() : 
      new Date(activeQuiz.value.endTime)
    
    return Math.max(0, endTime.getTime() - Date.now())
  }

  // Check if quiz is active
  const isQuizActive = (): boolean => {
    return activeQuiz.value?.status === 'active' && getTimeRemaining() > 0
  }

  // Get leaderboard (participants sorted by score)
  const getLeaderboard = (): Participant[] => {
    return [...participants.value]
      .filter(p => p.score !== undefined)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
  }

  // Cleanup subscriptions
  const cleanup = () => {
    if (unsubscribeQuiz) {
      unsubscribeQuiz()
      unsubscribeQuiz = null
    }
    if (unsubscribeParticipants) {
      unsubscribeParticipants()
      unsubscribeParticipants = null
    }
    if (unsubscribeActiveQuizzes) {
      unsubscribeActiveQuizzes()
      unsubscribeActiveQuizzes = null
    }
    
    activeQuiz.value = null
    participants.value = []
    isConnected.value = false
    connectionError.value = null
  }

  // Auto cleanup on component unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    activeQuiz: readonly(activeQuiz),
    participants: readonly(participants),
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
    
    // Methods
    subscribeToActiveQuiz,
    subscribeToQuiz,
    getTimeRemaining,
    isQuizActive,
    getLeaderboard,
    cleanup
  }
}