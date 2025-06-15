<template>
  <v-alert
    v-if="errorState.hasError"
    type="error"
    :dismissible="dismissible"
    @click:close="clearError"
    class="mb-4"
  >
    <div class="d-flex align-center">
      <v-icon class="mr-2">$mdiAlertCircle</v-icon>
      <div class="flex-grow-1">
        <div class="font-weight-bold">エラーが発生しました</div>
        <div class="text-body-2 mt-1">{{ friendlyMessage }}</div>
      </div>
      <v-btn
        v-if="errorState.isRetryable && showRetry"
        @click="$emit('retry')"
        color="white"
        variant="outlined"
        size="small"
        class="ml-2"
      >
        再試行
      </v-btn>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { mdiAlertCircle } from '@mdi/js';
import { useErrorHandler, type ErrorState } from '~/composables/useErrorHandler';

interface Props {
  errorState: ErrorState;
  dismissible?: boolean;
  showRetry?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  dismissible: true,
  showRetry: true
});

const emit = defineEmits<{
  retry: [];
}>();

const { clearError, showUserFriendlyError } = useErrorHandler();

const friendlyMessage = computed(() => {
  return showUserFriendlyError(props.errorState);
});
</script>