<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { GithubOutlined } from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'
import GlobalHeader from '@/components/GlobalHeader.vue'
import logoSrc from '@/assets/logo.png'
import { useLoginUserStore } from '@/stores/loginUser'

const loginUserStore = useLoginUserStore()
const { loginUser } = storeToRefs(loginUserStore)

const menuItems = computed(() => {
  const items = [
    {
      key: 'home',
      label: '首页',
      path: '/',
    },
  ]

  if (loginUser.value.userRole === 'admin') {
    items.push(
      {
        key: 'app-manage',
        label: '应用管理',
        path: '/admin/appManage',
      },
      {
        key: 'user-manage',
        label: '用户管理',
        path: '/admin/userManage',
      },
    )
  }

  return items
})

onMounted(() => {
  loginUserStore.fetchLoginUser()
})
</script>

<template>
  <a-layout class="basic-layout">
    <GlobalHeader title="NoCode 平台" :menu-items="menuItems" :logo-src="logoSrc" />

    <a-layout-content class="basic-layout__content">
      <div class="basic-layout__content-inner">
        <RouterView />
      </div>
    </a-layout-content>

    <a-layout-footer class="basic-layout__footer">
      <a
        class="basic-layout__footer-link"
        href="https://github.com/Xpc1489588006/no-code-front"
        target="_blank"
        rel="noreferrer"
      >
        <GithubOutlined />
        <span>Xpc1489588006/no-code-front</span>
      </a>
    </a-layout-footer>
  </a-layout>
</template>

<style scoped>
.basic-layout {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(66, 211, 146, 0.14), transparent 28%),
    radial-gradient(circle at right 30%, rgba(24, 144, 255, 0.16), transparent 30%),
    linear-gradient(180deg, #f7fbff 0%, #f5f7fa 35%, #eef5ff 100%);
}

.basic-layout__content {
  padding: 24px;
}

.basic-layout__content-inner {
  width: min(100%, 1280px);
  min-height: calc(100vh - 64px - 72px);
  margin: 0 auto;
}

.basic-layout__footer {
  padding: 20px 24px 32px;
  text-align: center;
  background: transparent;
}

.basic-layout__footer-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #595959;
  font-size: 14px;
}

.basic-layout__footer-link:hover {
  color: #1677ff;
}

@media (max-width: 768px) {
  .basic-layout__content {
    padding: 16px;
  }

  .basic-layout__content-inner {
    min-height: calc(100vh - 140px - 72px);
  }
}
</style>
