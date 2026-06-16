<script setup lang="ts">
import { computed, h } from 'vue'
import { LoginOutlined, LogoutOutlined, UserAddOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { userLogout } from '@/api/userController'
import { useLoginUserStore } from '@/stores/loginUser'

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
const loginUserStore = useLoginUserStore()
const { loginUser } = storeToRefs(loginUserStore)

const selectedKeys = computed(() => {
  const matchedItem = props.menuItems.find(
    (item) => route.path === item.path || route.path.startsWith(`${item.path}/`),
  )
  return matchedItem ? [matchedItem.key] : []
})

const menuOptions = computed(() =>
  props.menuItems.map((item) => ({
    key: item.key,
    label: item.label,
  })),
)

const isLoggedIn = computed(() => Boolean(loginUser.value?.id))

const handleMenuClick = ({ key }: { key: string }) => {
  const target = props.menuItems.find((item) => item.key === key)
  if (target && target.path !== route.path) {
    router.push(target.path)
  }
}

const handleLoginClick = () => {
  router.push('/user/login')
}

const handleRegisterClick = () => {
  router.push('/user/register')
}

const handleLogout = async () => {
  try {
    const res = await userLogout()
    if (res.data.code === 0 && res.data.data) {
      loginUserStore.clearLoginUser()
      message.success('已退出登录')
      await router.push('/user/login')
      return
    }
    message.error(res.data.message || '退出登录失败')
  } catch (error) {
    console.error('user logout failed', error)
    message.error('退出登录失败，请稍后重试')
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
        <template v-if="isLoggedIn">
          <a-space size="middle">
            <a-typography-text class="global-header__user-name">
              {{ loginUser.userName || loginUser.userAccount || '当前用户' }}
            </a-typography-text>
            <a-button :icon="h(LogoutOutlined)" @click="handleLogout">退出登录</a-button>
          </a-space>
        </template>
        <template v-else>
          <a-space size="small">
            <a-button :icon="h(UserAddOutlined)" @click="handleRegisterClick">注册</a-button>
            <a-button type="primary" :icon="h(LoginOutlined)" @click="handleLoginClick">登录</a-button>
          </a-space>
        </template>
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
  background: rgba(255, 255, 255, 0.82);
  border-bottom: 1px solid rgba(5, 5, 5, 0.06);
  backdrop-filter: blur(18px);
}

.global-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: min(100%, 1280px);
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
  color: #141414;
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
  font-weight: 700;
  white-space: nowrap;
}

.global-header__menu {
  flex: 1;
  min-width: 0;
  background: transparent;
  border-bottom: none;
}

.global-header__right {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.global-header__user-name {
  max-width: 180px;
  color: #595959;
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

  .global-header__user-name {
    max-width: 120px;
  }
}
</style>
