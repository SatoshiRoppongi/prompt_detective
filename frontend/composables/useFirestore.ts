// Firebase Firestore composable for real-time features
import { ref } from 'vue'
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Firebase configuration for prompt-detective-backend
const firebaseConfig = {
  projectId: 'prompt-detective-backend',
  // Note: For client-side Firebase, only projectId is needed for Firestore
  // Other config values are for Firebase hosting/auth which we handle separately
}

let app: FirebaseApp | null = null
let db: Firestore | null = null

export const useFirestore = () => {
  const isInitialized = ref(false)
  const error = ref<string | null>(null)

  const initializeFirestore = () => {
    try {
      if (!app) {
        app = initializeApp(firebaseConfig)
      }
      
      if (!db) {
        db = getFirestore(app)
      }
      
      isInitialized.value = true
      error.value = null
      
      console.log('✅ Firestore initialized successfully')
      
    } catch (err: any) {
      console.error('❌ Error initializing Firestore:', err)
      error.value = err.message
      isInitialized.value = false
    }
  }

  // Initialize on first use
  if (!isInitialized.value && !error.value) {
    initializeFirestore()
  }

  return {
    db,
    isInitialized: readonly(isInitialized),
    error: readonly(error),
    initializeFirestore
  }
}