<template>
  <section class="app-chat-page">
    <header class="app-chat-page__header">
      <div class="app-chat-page__title-wrap">
        <a-dropdown trigger="click">
          <a-button class="app-chat-page__title-btn">
            <template #icon>
              <DownOutlined />
            </template>
            {{ appName }}
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="handleEdit">编辑应用</a-menu-item>
              <a-menu-item @click="handleDeploy">部署应用</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-tag v-if="deployUrl" color="green">已部署</a-tag>
      </div>
      <a-button type="primary" :loading="deploying" @click="handleDeploy">部署</a-button>
    </header>

    <div class="app-chat-page__body">
      <section class="app-chat-page__chat">
        <div class="chat-panel">
          <div ref="messageListRef" class="chat-panel__messages">
            <div v-for="item in messages" :key="item.id" class="chat-message" :class="`chat-message--${item.role}`">
              <a-avatar v-if="item.role === 'assistant'" class="chat-message__avatar">AI</a-avatar>
              <div class="chat-message__bubble">
                <div class="chat-message__content" v-html="renderContent(item.content)"></div>
              </div>
            </div>
          </div>

          <a-spin :spinning="sending">
            <a-textarea
              v-model:value="draft"
              :auto-size="{ minRows: 4, maxRows: 8 }"
              class="chat-panel__input"
              placeholder="继续输入问题，AI 会在左侧实时生成回复"
            />
            <div class="chat-panel__actions">
              <a-button @click="restoreInitPrompt">使用初始提示词</a-button>
              <a-button type="primary" :loading="sending" @click="sendMessage">发送</a-button>
            </div>
          </a-spin>
        </div>
      </section>

      <section class="app-chat-page__preview">
        <div class="preview-panel">
          <div class="preview-panel__toolbar">
            <span>网页展示</span>
            <a-button size="small" :href="previewUrl" target="_blank" :disabled="!previewUrl">打开预览</a-button>
          </div>
          <iframe v-if="previewUrl" :src="previewUrl" class="preview-panel__frame" />
          <a-empty v-else description="等待代码生成完成后展示" />
        </div>
      </section>
    </div>

    <a-modal v-model:open="deployModalVisible" title="部署结果" ok-text="关闭" cancel-text="复制链接" @cancel="copyDeployUrl">
      <a-input v-model:value="deployUrl" readonly />
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DownOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { deployApp, getAppVoById } from '@/api/appController'
import { API_BASE_URL } from '@/request'
import { useLoginUserStore } from '@/stores/loginUser'
import { getAppPreviewUrl, normalizeAppName } from '@/utils/app'
import { streamSse } from '@/utils/sse'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const appId = computed(() => String(route.params.id || ''))

const appData = ref<API.AppVO>()
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const sending = ref(false)
const deploying = ref(false)
const deployUrl = ref('')
const deployModalVisible = ref(false)
const messageListRef = ref<HTMLElement>()
const abortController = ref<AbortController>()

const appName = computed(() => normalizeAppName(appData.value?.appName))
const previewUrl = computed(() => getAppPreviewUrl(appData.value))

const loadApp = async () => {
  if (!appId.value) {
    message.error('应用 ID 无效')
    return
  }

  const res = await getAppVoById({ id: appId.value })
  if (res.data.code === 0 && res.data.data) {
    appData.value = res.data.data
    draft.value = res.data.data.initPrompt || ''
    if (!messages.value.length && res.data.data.initPrompt) {
      messages.value.push({
        id: Date.now(),
        role: 'user',
        content: res.data.data.initPrompt,
      })
      await sendMessage(res.data.data.initPrompt)
    }
    return
  }
  message.error(res.data.message || '加载应用失败')
}

const scrollToBottom = () => {
  requestAnimationFrame(() => {
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

const restoreInitPrompt = () => {
  draft.value = appData.value?.initPrompt || draft.value
}

const escapeHtml = (content: string) =>
  content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderContent = (content: string) => escapeHtml(content).replace(/\n/g, '<br/>')

const parseStreamPayload = (payload: string) => {
  const trimmedPayload = payload.trim()
  if (!trimmedPayload || trimmedPayload === '[DONE]') {
    return ''
  }

  try {
    const data = JSON.parse(payload)
    if (typeof data === 'string') {
      return data
    }
    if (typeof data?.d === 'string') {
      return data.d
    }
    if (typeof data?.data === 'string') {
      return data.data
    }
    if (typeof data?.content === 'string') {
      return data.content
    }
    return ''
  } catch {
    return payload
  }
}

const formatGeneratedContent = (content: string) => {
  try {
    const files = JSON.parse(content) as Record<string, unknown>
    if (!files || Array.isArray(files) || typeof files !== 'object') {
      return content
    }

    const fileNames = Object.keys(files)
    if (!fileNames.length) {
      return content
    }

    return ['生成完成，已更新以下文件：', ...fileNames.map((fileName) => `- ${fileName}`)].join('\n')
  } catch {
    return content
  }
}

const sendMessage = async (content?: string) => {
  const text = (content ?? draft.value).trim()
  if (!text || !appId.value) {
    message.warning('请输入内容')
    return
  }

  sending.value = true
  const userMessage = content ? null : { id: Date.now(), role: 'user' as const, content: text }
  if (userMessage) {
    messages.value.push(userMessage)
  }
  const assistantMessage: ChatMessage = { id: Date.now() + 1, role: 'assistant', content: '' }
  messages.value.push(assistantMessage)
  scrollToBottom()

  abortController.value?.abort()
  abortController.value = new AbortController()

  try {
    await streamSse({
      url: `${API_BASE_URL}/app/chat/gen/code?appId=${appId.value}&message=${encodeURIComponent(text)}`,
      signal: abortController.value.signal,
      withCredentials: true,
      onMessage(payload) {
        assistantMessage.content += parseStreamPayload(payload)
        scrollToBottom()
      },
    })
    assistantMessage.content = formatGeneratedContent(assistantMessage.content)
    await loadPreview()
  } catch (error) {
    console.error('chat generate failed', error)
    assistantMessage.content = assistantMessage.content || '生成失败，请重试'
    message.error('生成失败，请重试')
  } finally {
    sending.value = false
  }
}

const loadPreview = async () => {
  if (!appId.value) {
    return
  }
  const res = await getAppVoById({ id: appId.value })
  if (res.data.code === 0 && res.data.data) {
    appData.value = res.data.data
  }
}

const handleDeploy = async () => {
  if (!appId.value) {
    return
  }
  deploying.value = true
  try {
    const res = await deployApp({ appId: appId.value })
    if (res.data.code === 0 && res.data.data) {
      deployUrl.value = res.data.data
      deployModalVisible.value = true
      message.success('部署成功')
      return
    }
    message.error(res.data.message || '部署失败')
  } catch (error) {
    console.error('deploy app failed', error)
    message.error('部署失败，请稍后重试')
  } finally {
    deploying.value = false
  }
}

const copyDeployUrl = async () => {
  if (!deployUrl.value) {
    return
  }
  await navigator.clipboard.writeText(deployUrl.value)
  message.success('已复制')
}

const handleEdit = () => {
  if (appId.value) {
    router.push(`/app/edit/${appId.value}`)
  }
}

watch(
  () => route.params.id,
  async () => {
    await loadApp()
  },
)

onMounted(async () => {
  await loginUserStore.fetchLoginUser()
  await loadApp()
  scrollToBottom()
})

onUnmounted(() => {
  abortController.value?.abort()
})
</script>

<style scoped>
.app-chat-page {
  display: grid;
  gap: 16px;
}

.app-chat-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.app-chat-page__title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-chat-page__title-btn {
  display: inline-flex;
  align-items: center;
}

.app-chat-page__body {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 220px);
}

.chat-panel,
.preview-panel {
  display: grid;
  gap: 12px;
  height: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(5, 5, 5, 0.06);
  border-radius: 8px;
}

.chat-panel__messages {
  display: grid;
  align-content: start;
  gap: 12px;
  overflow: auto;
  min-height: 520px;
  padding-right: 4px;
}

.chat-message {
  display: flex;
  gap: 8px;
}

.chat-message--user {
  justify-content: flex-end;
}

.chat-message--assistant {
  justify-content: flex-start;
}

.chat-message__bubble {
  max-width: min(100%, 78%);
  padding: 12px 14px;
  background: #f5f7fa;
  border-radius: 8px;
}

.chat-message--user .chat-message__bubble {
  background: #dff2ff;
}

.chat-message__content {
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-panel__input {
  width: 100%;
}

.chat-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.preview-panel {
  min-height: 100%;
}

.preview-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-panel__frame {
  width: 100%;
  min-height: 720px;
  border: 0;
  border-radius: 8px;
  background: #fff;
}

@media (max-width: 1200px) {
  .app-chat-page__body {
    grid-template-columns: 1fr;
  }
}
</style>
