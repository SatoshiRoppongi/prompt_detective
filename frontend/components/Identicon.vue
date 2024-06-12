<template>
    <svg :id="elementId" :width="size" :height="size" viewBox="0 0 50 50">
    </svg>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as jdenticon from 'jdenticon'

const props = defineProps({
    value: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        default: 100
    }
})

const elementId = `identicon-${Math.random().toString(36).substr(2, 9)}`

console.log('for debug')
console.log(elementId)
console.log(props.value)

onMounted(() => {
    jdenticon.update(`#${elementId}`, props.value)
})
</script>

<style scoped>
svg {
    display: block;
}
</style>
