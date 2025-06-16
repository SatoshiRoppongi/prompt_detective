<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon left>{{ mdiImageMultiple }}</v-icon>
      画像生成管理
      <v-spacer></v-spacer>
      <v-chip 
        :color="isGenerating ? 'orange' : 'green'"
        dark
        small
      >
        {{ isGenerating ? '生成中' : '待機中' }}
      </v-chip>
    </v-card-title>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" dense class="ma-4">
      {{ error }}
    </v-alert>

    <v-tabs v-model="activeTab">
      <v-tab>手動生成</v-tab>
      <v-tab>履歴</v-tab>
      <v-tab>統計</v-tab>
    </v-tabs>

    <v-tabs-items v-model="activeTab">
      <!-- Manual Generation Tab -->
      <v-tab-item>
        <v-card-text>
          <v-form @submit.prevent="handleGenerate">
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="promptText"
                  label="画像生成プロンプト"
                  placeholder="生成したい画像の説明を入力してください"
                  outlined
                  rows="3"
                  counter="500"
                  :disabled="isGenerating"
                ></v-textarea>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedStyle"
                  :items="styleOptions"
                  label="スタイル"
                  outlined
                  dense
                  :disabled="isGenerating"
                ></v-select>
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedSize"
                  :items="sizeOptions"
                  label="サイズ"
                  outlined
                  dense
                  :disabled="isGenerating"
                ></v-select>
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedQuality"
                  :items="qualityOptions"
                  label="品質"
                  outlined
                  dense
                  :disabled="isGenerating"
                ></v-select>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedPurpose"
                  :items="purposeOptions"
                  label="用途"
                  outlined
                  dense
                  :disabled="isGenerating"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="autoUpload"
                  label="自動アップロード"
                  :disabled="isGenerating"
                ></v-switch>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-btn
                  type="submit"
                  color="primary"
                  :loading="isGenerating"
                  :disabled="!promptText || isGenerating"
                  large
                >
                  <v-icon left>{{ mdiCreation }}</v-icon>
                  画像を生成
                </v-btn>

                <v-btn
                  @click="generateRandomPrompt"
                  color="secondary"
                  outlined
                  class="ml-2"
                  :disabled="isGenerating"
                >
                  <v-icon left>{{ mdiDice6 }}</v-icon>
                  ランダムプロンプト
                </v-btn>

                <v-btn
                  @click="optimizeCurrentPrompt"
                  color="info"
                  outlined
                  class="ml-2"
                  :disabled="!promptText || isGenerating"
                >
                  <v-icon left>{{ mdiAutoFix }}</v-icon>
                  プロンプト最適化
                </v-btn>
              </v-col>
            </v-row>
          </v-form>

          <!-- Generation Progress -->
          <div v-if="isGenerating || currentImage" class="mt-4">
            <v-card outlined>
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <span class="font-weight-bold">生成進行状況</span>
                  <v-spacer></v-spacer>
                  <v-chip 
                    :color="getStatusColor(currentImage?.status || 'generating')"
                    small
                    dark
                  >
                    {{ getStatusText(currentImage?.status || 'generating') }}
                  </v-chip>
                </div>

                <v-progress-linear
                  :value="generationProgress"
                  :color="isGenerating ? 'primary' : 'success'"
                  height="8"
                  class="mb-2"
                ></v-progress-linear>

                <div v-if="currentImage" class="text-caption">
                  <div>プロンプト: {{ currentImage.prompt }}</div>
                  <div v-if="currentImage.revisedPrompt">
                    修正されたプロンプト: {{ currentImage.revisedPrompt }}
                  </div>
                  <div v-if="processingTime > 0">
                    処理時間: {{ formatProcessingTime(processingTime) }}
                  </div>
                  <div v-if="estimatedCost > 0">
                    推定コスト: {{ formatCost(estimatedCost) }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Generated Image Preview -->
          <div v-if="currentImage && imageUrl" class="mt-4">
            <v-card outlined>
              <v-card-title class="text-h6">
                生成された画像
                <v-spacer></v-spacer>
                <v-btn
                  v-if="currentImage.status === 'generated'"
                  @click="uploadCurrentImage"
                  color="success"
                  :loading="isUploading"
                  small
                >
                  <v-icon left>{{ mdiUpload }}</v-icon>
                  アップロード
                </v-btn>
              </v-card-title>
              <v-card-text>
                <v-img
                  :src="imageUrl"
                  max-width="400"
                  max-height="400"
                  class="mx-auto"
                ></v-img>
              </v-card-text>
            </v-card>
          </div>
        </v-card-text>
      </v-tab-item>

      <!-- History Tab -->
      <v-tab-item>
        <v-card-text>
          <div class="d-flex align-center mb-4">
            <v-text-field
              v-model="historySearch"
              label="検索"
              prepend-inner-icon="mdi-magnify"
              outlined
              dense
              clearable
              class="mr-4"
            ></v-text-field>
            <v-select
              v-model="historyPurpose"
              :items="purposeOptions"
              label="用途でフィルター"
              outlined
              dense
              clearable
              class="mr-4"
              style="max-width: 200px;"
            ></v-select>
            <v-btn
              @click="refreshHistory"
              color="primary"
              outlined
              :loading="isLoadingHistory"
            >
              <v-icon left>{{ mdiRefresh }}</v-icon>
              更新
            </v-btn>
          </div>

          <v-data-table
            :headers="historyHeaders"
            :items="filteredHistory"
            :loading="isLoadingHistory"
            class="elevation-1"
            :items-per-page="10"
          >
            <template v-slot:item.status="{ item }">
              <v-chip 
                :color="getStatusColor(item.status)"
                small
                dark
              >
                {{ getStatusText(item.status) }}
              </v-chip>
            </template>

            <template v-slot:item.preview="{ item }">
              <v-img
                :src="item.storageUrl || item.originalUrl"
                width="80"
                height="80"
                class="my-2"
              ></v-img>
            </template>

            <template v-slot:item.prompt="{ item }">
              <div class="text-truncate" style="max-width: 200px;">
                {{ item.prompt }}
              </div>
            </template>

            <template v-slot:item.metadata="{ item }">
              <div class="text-caption">
                <div>{{ formatCost(item.metadata.estimatedCost) }}</div>
                <div>{{ formatProcessingTime(item.metadata.processingTime) }}</div>
              </div>
            </template>

            <template v-slot:item.generatedAt="{ item }">
              {{ formatDate(item.generatedAt) }}
            </template>

            <template v-slot:item.actions="{ item }">
              <v-btn
                @click="viewImageDetails(item)"
                icon
                small
              >
                <v-icon>{{ mdiEye }}</v-icon>
              </v-btn>
              <v-btn
                v-if="item.status === 'generated'"
                @click="uploadImage(item.id)"
                icon
                small
                color="success"
              >
                <v-icon>{{ mdiUpload }}</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-tab-item>

      <!-- Statistics Tab -->
      <v-tab-item>
        <v-card-text>
          <div class="d-flex align-center mb-4">
            <v-select
              v-model="statsPeriod"
              :items="periodOptions"
              label="期間"
              outlined
              dense
              style="max-width: 200px;"
              class="mr-4"
            ></v-select>
            <v-btn
              @click="refreshStats"
              color="primary"
              outlined
              :loading="isLoadingStats"
            >
              <v-icon left>{{ mdiRefresh }}</v-icon>
              更新
            </v-btn>
          </div>

          <v-row v-if="stats">
            <v-col cols="12" md="2">
              <v-card>
                <v-card-text class="text-center">
                  <div class="text-h4 primary--text">{{ stats.totalGenerated }}</div>
                  <div class="text-caption">総生成数</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card>
                <v-card-text class="text-center">
                  <div class="text-h4 green--text">{{ stats.totalUploaded }}</div>
                  <div class="text-caption">アップロード済み</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card>
                <v-card-text class="text-center">
                  <div class="text-h4 red--text">{{ stats.totalFailed }}</div>
                  <div class="text-caption">失敗</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card>
                <v-card-text class="text-center">
                  <div class="text-h4 orange--text">{{ formatCost(stats.totalCost) }}</div>
                  <div class="text-caption">総コスト</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card>
                <v-card-text class="text-center">
                  <div class="text-h4 blue--text">{{ formatProcessingTime(stats.averageProcessingTime) }}</div>
                  <div class="text-caption">平均処理時間</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card>
                <v-card-text class="text-center">
                  <div class="text-h4 purple--text">{{ stats.successRate.toFixed(1) }}%</div>
                  <div class="text-caption">成功率</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-card v-if="stats" class="mt-4">
            <v-card-title>成功率の詳細</v-card-title>
            <v-card-text>
              <v-progress-linear
                :value="stats.successRate"
                :color="stats.successRate > 90 ? 'green' : stats.successRate > 70 ? 'orange' : 'red'"
                height="20"
                class="mb-2"
              >
                <strong>{{ stats.successRate.toFixed(1) }}%</strong>
              </v-progress-linear>
              <div class="text-caption">
                期間: {{ stats.period }} | 
                成功: {{ stats.totalUploaded }} / 
                総数: {{ stats.totalGenerated }}
              </div>
            </v-card-text>
          </v-card>
        </v-card-text>
      </v-tab-item>
    </v-tabs-items>

    <!-- Image Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="800px">
      <v-card v-if="selectedImage">
        <v-card-title>
          画像詳細
          <v-spacer></v-spacer>
          <v-btn icon @click="detailsDialog = false">
            <v-icon>{{ mdiClose }}</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-img
                :src="selectedImage.storageUrl || selectedImage.originalUrl"
                max-width="100%"
              ></v-img>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-2">
                <strong>ID:</strong> {{ selectedImage.id }}
              </div>
              <div class="mb-2">
                <strong>ステータス:</strong>
                <v-chip 
                  :color="getStatusColor(selectedImage.status)"
                  small
                  dark
                  class="ml-2"
                >
                  {{ getStatusText(selectedImage.status) }}
                </v-chip>
              </div>
              <div class="mb-2">
                <strong>プロンプト:</strong> {{ selectedImage.prompt }}
              </div>
              <div v-if="selectedImage.revisedPrompt" class="mb-2">
                <strong>修正されたプロンプト:</strong> {{ selectedImage.revisedPrompt }}
              </div>
              <div class="mb-2">
                <strong>スタイル:</strong> {{ getStyleText(selectedImage.style) }}
              </div>
              <div class="mb-2">
                <strong>サイズ:</strong> {{ getSizeText(selectedImage.size) }}
              </div>
              <div class="mb-2">
                <strong>品質:</strong> {{ getQualityText(selectedImage.quality) }}
              </div>
              <div class="mb-2">
                <strong>用途:</strong> {{ selectedImage.purpose }}
              </div>
              <div class="mb-2">
                <strong>処理時間:</strong> {{ formatProcessingTime(selectedImage.metadata.processingTime) }}
              </div>
              <div class="mb-2">
                <strong>推定コスト:</strong> {{ formatCost(selectedImage.metadata.estimatedCost) }}
              </div>
              <div class="mb-2">
                <strong>生成日時:</strong> {{ formatDate(selectedImage.generatedAt) }}
              </div>
              <div v-if="selectedImage.uploadedAt" class="mb-2">
                <strong>アップロード日時:</strong> {{ formatDate(selectedImage.uploadedAt) }}
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            v-if="selectedImage.status === 'generated'"
            @click="uploadImage(selectedImage.id)"
            color="success"
            :loading="isUploading"
          >
            アップロード
          </v-btn>
          <v-btn @click="detailsDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useImageGeneration } from '~/composables/useImageGeneration'
import { 
  mdiImageMultiple,
  mdiCreation,
  mdiDice6,
  mdiAutoFix,
  mdiUpload,
  mdiRefresh,
  mdiEye,
  mdiClose
} from '@mdi/js'

const {
  currentImage,
  imageHistory,
  stats,
  isGenerating,
  isUploading,
  error,
  imageUrl,
  generationProgress,
  estimatedCost,
  processingTime,
  generateImage,
  uploadImage,
  optimizePrompt,
  generateRandomPrompt,
  fetchImageHistory,
  fetchStats,
  clearCurrentImage,
  getStatusColor,
  getStatusText,
  getStyleText,
  getSizeText,
  getQualityText,
  formatCost,
  formatProcessingTime,
  formatDate,
  ImageStyle,
  ImageSize,
  ImageQuality
} = useImageGeneration()

// Reactive state
const activeTab = ref(0)
const promptText = ref('')
const selectedStyle = ref(ImageStyle.VIVID)
const selectedSize = ref(ImageSize.SQUARE)
const selectedQuality = ref(ImageQuality.STANDARD)
const selectedPurpose = ref('admin')
const autoUpload = ref(true)

const historySearch = ref('')
const historyPurpose = ref('')
const isLoadingHistory = ref(false)

const statsPeriod = ref('week')
const isLoadingStats = ref(false)

const detailsDialog = ref(false)
const selectedImage = ref(null)

// Options
const styleOptions = [
  { text: '鮮やか', value: ImageStyle.VIVID },
  { text: '自然', value: ImageStyle.NATURAL }
]

const sizeOptions = [
  { text: '正方形 (1024x1024)', value: ImageSize.SQUARE },
  { text: '縦長 (1024x1792)', value: ImageSize.PORTRAIT },
  { text: '横長 (1792x1024)', value: ImageSize.LANDSCAPE }
]

const qualityOptions = [
  { text: 'スタンダード', value: ImageQuality.STANDARD },
  { text: 'HD', value: ImageQuality.HD }
]

const purposeOptions = [
  { text: '管理者テスト', value: 'admin' },
  { text: 'クイズ用', value: 'quiz' },
  { text: 'テスト', value: 'test' },
  { text: 'ユーザーリクエスト', value: 'user_request' }
]

const periodOptions = [
  { text: '1日', value: 'day' },
  { text: '1週間', value: 'week' },
  { text: '1ヶ月', value: 'month' }
]

const historyHeaders = [
  { text: 'プレビュー', value: 'preview', sortable: false },
  { text: 'プロンプト', value: 'prompt', sortable: false },
  { text: 'ステータス', value: 'status' },
  { text: 'スタイル', value: 'style' },
  { text: 'サイズ', value: 'size' },
  { text: 'コスト/時間', value: 'metadata', sortable: false },
  { text: '生成日時', value: 'generatedAt' },
  { text: '操作', value: 'actions', sortable: false }
]

// Computed
const filteredHistory = computed(() => {
  let filtered = imageHistory.value

  if (historySearch.value) {
    const search = historySearch.value.toLowerCase()
    filtered = filtered.filter(img => 
      img.prompt.toLowerCase().includes(search) ||
      img.id.toLowerCase().includes(search)
    )
  }

  if (historyPurpose.value) {
    filtered = filtered.filter(img => img.purpose === historyPurpose.value)
  }

  return filtered
})

// Methods
const handleGenerate = async () => {
  try {
    await generateImage({
      prompt: promptText.value,
      style: selectedStyle.value,
      size: selectedSize.value,
      quality: selectedQuality.value,
      purpose: selectedPurpose.value,
      autoUpload: autoUpload.value
    })
  } catch (error) {
    console.error('Generation failed:', error)
  }
}

const generateRandomPromptHandler = async () => {
  const randomPrompt = await generateRandomPrompt()
  promptText.value = randomPrompt
}

const optimizeCurrentPrompt = async () => {
  if (!promptText.value) return
  
  const result = await optimizePrompt(promptText.value)
  promptText.value = result.optimized
}

const uploadCurrentImage = async () => {
  if (!currentImage.value) return
  
  try {
    await uploadImage(currentImage.value.id)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

const refreshHistory = async () => {
  isLoadingHistory.value = true
  try {
    await fetchImageHistory(50, undefined, historyPurpose.value || undefined)
  } finally {
    isLoadingHistory.value = false
  }
}

const refreshStats = async () => {
  isLoadingStats.value = true
  try {
    await fetchStats(statsPeriod.value as 'day' | 'week' | 'month')
  } finally {
    isLoadingStats.value = false
  }
}

const viewImageDetails = (image: any) => {
  selectedImage.value = image
  detailsDialog.value = true
}

// Watchers
watch(statsPeriod, () => {
  refreshStats()
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    refreshHistory(),
    refreshStats()
  ])
})
</script>

<style scoped>
.v-img {
  border-radius: 8px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>