<template>
  <div class="home-page">
    <h1>首页</h1>
  </div>
</template>

<script setup lang="ts">
// 首页
import { healthCheck } from '@/api/healthController.ts'

healthCheck().then((res) => {
  console.log(res)
})

</script>

<style scoped>
.home-page {
  padding: 20px;
}
</style>
