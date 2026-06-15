<script setup lang="ts">
import { computed, h } from 'vue'
import { UserOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'

interface MenuItem {
  key: string
  label: string
  path: string
}

const props = defineProps<{
  title?: string
  menuItems: MenuItem[]
  logoSrc: string
}>()

const route = useRoute()
const router = useRouter()

const selectedKeys = computed(() => {
  const matchedItem = props.menuItems.find((item) => route.path === item.path || route.path.startsWith(`${item.path}/`))
  return matchedItem ? [matchedItem.key] : []
})

const menuOptions = computed(() =>
  props.menuItems.map((item) => ({
    key: item.key,
    label: item.label,
  })),
)

const handleMenuClick = ({ key }: { key: string }) => {
  const target = props.menuItems.find((item) => item.key === key)
  if (target && target.path !== route.path) {
    router.push(target.path)
  }
}
</script>

<template>
  <a-layout-header class="global-header">
    <div class="global-header__inner">
      <div class="global-header__left">
        <RouterLink class="global-header__brand" to="/">
          <img :src="logoSrc" alt="logo" class="global-header__logo" />
          <span class="global-header__title">{{ title ?? 'no-code-front' }}</span>
        </RouterLink>
        <a-menu
          mode="horizontal"
          :items="menuOptions"
          :selected-keys="selectedKeys"
          class="global-header__menu"
          @click="handleMenuClick"
        />
      </div>
      <div class="global-header__right">
        <a-button type="primary" :icon="h(UserOutlined)">登录</a-button>
      </div>
    </div>
  </a-layout-header>
</template>

<style scoped>
.global-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 64px;
  padding-inline: 0;
  line-height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}

.global-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: min(100%, 1200px);
  height: 100%;
  margin: 0 auto;
  padding-inline: 24px;
}

.global-header__left {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  flex: 1;
}

.global-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: #1f1f1f;
}

.global-header__brand:hover {
  color: #1677ff;
}

.global-header__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex: 0 0 auto;
}

.global-header__title {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.global-header__menu {
  flex: 1;
  min-width: 0;
  border-bottom: none;
}

.global-header__right {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

@media (max-width: 768px) {
  .global-header {
    height: auto;
    line-height: normal;
  }

  .global-header__inner {
    align-items: flex-start;
    flex-direction: column;
    padding-block: 12px;
  }

  .global-header__left {
    width: 100%;
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .global-header__menu {
    width: 100%;
  }

  .global-header__right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
