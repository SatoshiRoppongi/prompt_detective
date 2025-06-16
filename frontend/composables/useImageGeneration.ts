import { ref, computed } from 'vue'
import { useApi } from '~/composables/useApi'

export enum ImageStyle {
  VIVID = "vivid",
  NATURAL = "natural"
}

export enum ImageSize {
  SQUARE = "1024x1024",
  PORTRAIT = "1024x1792", 
  LANDSCAPE = "1792x1024"
}

export enum ImageQuality {
  STANDARD = "standard",
  HD = "hd"
}

export interface ImageGenerationRequest {
  prompt: string
  style?: ImageStyle
  size?: ImageSize
  quality?: ImageQuality
  userId?: string
  quizId?: string
  purpose?: 'quiz' | 'test' | 'admin' | 'user_request'
  autoUpload?: boolean
}

export interface GeneratedImage {
  id: string
  prompt: string
  revisedPrompt?: string
  originalUrl: string
  storageUrl?: string
  fileName: string
  style: ImageStyle
  size: ImageSize
  quality: ImageQuality
  purpose: string
  userId?: string
  quizId?: string
  generatedAt: string
  uploadedAt?: string
  metadata: {
    model: string
    estimatedCost: number
    processingTime: number
  }
  status: 'generating' | 'generated' | 'uploaded' | 'failed'
  error?: string
}

export interface ImageGenerationStats {
  period: string
  totalGenerated: number
  totalUploaded: number
  totalFailed: number
  totalCost: number
  averageProcessingTime: number
  successRate: number
}

export const useImageGeneration = () => {
  const currentImage = ref<GeneratedImage | null>(null)
  const imageHistory = ref<GeneratedImage[]>([])
  const stats = ref<ImageGenerationStats | null>(null)
  const isGenerating = ref(false)
  const isUploading = ref(false)
  const error = ref<string | null>(null)
  
  const api = useApi()
  
  // Computed properties
  const isImageReady = computed(() => {
    return currentImage.value?.status === 'uploaded' || currentImage.value?.status === 'generated'
  })
  
  const imageUrl = computed(() => {
    if (!currentImage.value) return null
    return currentImage.value.storageUrl || currentImage.value.originalUrl
  })
  
  const generationProgress = computed(() => {
    if (!currentImage.value) return 0
    
    switch (currentImage.value.status) {
      case 'generating':
        return 25
      case 'generated':
        return 50
      case 'uploaded':
        return 100
      case 'failed':
        return 0
      default:
        return 0
    }
  })
  
  const estimatedCost = computed(() => {
    if (!currentImage.value) return 0
    return currentImage.value.metadata.estimatedCost
  })
  
  const processingTime = computed(() => {
    if (!currentImage.value) return 0
    return currentImage.value.metadata.processingTime
  })
  
  const recentImages = computed(() => {
    return imageHistory.value.slice(0, 10)
  })
  
  // Methods
  const generateImage = async (request: ImageGenerationRequest) => {
    isGenerating.value = true
    error.value = null
    
    try {
      const response = await api.post('/images/generate', request)
      
      if (response.success) {
        currentImage.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to generate image')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to generate image'
      console.error('Error generating image:', err)
      throw err
    } finally {
      isGenerating.value = false
    }
  }
  
  const uploadImage = async (imageId: string) => {
    isUploading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/images/${imageId}/upload`)
      
      if (response.success) {
        currentImage.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to upload image')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to upload image'
      console.error('Error uploading image:', err)
      throw err
    } finally {
      isUploading.value = false
    }
  }
  
  const optimizePrompt = async (prompt: string) => {
    try {
      const response = await api.post('/images/optimize-prompt', { prompt })
      
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'Failed to optimize prompt')
      }
    } catch (err: any) {
      console.error('Error optimizing prompt:', err)
      return { original: prompt, optimized: prompt }
    }
  }
  
  const generateRandomPrompt = async () => {
    try {
      const response = await api.post('/images/random-prompt')
      
      if (response.success) {
        return response.data.prompt
      } else {
        throw new Error(response.error || 'Failed to generate random prompt')
      }
    } catch (err: any) {
      console.error('Error generating random prompt:', err)
      return 'カラフルな抽象アート'
    }
  }
  
  const fetchImageDetails = async (imageId: string) => {
    try {
      const response = await api.get(`/images/${imageId}`)
      
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch image details')
      }
    } catch (err: any) {
      console.error('Error fetching image details:', err)
      return null
    }
  }
  
  const fetchImageHistory = async (limit: number = 50, userId?: string, purpose?: string) => {
    try {
      const params = new URLSearchParams()
      if (limit) params.append('limit', limit.toString())
      if (userId) params.append('userId', userId)
      if (purpose) params.append('purpose', purpose)
      
      const response = await api.get(`/images?${params.toString()}`)
      
      if (response.success) {
        imageHistory.value = response.data.images
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch image history')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch image history'
      console.error('Error fetching image history:', err)
      return { images: [], hasMore: false, count: 0 }
    }
  }
  
  const fetchStats = async (period: 'day' | 'week' | 'month' = 'week') => {
    try {
      const response = await api.get(`/images/stats/overview?period=${period}`)
      
      if (response.success) {
        stats.value = response.data
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch statistics')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch statistics'
      console.error('Error fetching statistics:', err)
      return null
    }
  }
  
  const clearCurrentImage = () => {
    currentImage.value = null
    error.value = null
  }
  
  const clearHistory = () => {
    imageHistory.value = []
  }
  
  const clearAll = () => {
    currentImage.value = null
    imageHistory.value = []
    stats.value = null
    error.value = null
  }
  
  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'green'
      case 'generated':
        return 'blue'
      case 'generating':
        return 'orange'
      case 'failed':
        return 'red'
      default:
        return 'grey'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'アップロード完了'
      case 'generated':
        return '生成完了'
      case 'generating':
        return '生成中'
      case 'failed':
        return '失敗'
      default:
        return status
    }
  }
  
  const getStyleText = (style: ImageStyle) => {
    switch (style) {
      case ImageStyle.VIVID:
        return '鮮やか'
      case ImageStyle.NATURAL:
        return '自然'
      default:
        return style
    }
  }
  
  const getSizeText = (size: ImageSize) => {
    switch (size) {
      case ImageSize.SQUARE:
        return '正方形 (1024x1024)'
      case ImageSize.PORTRAIT:
        return '縦長 (1024x1792)'
      case ImageSize.LANDSCAPE:
        return '横長 (1792x1024)'
      default:
        return size
    }
  }
  
  const getQualityText = (quality: ImageQuality) => {
    switch (quality) {
      case ImageQuality.HD:
        return 'HD'
      case ImageQuality.STANDARD:
        return 'スタンダード'
      default:
        return quality
    }
  }
  
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(3)}`
  }
  
  const formatProcessingTime = (time: number) => {
    if (time < 1000) {
      return `${time}ms`
    } else {
      return `${(time / 1000).toFixed(1)}s`
    }
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
  
  return {
    // State
    currentImage: readonly(currentImage),
    imageHistory: readonly(imageHistory),
    stats: readonly(stats),
    isGenerating: readonly(isGenerating),
    isUploading: readonly(isUploading),
    error: readonly(error),
    
    // Computed
    isImageReady,
    imageUrl,
    generationProgress,
    estimatedCost,
    processingTime,
    recentImages,
    
    // Methods
    generateImage,
    uploadImage,
    optimizePrompt,
    generateRandomPrompt,
    fetchImageDetails,
    fetchImageHistory,
    fetchStats,
    clearCurrentImage,
    clearHistory,
    clearAll,
    
    // Utilities
    getStatusColor,
    getStatusText,
    getStyleText,
    getSizeText,
    getQualityText,
    formatCost,
    formatProcessingTime,
    formatDate,
    
    // Enums for template use
    ImageStyle,
    ImageSize,
    ImageQuality
  }
}