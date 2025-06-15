<template>
  <v-app>
    <v-app-bar app color="error">
      <v-toolbar-title>管理者パネル - プロンプト探偵</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn @click="refreshAllData" icon>
        <v-icon>{{ mdiRefresh }}</v-icon>
      </v-btn>
    </v-app-bar>
    
    <v-main>
      <v-container>
        <!-- Navigation Tabs -->
        <v-row>
          <v-col cols="12">
            <v-tabs v-model="activeTab" bg-color="transparent" color="primary">
              <v-tab value="overview">概要</v-tab>
              <v-tab value="games">ゲーム管理</v-tab>
              <v-tab value="scheduler">スケジューラー</v-tab>
            </v-tabs>
          </v-col>
        </v-row>

        <!-- Overview Tab -->
        <v-window v-model="activeTab">
          <v-window-item value="overview">
            <!-- System Status Overview -->
            <v-row>
              <v-col cols="12">
                <h2>システム状況</h2>
              </v-col>
            </v-row>
        
        <v-row>
          <v-col cols="3">
            <v-card>
              <v-card-title class="text-center">
                <v-icon large color="green">{{ mdiGamepadVariant }}</v-icon>
                <br>アクティブゲーム
              </v-card-title>
              <v-card-text class="text-center">
                <div class="text-h4">{{ systemStatus.activeGames || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="3">
            <v-card>
              <v-card-title class="text-center">
                <v-icon large color="blue">{{ mdiAccountMultiple }}</v-icon>
                <br>24時間の参加者
              </v-card-title>
              <v-card-text class="text-center">
                <div class="text-h4">{{ systemStatus.recentParticipants || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="3">
            <v-card>
              <v-card-title class="text-center">
                <v-icon large color="orange">{{ mdiTrophy }}</v-icon>
                <br>完了ゲーム(24h)
              </v-card-title>
              <v-card-text class="text-center">
                <div class="text-h4">{{ systemStatus.completedGamesLast24h || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="3">
            <v-card>
              <v-card-title class="text-center">
                <v-icon large :color="systemStatus.serverStatus === 'healthy' ? 'green' : 'red'">
                  {{ mdiServer }}
                </v-icon>
                <br>サーバー状態
              </v-card-title>
              <v-card-text class="text-center">
                <v-chip :color="systemStatus.serverStatus === 'healthy' ? 'green' : 'red'" dark>
                  {{ systemStatus.serverStatus === 'healthy' ? '正常' : 'エラー' }}
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

          </v-window-item>

          <!-- Games Management Tab -->
          <v-window-item value="games">
            <!-- Active Games Management -->
            <v-row class="mt-6">
              <v-col cols="12">
                <h2>アクティブゲーム管理</h2>
              </v-col>
            </v-row>
        
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title>
                現在のアクティブゲーム
                <v-spacer></v-spacer>
                <v-btn color="orange" @click="showEmergencyGameDialog = true">
                  緊急ゲーム作成
                </v-btn>
              </v-card-title>
              
              <v-card-text>
                <v-data-table
                  :headers="gameHeaders"
                  :items="activeGames"
                  :loading="loading"
                  class="elevation-1"
                >
                  <template v-slot:item.endTime="{ item }">
                    {{ formatTime(item.endTime) }}
                  </template>
                  
                  <template v-slot:item.status="{ item }">
                    <v-chip :color="getStatusColor(item.status)" dark small>
                      {{ getStatusText(item.status) }}
                    </v-chip>
                  </template>
                  
                  <template v-slot:item.actions="{ item }">
                    <v-btn icon @click="viewGameDetails(item)" color="blue">
                      <v-icon>{{ mdiEye }}</v-icon>
                    </v-btn>
                    <v-btn icon @click="handleExtendGame(item)" color="orange">
                      <v-icon>{{ mdiClockPlus }}</v-icon>
                    </v-btn>
                    <v-btn icon @click="handleForceEndGame(item)" color="red">
                      <v-icon>{{ mdiStop }}</v-icon>
                    </v-btn>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Emergency Game Creation Dialog -->
        <v-dialog v-model="showEmergencyGameDialog" max-width="600px">
          <v-card>
            <v-card-title>緊急ゲーム作成</v-card-title>
            <v-card-text>
              <v-form v-model="emergencyGameValid">
                <v-text-field
                  v-model="emergencyGame.secretPrompt"
                  label="シークレットプロンプト"
                  :rules="[rules.required]"
                  required
                ></v-text-field>
                
                <v-text-field
                  v-model="emergencyGame.imageName"
                  label="画像名"
                  :rules="[rules.required]"
                  required
                ></v-text-field>
                
                <v-slider
                  v-model="emergencyGame.duration"
                  label="ゲーム時間（分）"
                  min="10"
                  max="180"
                  step="10"
                  thumb-label
                ></v-slider>
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn @click="showEmergencyGameDialog = false">キャンセル</v-btn>
              <v-btn 
                color="orange" 
                @click="handleCreateEmergencyGame"
                :disabled="!emergencyGameValid"
              >
                作成
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Game Details Dialog -->
        <v-dialog v-model="showGameDetailsDialog" max-width="800px">
          <v-card v-if="selectedGame">
            <v-card-title>ゲーム詳細: {{ selectedGame.id }}</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>作成日時:</strong> {{ formatTime(selectedGame.createdAt) }}
                </v-col>
                <v-col cols="6">
                  <strong>終了予定:</strong> {{ formatTime(selectedGame.endTime) }}
                </v-col>
                <v-col cols="6">
                  <strong>参加者数:</strong> {{ selectedGame.participantCount || 0 }}
                </v-col>
                <v-col cols="6">
                  <strong>ポット:</strong> {{ selectedGame.pot || 0 }} SOL
                </v-col>
                <v-col cols="12">
                  <strong>シークレットプロンプト:</strong><br>
                  {{ selectedGame.secretPrompt }}
                </v-col>
              </v-row>
              
              <h3 class="mt-4">参加者一覧</h3>
              <v-data-table
                :headers="participantHeaders"
                :items="selectedGame.participants || []"
                density="compact"
              >
                <template v-slot:item.createdAt="{ item }">
                  {{ formatTime(item.createdAt) }}
                </template>
              </v-data-table>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn @click="showGameDetailsDialog = false">閉じる</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
          </v-window-item>

          <!-- Scheduler Management Tab -->
          <v-window-item value="scheduler">
            <v-row class="mt-6">
              <v-col cols="12">
                <h2>スケジューラー管理</h2>
              </v-col>
            </v-row>

            <!-- Scheduler Status Cards -->
            <v-row>
              <v-col cols="3">
                <v-card>
                  <v-card-title class="text-center">
                    <v-icon large :color="schedulerStatus.config?.enabled ? 'green' : 'red'">
                      {{ mdiClock }}
                    </v-icon>
                    <br>スケジューラー状態
                  </v-card-title>
                  <v-card-text class="text-center">
                    <v-chip :color="schedulerStatus.config?.enabled ? 'green' : 'red'" dark>
                      {{ schedulerStatus.config?.enabled ? '有効' : '無効' }}
                    </v-chip>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="3">
                <v-card>
                  <v-card-title class="text-center">
                    <v-icon large color="blue">{{ mdiHistory }}</v-icon>
                    <br>総実行回数
                  </v-card-title>
                  <v-card-text class="text-center">
                    <div class="text-h4">{{ schedulerStatus.stats?.totalRuns || 0 }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="3">
                <v-card>
                  <v-card-title class="text-center">
                    <v-icon large color="green">{{ mdiCheckCircle }}</v-icon>
                    <br>成功率
                  </v-card-title>
                  <v-card-text class="text-center">
                    <div class="text-h4">
                      {{ getSuccessRate() }}%
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="3">
                <v-card>
                  <v-card-title class="text-center">
                    <v-icon large color="orange">{{ mdiGamepadVariant }}</v-icon>
                    <br>生成ゲーム数
                  </v-card-title>
                  <v-card-text class="text-center">
                    <div class="text-h4">{{ schedulerStatus.stats?.totalGamesGenerated || 0 }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Scheduler Controls -->
            <v-row class="mt-6">
              <v-col cols="12">
                <v-card>
                  <v-card-title>
                    スケジューラー制御
                    <v-spacer></v-spacer>
                    <v-btn 
                      :color="schedulerStatus.config?.enabled ? 'red' : 'green'"
                      @click="toggleSchedulerStatus"
                    >
                      {{ schedulerStatus.config?.enabled ? 'スケジューラー停止' : 'スケジューラー開始' }}
                    </v-btn>
                    <v-btn 
                      color="primary" 
                      class="ml-2"
                      @click="runSchedulerManually"
                      :disabled="!schedulerStatus.config?.enabled"
                    >
                      手動実行
                    </v-btn>
                  </v-card-title>
                  
                  <v-card-text>
                    <v-row>
                      <v-col cols="6">
                        <v-text-field
                          v-model="schedulerSettings.interval"
                          label="実行間隔"
                          hint="例: every day 19:00"
                          persistent-hint
                        ></v-text-field>
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model="schedulerSettings.minParticipants"
                          label="最小参加者数"
                          type="number"
                          hint="この数以下の場合は新ゲーム生成をスキップ"
                          persistent-hint
                        ></v-text-field>
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model="schedulerSettings.defaultDuration"
                          label="デフォルトゲーム時間（時間）"
                          type="number"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="6">
                        <v-switch
                          v-model="schedulerSettings.autoGeneration"
                          label="自動ゲーム生成"
                          color="primary"
                        ></v-switch>
                      </v-col>
                    </v-row>
                    
                    <v-btn 
                      color="primary" 
                      @click="updateSchedulerSettings"
                      class="mt-3"
                    >
                      設定を保存
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Scheduler Run History -->
            <v-row class="mt-6">
              <v-col cols="12">
                <v-card>
                  <v-card-title>実行履歴</v-card-title>
                  <v-card-text>
                    <v-data-table
                      :headers="schedulerHistoryHeaders"
                      :items="schedulerHistory"
                      :loading="loading"
                      class="elevation-1"
                    >
                      <template v-slot:item.timestamp="{ item }">
                        {{ formatTime(item.timestamp) }}
                      </template>
                      
                      <template v-slot:item.status="{ item }">
                        <v-chip :color="getSchedulerStatusColor(item.status)" dark small>
                          {{ getSchedulerStatusText(item.status) }}
                        </v-chip>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>

      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { 
  mdiRefresh, 
  mdiGamepadVariant, 
  mdiAccountMultiple, 
  mdiTrophy, 
  mdiServer,
  mdiEye,
  mdiClockPlus,
  mdiStop,
  mdiClock,
  mdiHistory,
  mdiCheckCircle
} from '@mdi/js';
import { useAdmin } from '~/composables/useAdmin';

// Admin authentication check
const router = useRouter();

// For now, we'll simulate admin access
// In production, this should check Firebase Auth with admin role
const isAdmin = ref(true);

if (!isAdmin.value) {
  router.push('/');
}

// Use admin composable
const {
  loading,
  systemStatus,
  activeGames,
  fetchGameDetails,
  forceEndGame,
  extendGame,
  createEmergencyGame,
  refreshData
} = useAdmin();
const activeTab = ref('overview');
const showEmergencyGameDialog = ref(false);
const showGameDetailsDialog = ref(false);
const selectedGame = ref(null);

// Scheduler management state
const schedulerStatus = ref({
  config: null,
  stats: null
});

const schedulerHistory = ref([]);

const schedulerSettings = ref({
  interval: 'every day 19:00',
  minParticipants: 2,
  defaultDuration: 24,
  autoGeneration: true
});

const emergencyGameValid = ref(false);
const emergencyGame = ref({
  secretPrompt: '',
  imageName: '',
  duration: 60
});

// Table headers
const gameHeaders = [
  { title: 'ゲームID', key: 'id' },
  { title: '参加者数', key: 'participantCount' },
  { title: 'ポット', key: 'pot' },
  { title: '終了予定', key: 'endTime' },
  { title: 'ステータス', key: 'status' },
  { title: 'アクション', key: 'actions', sortable: false }
];

const participantHeaders = [
  { title: 'ウォレット', key: 'walletAddress' },
  { title: 'ベット額', key: 'bet' },
  { title: 'スコア', key: 'score' },
  { title: '参加時刻', key: 'createdAt' }
];

const schedulerHistoryHeaders = [
  { title: '実行時刻', key: 'timestamp' },
  { title: 'ステータス', key: 'status' },
  { title: '生成ゲーム数', key: 'gamesGenerated' },
  { title: 'エラー', key: 'error' }
];

// Validation rules
const rules = {
  required: (value: any) => !!value || '必須項目です'
};

// Methods are now provided by useAdmin composable

const formatTime = (timestamp: any) => {
  if (!timestamp) return '-';
  
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleString('ja-JP');
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green';
    case 'completed': return 'blue';
    case 'force-ended': return 'red';
    default: return 'grey';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return 'アクティブ';
    case 'completed': return '完了';
    case 'force-ended': return '強制終了';
    default: return status;
  }
};

const viewGameDetails = async (game: any) => {
  const gameDetails = await fetchGameDetails(game.id);
  if (gameDetails) {
    selectedGame.value = gameDetails;
    showGameDetailsDialog.value = true;
  }
};

const handleExtendGame = async (game: any) => {
  const extensionMinutes = prompt('延長時間を分単位で入力してください:', '30');
  if (extensionMinutes && !isNaN(Number(extensionMinutes))) {
    const success = await extendGame(game.id, Number(extensionMinutes));
    if (success) {
      alert(`ゲーム ${game.id} を ${extensionMinutes} 分延長しました`);
      await refreshData();
    }
  }
};

const handleForceEndGame = async (game: any) => {
  const reason = prompt('ゲーム終了の理由を入力してください:');
  if (reason) {
    const confirm = window.confirm(`ゲーム ${game.id} を強制終了しますか？`);
    if (confirm) {
      const success = await forceEndGame(game.id, reason);
      if (success) {
        alert(`ゲーム ${game.id} を強制終了しました`);
        await refreshData();
      }
    }
  }
};

const handleCreateEmergencyGame = async () => {
  try {
    const success = await createEmergencyGame(
      emergencyGame.value.secretPrompt,
      emergencyGame.value.imageName,
      emergencyGame.value.duration
    );
    
    if (success) {
      alert('緊急ゲームを作成しました');
      showEmergencyGameDialog.value = false;
      
      // Reset form
      emergencyGame.value = {
        secretPrompt: '',
        imageName: '',
        duration: 60
      };
      
      await refreshData();
    }
  } catch (error) {
    console.error('Error creating emergency game:', error);
    alert('緊急ゲームの作成に失敗しました');
  }
};

// Scheduler management functions
const getSuccessRate = () => {
  const stats = schedulerStatus.value.stats;
  if (!stats || stats.totalRuns === 0) return 0;
  return Math.round((stats.successfulRuns / stats.totalRuns) * 100);
};

const getSchedulerStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'green';
    case 'failed': return 'red';
    case 'skipped': return 'orange';
    default: return 'grey';
  }
};

const getSchedulerStatusText = (status: string) => {
  switch (status) {
    case 'success': return '成功';
    case 'failed': return '失敗';
    case 'skipped': return 'スキップ';
    default: return status;
  }
};

const fetchSchedulerData = async () => {
  try {
    // Mock data for development
    // In production, replace with actual API calls
    schedulerStatus.value = {
      config: {
        enabled: true,
        interval: 'every day 19:00',
        minParticipants: 2,
        defaultDuration: 24,
        autoGeneration: true
      },
      stats: {
        totalRuns: 15,
        successfulRuns: 12,
        failedRuns: 2,
        skippedRuns: 1,
        totalGamesGenerated: 12
      }
    };

    schedulerHistory.value = [
      {
        id: '1',
        timestamp: new Date(),
        status: 'success',
        gamesGenerated: 1,
        error: null
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 86400000),
        status: 'skipped',
        gamesGenerated: 0,
        error: 'Minimum participants not met'
      }
    ];

    // Update settings form with current config
    if (schedulerStatus.value.config) {
      Object.assign(schedulerSettings.value, schedulerStatus.value.config);
    }
  } catch (error) {
    console.error('Error fetching scheduler data:', error);
  }
};

const toggleSchedulerStatus = async () => {
  try {
    const newStatus = !schedulerStatus.value.config?.enabled;
    
    // Mock API call - in production, replace with actual API
    // await api.post('/admin/scheduler/toggle', { enabled: newStatus });
    
    schedulerStatus.value.config.enabled = newStatus;
    alert(`スケジューラーを${newStatus ? '有効' : '無効'}にしました`);
  } catch (error) {
    console.error('Error toggling scheduler:', error);
    alert('スケジューラーの状態変更に失敗しました');
  }
};

const runSchedulerManually = async () => {
  try {
    const confirm = window.confirm('スケジューラーを手動実行しますか？');
    if (!confirm) return;

    // Mock API call - in production, replace with actual API
    // const result = await api.post('/admin/scheduler/run');
    
    alert('スケジューラーの手動実行が完了しました');
    await fetchSchedulerData();
  } catch (error) {
    console.error('Error running scheduler manually:', error);
    alert('スケジューラーの手動実行に失敗しました');
  }
};

const updateSchedulerSettings = async () => {
  try {
    // Mock API call - in production, replace with actual API
    // await api.put('/admin/scheduler/settings', schedulerSettings.value);
    
    Object.assign(schedulerStatus.value.config, schedulerSettings.value);
    alert('スケジューラー設定を更新しました');
  } catch (error) {
    console.error('Error updating scheduler settings:', error);
    alert('スケジューラー設定の更新に失敗しました');
  }
};

// Enhanced refresh function to include scheduler data
const refreshAllData = async () => {
  await Promise.all([
    refreshData(),
    fetchSchedulerData()
  ]);
};

// Initialize data
onMounted(() => {
  refreshAllData();
});
</script>

<style scoped>
.v-card-title {
  padding: 16px;
}

.text-center {
  text-align: center;
}
</style>