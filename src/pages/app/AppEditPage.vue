<template>
  <section class="app-edit-page">
    <a-card :bordered="false" class="app-edit-page__card">
      <div class="app-edit-page__head">
        <h1 class="app-edit-page__title">应用信息修改</h1>
        <p class="app-edit-page__subtitle">普通用户只能修改自己的应用名称。</p>
      </div>

      <a-form layout="vertical" :model="formState">
        <a-form-item label="应用名称" :rules="[{ required: true, message: '请输入应用名称' }]">
          <a-input v-model:value="formState.appName" maxlength="32" show-count />
        </a-form-item>

        <a-form-item v-if="isAdmin" label="封面地址">
          <a-input v-model:value="formState.cover" allow-clear placeholder="请输入封面 URL" />
        </a-form-item>

        <a-form-item v-if="isAdmin" label="优先级">
          <a-input-number v-model:value="formState.priority" class="app-edit-page__priority" :min="0" />
        </a-form-item>

        <a-space>
          <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
          <a-button @click="router.back()">返回</a-button>
        </a-space>
      </a-form>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppByIdForAdmin, getAppVoById, updateApp, updateAppByAdmin } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'
import { isAppEditableByUser } from '@/utils/app'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const saving = ref(false)
const appDetail = ref<API.AppVO>()

const formState = reactive({
  id: undefined as number | string | undefined,
  appName: '',
  cover: '',
  priority: 0,
})

const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')

const loadDetail = async () => {
  const id = String(route.params.id || '')
  if (!id) {
    message.error('应用 ID 无效')
    return
  }

  const res = isAdmin.value ? await getAppByIdForAdmin({ id }) : await getAppVoById({ id })
  if (res.data.code === 0 && res.data.data) {
    const data = res.data.data as API.AppVO
    appDetail.value = data
    if (!isAppEditableByUser(data, loginUserStore.loginUser)) {
      message.warning('你没有权限编辑该应用')
      await router.replace('/')
      return
    }
    formState.id = data.id
    formState.appName = data.appName || ''
    formState.cover = data.cover || ''
    formState.priority = data.priority || 0
    return
  }
  message.error(res.data.message || '加载应用失败')
}

const handleSave = async () => {
  if (!formState.id) {
    message.error('缺少应用 ID')
    return
  }
  if (!formState.appName.trim()) {
    message.warning('请输入应用名称')
    return
  }

  saving.value = true
  try {
    const res = isAdmin.value
      ? await updateAppByAdmin({
          id: formState.id,
          appName: formState.appName.trim(),
          cover: formState.cover.trim() || undefined,
          priority: formState.priority,
        })
      : await updateApp({
          id: formState.id,
          appName: formState.appName.trim(),
        })

    if (res.data.code === 0 && res.data.data) {
      message.success('保存成功')
      await router.back()
      return
    }
    message.error(res.data.message || '保存失败')
  } catch (error) {
    console.error('update app failed', error)
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loginUserStore.fetchLoginUser()
  await loadDetail()
})
</script>

<style scoped>
.app-edit-page {
  display: grid;
  place-items: start center;
}

.app-edit-page__card {
  width: min(100%, 720px);
  border-radius: 8px;
}

.app-edit-page__head {
  margin-bottom: 24px;
}

.app-edit-page__title {
  margin: 0 0 8px;
  font-size: 28px;
}

.app-edit-page__subtitle {
  margin: 0;
  color: #8c8c8c;
}

.app-edit-page__priority {
  width: 180px;
}
</style>
