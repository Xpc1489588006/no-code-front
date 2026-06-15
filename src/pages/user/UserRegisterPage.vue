<template>
  <section class="register-page">
    <div class="register-page__intro">
      <div class="register-page__badge">Create Account</div>
      <h1 class="register-page__title">注册新的平台账号</h1>
      <p class="register-page__desc">
        完成注册后即可进入 No Code 平台，管理应用、用户和对话内容。
      </p>
      <div class="register-page__stats">
        <div class="register-page__stat">
          <strong>1</strong>
          <span>创建账号</span>
        </div>
        <div class="register-page__stat">
          <strong>2</strong>
          <span>登录系统</span>
        </div>
        <div class="register-page__stat">
          <strong>3</strong>
          <span>开始管理</span>
        </div>
      </div>
    </div>

    <a-card class="register-page__card" :bordered="false">
      <div class="register-page__card-header">
        <h2 class="register-page__card-title">用户注册</h2>
        <p class="register-page__card-subtitle">请使用至少 8 位密码完成注册</p>
      </div>

      <a-form layout="vertical" :model="formState" autocomplete="off" @finish="handleSubmit">
        <a-form-item
          label="账号"
          name="userAccount"
          :rules="[
            { required: true, message: '请输入账号' },
            { min: 4, message: '账号不能少于 4 位' },
          ]"
        >
          <a-input v-model:value="formState.userAccount" size="large" placeholder="请输入账号" />
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

        <a-form-item
          label="确认密码"
          name="checkPassword"
          :rules="[
            { required: true, message: '请再次输入密码' },
            { validator: validateConfirmPassword },
          ]"
        >
          <a-input-password
            v-model:value="formState.checkPassword"
            size="large"
            placeholder="请再次输入密码"
          />
        </a-form-item>

        <div class="register-page__actions">
          <span class="register-page__actions-tip">已经有账号？</span>
          <RouterLink to="/user/login">去登录</RouterLink>
        </div>

        <a-form-item class="register-page__submit">
          <a-button type="primary" html-type="submit" size="large" block :loading="submitting">
            注册并前往登录
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { userRegister } from '@/api/userController'

const router = useRouter()
const submitting = ref(false)

const formState = reactive<Required<API.UserRegisterRequest>>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const validateConfirmPassword = async () => {
  if (!formState.checkPassword) {
    return Promise.reject('请再次输入密码')
  }
  if (formState.checkPassword !== formState.userPassword) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const handleSubmit = async (values: API.UserRegisterRequest) => {
  submitting.value = true
  try {
    const res = await userRegister(values)
    if (res.data.code === 0 && res.data.data) {
      message.success('注册成功，请登录')
      await router.push('/user/login')
      return
    }
    message.error(res.data.message || '注册失败')
  } catch (error) {
    console.error('user register failed', error)
    message.error('注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.register-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
  gap: 24px;
  align-items: stretch;
  min-height: 100%;
  padding: 40px 0;
}

.register-page__intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 520px;
  padding: 48px;
  color: #f5f7fa;
  background:
    linear-gradient(135deg, rgba(19, 52, 59, 0.88), rgba(19, 194, 194, 0.72)),
    url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80')
      center / cover;
  border-radius: 8px;
}

.register-page__badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 32px;
  padding: 0 12px;
  margin-bottom: 20px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
}

.register-page__title {
  margin: 0 0 16px;
  font-size: 40px;
  line-height: 1.2;
}

.register-page__desc {
  max-width: 520px;
  margin: 0 0 28px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.88);
}

.register-page__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.register-page__stat {
  display: grid;
  gap: 8px;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
}

.register-page__stat strong {
  font-size: 24px;
  line-height: 1;
}

.register-page__stat span {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.84);
}

.register-page__card {
  align-self: center;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.register-page__card-header {
  margin-bottom: 24px;
}

.register-page__card-title {
  margin: 0 0 8px;
  font-size: 28px;
  color: #1f1f1f;
}

.register-page__card-subtitle {
  margin: 0;
  color: #8c8c8c;
}

.register-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 24px;
  font-size: 14px;
}

.register-page__actions-tip {
  color: #8c8c8c;
}

.register-page__submit {
  margin-bottom: 0;
}

@media (max-width: 960px) {
  .register-page {
    grid-template-columns: 1fr;
    padding: 24px 0;
  }

  .register-page__intro {
    min-height: 320px;
    padding: 32px 24px;
  }

  .register-page__title {
    font-size: 32px;
  }

  .register-page__card {
    width: min(100%, 480px);
    justify-self: center;
  }
}

@media (max-width: 640px) {
  .register-page__stats {
    grid-template-columns: 1fr;
  }

  .register-page__title {
    font-size: 28px;
  }
}
</style>
