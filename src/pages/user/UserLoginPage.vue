<template>
  <section class="login-page">
    <div class="login-page__hero">
      <div class="login-page__hero-badge">No Code Platform</div>
      <h1 class="login-page__hero-title">登录你的工作台</h1>
      <p class="login-page__hero-desc">
        从应用设计到对话管理，在一个界面里继续你的配置和协作。
      </p>
      <ul class="login-page__hero-points">
        <li>统一管理应用、用户与对话数据</li>
        <li>支持登录后自动回跳到原目标页面</li>
        <li>延续当前项目的后台管理体验</li>
      </ul>
    </div>

    <a-card class="login-page__card" :bordered="false">
      <div class="login-page__card-header">
        <h2 class="login-page__card-title">用户登录</h2>
        <p class="login-page__card-subtitle">输入账号和密码进入系统</p>
      </div>

      <a-form
        layout="vertical"
        :model="formState"
        autocomplete="off"
        @finish="handleSubmit"
      >
        <a-form-item
          label="账号"
          name="userAccount"
          :rules="[{ required: true, message: '请输入账号' }]"
        >
          <a-input
            v-model:value="formState.userAccount"
            size="large"
            placeholder="请输入账号"
          />
        </a-form-item>

        <a-form-item
          label="密码"
          name="userPassword"
          :rules="[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码不能少于 8 位' },
          ]"
        >
          <a-input-password
            v-model:value="formState.userPassword"
            size="large"
            placeholder="请输入密码"
          />
        </a-form-item>

        <div class="login-page__actions">
          <span class="login-page__actions-tip">还没有账号？</span>
          <RouterLink to="/user/register">立即注册</RouterLink>
        </div>

        <a-form-item class="login-page__submit">
          <a-button type="primary" html-type="submit" size="large" block :loading="submitting">
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { userLogin } from '@/api/userController'
import { useLoginUserStore } from '@/stores/loginUser'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()
const submitting = ref(false)

const formState = reactive<Required<API.UserLoginRequest>>({
  userAccount: '',
  userPassword: '',
})

const resolveRedirectPath = () => {
  const redirect = route.query.redirect
  if (typeof redirect !== 'string' || !redirect) {
    return '/'
  }

  try {
    const redirectUrl = new URL(redirect)
    if (redirectUrl.origin === window.location.origin) {
      return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
    }
  } catch {
    if (redirect.startsWith('/')) {
      return redirect
    }
  }

  return '/'
}

const handleSubmit = async (values: API.UserLoginRequest) => {
  submitting.value = true
  try {
    const res = await userLogin(values)
    if (res.data.code === 0 && res.data.data) {
      await loginUserStore.fetchLoginUser()
      message.success('登录成功')
      await router.replace(resolveRedirectPath())
      return
    }
    message.error(res.data.message || '登录失败')
  } catch (error) {
    console.error('user login failed', error)
    message.error('登录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 420px);
  gap: 24px;
  align-items: stretch;
  min-height: 100%;
  padding: 40px 0;
}

.login-page__hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 520px;
  padding: 48px;
  color: #f5f7fa;
  background:
    linear-gradient(135deg, rgba(7, 29, 73, 0.88), rgba(24, 144, 255, 0.8)),
    url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80')
      center / cover;
  border-radius: 8px;
}

.login-page__hero-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 32px;
  padding: 0 12px;
  margin-bottom: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
}

.login-page__hero-title {
  margin: 0 0 16px;
  font-size: 40px;
  line-height: 1.2;
}

.login-page__hero-desc {
  max-width: 520px;
  margin: 0 0 24px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.88);
}

.login-page__hero-points {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.login-page__hero-points li {
  position: relative;
  padding-left: 18px;
}

.login-page__hero-points li::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 0;
  width: 6px;
  height: 6px;
  background: #ffffff;
  border-radius: 50%;
}

.login-page__card {
  align-self: center;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.login-page__card-header {
  margin-bottom: 24px;
}

.login-page__card-title {
  margin: 0 0 8px;
  font-size: 28px;
  color: #1f1f1f;
}

.login-page__card-subtitle {
  margin: 0;
  color: #8c8c8c;
}

.login-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 24px;
  font-size: 14px;
}

.login-page__actions-tip {
  color: #8c8c8c;
}

.login-page__submit {
  margin-bottom: 0;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 24px 0;
  }

  .login-page__hero {
    min-height: 320px;
    padding: 32px 24px;
  }

  .login-page__hero-title {
    font-size: 32px;
  }

  .login-page__card {
    width: min(100%, 480px);
    justify-self: center;
  }
}

@media (max-width: 640px) {
  .login-page__hero {
    min-height: 280px;
  }

  .login-page__hero-title {
    font-size: 28px;
  }
}
</style>
