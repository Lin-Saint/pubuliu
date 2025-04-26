<script setup>
import WaterfallFlow from './components/WaterfallFlow.vue'
</script>

<template>
  <div class="app-container">
    <WaterfallFlow />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  max-width: 100vw;
  min-height: 100vh;
  background: #f5f5f5;
}
</style>
