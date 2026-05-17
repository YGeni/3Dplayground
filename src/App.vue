<script setup>
import { defineAsyncComponent } from 'vue'

const Showroom = defineAsyncComponent(() => import('./components/Showroom.vue'))
</script>

<template>
  <div class="app">
    <Showroom />
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  overflow: hidden;
  background-color: #000000;
}

.app {
  width: 100vw;
  height: 100vh;
}
</style>
