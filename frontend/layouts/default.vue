<template>
  <div>
    <NuxtPage />
  </div>
</template>

<style>
/* Mobile-specific CSS improvements */
@media (max-width: 599px) {
  .v-card-title {
    font-size: 1.1rem !important;
    line-height: 1.3 !important;
    padding: 12px 16px !important;
  }
  
  .v-card-text {
    padding: 12px 16px !important;
  }
  
  .v-btn {
    min-width: auto !important;
  }
  
  .v-btn--large {
    height: 44px !important;
    min-width: 88px !important;
  }
  
  .v-text-field .v-input__control {
    min-height: 48px !important;
  }
  
  .v-textarea textarea {
    font-size: 16px !important;
  }
  
  .v-data-table {
    overflow-x: auto !important;
  }
  
  .v-tabs-bar {
    overflow-x: auto !important;
  }
  
  .v-tab {
    min-width: auto !important;
    padding: 0 12px !important;
  }
  
  .v-chip {
    font-size: 0.75rem !important;
    height: 24px !important;
  }
  
  .v-alert {
    margin: 8px 0 !important;
    padding: 12px !important;
  }
  
  .v-dialog {
    margin: 12px !important;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .v-btn {
    min-height: 44px !important;
  }
  
  .v-input--selection-controls .v-input__control {
    min-height: 44px !important;
  }
}

/* Mobile utility classes */
.mobile-stack {
  display: flex;
  flex-direction: column;
}

@media (min-width: 600px) {
  .mobile-stack {
    flex-direction: row;
  }
}

.wallet-address {
  font-family: monospace;
  font-size: 0.875rem;
  word-break: break-all;
}

@media (max-width: 599px) {
  .wallet-address {
    font-size: 0.75rem;
    display: block;
    margin-top: 4px;
  }
}

.hide-on-mobile {
  display: block;
}

@media (max-width: 599px) {
  .hide-on-mobile {
    display: none !important;
  }
}

.show-on-mobile {
  display: none;
}

@media (max-width: 599px) {
  .show-on-mobile {
    display: block !important;
  }
}
</style>