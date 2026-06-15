<script setup lang="ts">
import { onMounted } from 'vue'
import { GithubOutlined, HomeOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons-vue'
import GlobalHeader from '@/components/GlobalHeader.vue'
import logoSrc from '@/assets/logo.png'
import { useLoginUserStore } from '@/stores/loginUser'

const menuItems = [
  {
    key: 'home',
    label: '首页',
    path: '/',
    icon: HomeOutlined,
  },
  {
    key: 'app-manage',
    label: '应用管理',
    path: '/admin/appManage',
    icon: MessageOutlined,
  },
  {
    key: 'user-manage',
    label: '用户管理',
    path: '/admin/userManage',
    icon: UserOutlined,
  },
]

const loginUserStore = useLoginUserStore()

onMounted(() => {
  loginUserStore.fetchLoginUser()
})
</script>

<template>
  <a-layout class="basic-layout">
    <GlobalHeader title="No Code 平台" :menu-items="menuItems" :logo-src="logoSrc" />

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
  background: #f5f7fa;
}

.basic-layout__content {
  padding: 24px;
}

.basic-layout__content-inner {
  width: min(100%, 1200px);
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
