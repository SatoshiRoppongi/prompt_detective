<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-settings</v-icon>
            OpenAI API Cost Controls
          </v-card-title>
          
          <v-card-text>
            <v-row>
              <!-- Current Status -->
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title class="text-h6">Current Status</v-card-title>
                  <v-card-text>
                    <v-chip 
                      :color="status.openaiApiEnabled ? 'success' : 'error'"
                      :prepend-icon="status.openaiApiEnabled ? 'mdi-check' : 'mdi-close'"
                      class="mb-2"
                    >
                      OpenAI API {{ status.openaiApiEnabled ? 'Enabled' : 'Disabled' }}
                    </v-chip>
                    
                    <v-chip 
                      :color="status.autoGameGenerationEnabled ? 'success' : 'error'"
                      :prepend-icon="status.autoGameGenerationEnabled ? 'mdi-check' : 'mdi-close'"
                      class="mb-2 ml-2"
                    >
                      Auto Game Generation {{ status.autoGameGenerationEnabled ? 'Enabled' : 'Disabled' }}
                    </v-chip>
                    
                    <v-divider class="my-3"></v-divider>
                    
                    <div class="text-body-1 mb-2">
                      <strong>Daily Image Limit:</strong> {{ status.limit }}
                    </div>
                    <div class="text-body-1 mb-2">
                      <strong>Images Generated Today:</strong> {{ status.limit - status.remaining }}
                    </div>
                    <div class="text-body-1 mb-2">
                      <strong>Remaining:</strong> {{ status.remaining }}
                    </div>
                    
                    <v-progress-linear
                      :model-value="((status.limit - status.remaining) / status.limit) * 100"
                      :color="status.remaining > 0 ? 'success' : 'error'"
                      height="8"
                      class="mt-2"
                    ></v-progress-linear>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <!-- Quick Actions -->
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title class="text-h6">Quick Actions</v-card-title>
                  <v-card-text>
                    <v-btn
                      :color="status.openaiApiEnabled ? 'error' : 'success'"
                      :prepend-icon="status.openaiApiEnabled ? 'mdi-stop' : 'mdi-play'"
                      @click="toggleOpenAI"
                      :loading="loading.openai"
                      block
                      class="mb-3"
                    >
                      {{ status.openaiApiEnabled ? 'Stop' : 'Start' }} OpenAI API
                    </v-btn>
                    
                    <v-btn
                      :color="status.autoGameGenerationEnabled ? 'error' : 'success'"
                      :prepend-icon="status.autoGameGenerationEnabled ? 'mdi-stop' : 'mdi-play'"
                      @click="toggleAutoGeneration"
                      :loading="loading.autoGeneration"
                      block
                      class="mb-3"
                    >
                      {{ status.autoGameGenerationEnabled ? 'Stop' : 'Start' }} Auto Game Generation
                    </v-btn>
                    
                    <v-btn
                      color="warning"
                      prepend-icon="mdi-refresh"
                      @click="resetDailyCount"
                      :loading="loading.reset"
                      block
                      class="mb-3"
                    >
                      Reset Daily Counter
                    </v-btn>
                    
                    <v-btn
                      color="info"
                      prepend-icon="mdi-refresh"
                      @click="refreshStatus"
                      :loading="loading.refresh"
                      block
                    >
                      Refresh Status
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            
            <!-- Daily Limit Configuration -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-title class="text-h6">Daily Limit Configuration</v-card-title>
                  <v-card-text>
                    <v-row align="center">
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="newLimit"
                          label="Daily Image Generation Limit"
                          type="number"
                          min="1"
                          max="100"
                          hint="Set the maximum number of images that can be generated per day"
                          persistent-hint
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-btn
                          color="primary"
                          prepend-icon="mdi-content-save"
                          @click="updateDailyLimit"
                          :loading="loading.updateLimit"
                          :disabled="!newLimit || newLimit <= 0"
                        >
                          Update Limit
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            
            <!-- Emergency Actions -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card variant="outlined" color="error">
                  <v-card-title class="text-h6 text-error">
                    <v-icon left>mdi-alert</v-icon>
                    Emergency Controls
                  </v-card-title>
                  <v-card-text>
                    <v-alert
                      type="warning"
                      variant="tonal"
                      class="mb-4"
                    >
                      Use these controls only when you need to immediately stop all OpenAI API usage to prevent additional costs.
                    </v-alert>
                    
                    <v-btn
                      color="error"
                      prepend-icon="mdi-stop-circle"
                      @click="emergencyStop"
                      :loading="loading.emergency"
                      size="large"
                    >
                      Emergency Stop All OpenAI Usage
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Success/Error Messages -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
interface ImageGenerationStatus {
  canGenerate: boolean;
  remaining: number;
  limit: number;
  openaiApiEnabled: boolean;
  autoGameGenerationEnabled: boolean;
  manualApprovalRequired: boolean;
}

const { $api } = useNuxtApp();

const status = ref<ImageGenerationStatus>({
  canGenerate: false,
  remaining: 0,
  limit: 0,
  openaiApiEnabled: false,
  autoGameGenerationEnabled: false,
  manualApprovalRequired: false
});

const newLimit = ref<number>(10);

const loading = ref({
  openai: false,
  autoGeneration: false,
  reset: false,
  refresh: false,
  updateLimit: false,
  emergency: false
});

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const showMessage = (message: string, color: 'success' | 'error' | 'warning' = 'success') => {
  snackbar.value = { show: true, message, color };
};

const refreshStatus = async () => {
  loading.value.refresh = true;
  try {
    const response = await $api.get('/admin/images/status');
    if (response.success) {
      status.value = response.data;
      newLimit.value = status.value.limit;
    }
  } catch (error: any) {
    showMessage(`Failed to refresh status: ${error.message}`, 'error');
  } finally {
    loading.value.refresh = false;
  }
};

const toggleOpenAI = async () => {
  loading.value.openai = true;
  try {
    const response = await $api.post('/admin/openai/toggle', {
      enabled: !status.value.openaiApiEnabled
    });
    
    if (response.success) {
      status.value.openaiApiEnabled = !status.value.openaiApiEnabled;
      showMessage(response.message);
    } else {
      showMessage('Failed to toggle OpenAI API', 'error');
    }
  } catch (error: any) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    loading.value.openai = false;
  }
};

const toggleAutoGeneration = async () => {
  loading.value.autoGeneration = true;
  try {
    const response = await $api.post('/admin/generation/toggle', {
      enabled: !status.value.autoGameGenerationEnabled
    });
    
    if (response.success) {
      status.value.autoGameGenerationEnabled = !status.value.autoGameGenerationEnabled;
      showMessage(response.message);
    } else {
      showMessage('Failed to toggle auto generation', 'error');
    }
  } catch (error: any) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    loading.value.autoGeneration = false;
  }
};

const resetDailyCount = async () => {
  loading.value.reset = true;
  try {
    const response = await $api.post('/admin/images/reset');
    
    if (response.success) {
      await refreshStatus();
      showMessage('Daily counter reset successfully');
    } else {
      showMessage('Failed to reset daily counter', 'error');
    }
  } catch (error: any) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    loading.value.reset = false;
  }
};

const updateDailyLimit = async () => {
  loading.value.updateLimit = true;
  try {
    const response = await $api.put('/admin/images/limit', {
      limit: newLimit.value
    });
    
    if (response.success) {
      status.value.limit = newLimit.value;
      showMessage(`Daily limit updated to ${newLimit.value}`);
    } else {
      showMessage('Failed to update daily limit', 'error');
    }
  } catch (error: any) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    loading.value.updateLimit = false;
  }
};

const emergencyStop = async () => {
  if (!confirm('Are you sure you want to immediately stop all OpenAI API usage? This will disable both image generation and auto game generation.')) {
    return;
  }
  
  loading.value.emergency = true;
  try {
    // Stop both OpenAI API and auto generation
    await Promise.all([
      $api.post('/admin/openai/toggle', { enabled: false }),
      $api.post('/admin/generation/toggle', { enabled: false })
    ]);
    
    status.value.openaiApiEnabled = false;
    status.value.autoGameGenerationEnabled = false;
    showMessage('Emergency stop activated - All OpenAI usage stopped', 'warning');
  } catch (error: any) {
    showMessage(`Emergency stop failed: ${error.message}`, 'error');
  } finally {
    loading.value.emergency = false;
  }
};

// Load status on component mount
onMounted(() => {
  refreshStatus();
});
</script>