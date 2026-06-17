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
            <div class="chat-panel__history-action">
              <a-button
                v-if="hasMoreHistory"
                type="link"
                size="small"
                :loading="loadingMoreHistory"
                @click="loadMoreHistory"
              >
                加载更多
              </a-button>
            </div>

            <a-spin :spinning="loadingHistory">
              <template v-if="messages.length">
                <div
                  v-for="item in messages"
                  :key="item.id"
                  class="chat-message"
                  :class="`chat-message--${item.role}`"
                >
                  <a-avatar v-if="item.role === 'assistant'" class="chat-message__avatar">AI</a-avatar>
                  <div class="chat-message__bubble">
                    <div class="chat-message__content" v-html="renderContent(item.content)"></div>
                  </div>
                </div>
              </template>
              <a-empty v-else class="chat-panel__empty" description="暂无对话记录" />
            </a-spin>
          </div>

          <a-textarea
            v-model:value="draft"
            :auto-size="{ minRows: 4, maxRows: 8 }"
            class="chat-panel__input"
            placeholder="继续输入问题，AI 会在左侧实时生成回复"
            :disabled="sending"
          />
          <div class="chat-panel__actions">
            <a-button :disabled="sending" @click="restoreInitPrompt">使用初始提示词</a-button>
            <a-button type="primary" :loading="sending" @click="sendMessage()">发送</a-button>
          </div>
        </div>
      </section>

      <section class="app-chat-page__preview">
        <div class="preview-panel">
          <div class="preview-panel__toolbar">
            <span>网页展示</span>
            <a-button size="small" :href="previewUrl" target="_blank" :disabled="!previewUrl">打开预览</a-button>
          </div>
          <iframe v-if="previewReady && previewUrl" :src="previewUrl" class="preview-panel__frame" />
          <a-empty v-else description="等待代码生成完成后展示" />
        </div>
      </section>
    </div>

    <a-modal
      v-model:open="deployModalVisible"
      title="部署结果"
      ok-text="关闭"
      cancel-text="复制链接"
      @cancel="copyDeployUrl"
    >
      <a-input v-model:value="deployUrl" readonly />
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DownOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { deployApp, getAppVoById } from '@/api/appController'
import { addChatHistory, listChatHistoryVoByPage } from '@/api/chatHistoryController'
import { API_BASE_URL } from '@/request'
import { useLoginUserStore } from '@/stores/loginUser'
import { getAppPreviewUrl, normalizeAppName } from '@/utils/app'
import { streamSse } from '@/utils/sse'

interface ChatMessage {
  id: number | string
  role: 'user' | 'assistant'
  content: string
  createTime?: string
}

const HISTORY_PAGE_SIZE = 10

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const appId = computed(() => String(route.params.id || ''))

const appData = ref<API.AppVO>()
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const loadingHistory = ref(false)
const loadingMoreHistory = ref(false)
const hasMoreHistory = ref(false)
const historyTotal = ref(0)
const sending = ref(false)
const deploying = ref(false)
const deployUrl = ref('')
const deployModalVisible = ref(false)
const messageListRef = ref<HTMLElement>()
const abortController = ref<AbortController>()
const previewReady = ref(false)

const appName = computed(() => normalizeAppName(appData.value?.appName))
const previewUrl = computed(() => getAppPreviewUrl(appData.value))
const isOwnApp = computed(() => Boolean(appData.value?.userId && appData.value.userId === loginUserStore.loginUser.id))

const loadApp = async () => {
  if (!appId.value) {
    message.error('应用 ID 无效')
    return
  }

  const res = await getAppVoById({ id: appId.value })
  if (res.data.code === 0 && res.data.data) {
    appData.value = res.data.data
    draft.value = res.data.data.initPrompt || ''
    return
  }
  message.error(res.data.message || '加载应用失败')
}

const toChatMessage = (item: API.ChatHistoryVO): ChatMessage => ({
  id: item.id || `${item.messageType}-${item.createTime}-${Math.random()}`,
  role: item.messageType === 'ai' ? 'assistant' : 'user',
  content: item.content || item.errorMessage || '',
  createTime: item.createTime,
})

const sortMessagesByCreateTime = (list: ChatMessage[]) =>
  [...list].sort((a, b) => {
    const left = a.createTime ? new Date(a.createTime).getTime() : Number.MAX_SAFE_INTEGER
    const right = b.createTime ? new Date(b.createTime).getTime() : Number.MAX_SAFE_INTEGER
    return left - right
  })

const mergeHistoryMessages = (historyList: ChatMessage[]) => {
  const messageMap = new Map<number | string, ChatMessage>()
  ;[...historyList, ...messages.value].forEach((item) => {
    messageMap.set(item.id, item)
  })
  messages.value = sortMessagesByCreateTime(Array.from(messageMap.values()))
}

const getOldestHistoryCursor = () => messages.value.find((item) => item.createTime)?.createTime

const updateMessageById = (messageId: number | string, content: string) => {
  const target = messages.value.find((item) => item.id === messageId)
  if (target) {
    target.content = content
  }
}

const loadHistory = async (cursor?: string) => {
  if (!appId.value) {
    return []
  }

  const res = await listChatHistoryVoByPage({
    appId: appId.value,
    pageNum: 1,
    pageSize: HISTORY_PAGE_SIZE,
    cursor,
  })

  if (res.data.code === 0 && res.data.data) {
    const records = res.data.data.records || []
    const historyMessages = sortMessagesByCreateTime(records.map(toChatMessage))
    historyTotal.value = res.data.data.totalRow || records.length
    hasMoreHistory.value = cursor ? records.length >= HISTORY_PAGE_SIZE : historyTotal.value > records.length
    return historyMessages
  }

  message.error(res.data.message || '加载对话历史失败')
  return []
}

const loadInitialHistory = async () => {
  loadingHistory.value = true
  try {
    const historyMessages = await loadHistory()
    messages.value = historyMessages
    previewReady.value = historyMessages.length >= 2 || (await checkPreviewExists(appData.value))
    await nextTick()
    scrollToBottom()
    return historyMessages
  } catch (error) {
    console.error('load chat history failed', error)
    message.error('加载对话历史失败，请稍后重试')
    return []
  } finally {
    loadingHistory.value = false
  }
}

const loadMoreHistory = async () => {
  const cursor = getOldestHistoryCursor()
  if (!cursor || loadingMoreHistory.value) {
    return
  }

  loadingMoreHistory.value = true
  const oldScrollHeight = messageListRef.value?.scrollHeight || 0
  try {
    const historyMessages = await loadHistory(cursor)
    mergeHistoryMessages(historyMessages)
    await nextTick()
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight - oldScrollHeight
    }
  } catch (error) {
    console.error('load more chat history failed', error)
    message.error('加载更多失败，请稍后重试')
  } finally {
    loadingMoreHistory.value = false
  }
}

const initializePage = async () => {
  messages.value = []
  hasMoreHistory.value = false
  previewReady.value = false
  await loadApp()
  const historyMessages = await loadInitialHistory()
  if (isOwnApp.value && historyMessages.length === 0 && appData.value?.initPrompt) {
    await sendMessage(appData.value.initPrompt, { preserveDraft: true })
  }
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
    const parsed = JSON.parse(content) as Record<string, unknown>
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return content
    }

    const generatedText = extractPreviewTextFromJson(content)
    if (generatedText.trim()) {
      return generatedText
    }

    if (typeof parsed.description === 'string' && parsed.description.trim()) {
      return parsed.description
    }

    if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
      return parsed.reply
    }

    const fileNames = Object.keys(parsed)
    if (!fileNames.length) {
      return content
    }

    return ['生成完成，已更新以下文件：', ...fileNames.map((fileName) => `- ${fileName}`)].join('\n')
  } catch {
    return content
  }
}

const decodeJsonStringValue = (value: string) =>
  value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')

const findJsonStringEnd = (content: string, startIndex: number) => {
  let escaping = false
  for (let i = startIndex; i < content.length; i += 1) {
    const char = content[i]
    if (escaping) {
      escaping = false
      continue
    }
    if (char === '\\') {
      escaping = true
      continue
    }
    if (char === '"') {
      return i
    }
  }
  return -1
}

const extractStreamingJsonField = (jsonText: string, fieldName: string) => {
  const keyMatch = new RegExp(`"${fieldName}"\\s*:`).exec(jsonText)
  if (!keyMatch) {
    return ''
  }

  const valueStartSearchIndex = keyMatch.index + keyMatch[0].length
  const valueQuoteIndex = jsonText.indexOf('"', valueStartSearchIndex)
  if (valueQuoteIndex === -1) {
    return ''
  }

  const valueStartIndex = valueQuoteIndex + 1
  const valueEndIndex = findJsonStringEnd(jsonText, valueStartIndex)
  const rawValue =
    valueEndIndex === -1
      ? jsonText.slice(valueStartIndex)
      : jsonText.slice(valueStartIndex, valueEndIndex)

  return decodeJsonStringValue(rawValue)
}

const extractPreviewTextFromJson = (jsonText: string) => {
  const fields = ['reply', 'description', 'html', 'htmlCode', 'cssCode', 'jsCode']
  for (const field of fields) {
    const value = extractStreamingJsonField(jsonText, field)
    if (value) {
      return value
    }
  }
  return ''
}

const saveChatHistory = async (body: API.ChatHistoryAddRequest) => {
  const res = await addChatHistory(body)
  if (res.data.code !== 0) {
    throw new Error(res.data.message || '保存对话历史失败')
  }
  return res.data.data
}

const sendMessage = async (content?: string, options?: { preserveDraft?: boolean }) => {
  const text = (content ?? draft.value).trim()
  if (!text || !appId.value) {
    message.warning('请输入内容')
    return
  }

  sending.value = true
  const now = Date.now()
  const userMessage: ChatMessage = {
    id: `local-user-${now}`,
    role: 'user',
    content: text,
    createTime: new Date(now).toISOString(),
  }
  const assistantMessage: ChatMessage = {
    id: `local-ai-${now}`,
    role: 'assistant',
    content: '正在生成...',
    createTime: new Date(now + 1).toISOString(),
  }
  messages.value.push(userMessage, assistantMessage)
  const assistantMessageId = assistantMessage.id
  scrollToBottom()

  abortController.value?.abort()
  abortController.value = new AbortController()

  try {
    let streamText = ''
    let assistantContent = ''

    const userHistoryId = await saveChatHistory({
      appId: appId.value,
      messageType: 'user',
      content: text,
    })
    if (userHistoryId) {
      userMessage.id = userHistoryId
    }

    await streamSse({
      url: `${API_BASE_URL}/app/chat/gen/code?appId=${appId.value}&message=${encodeURIComponent(text)}`,
      signal: abortController.value.signal,
      withCredentials: true,
      onMessage(payload) {
        const chunk = parseStreamPayload(payload)
        if (!chunk) {
          return
        }

        streamText += chunk
        const previewText = extractPreviewTextFromJson(streamText)
        if (previewText) {
          assistantContent = previewText
          updateMessageById(assistantMessageId, assistantContent)
        } else {
          assistantContent += chunk
          updateMessageById(assistantMessageId, assistantContent)
        }
        scrollToBottom()
      },
    })

    const finalContent = formatGeneratedContent(streamText || assistantContent)
    updateMessageById(assistantMessageId, finalContent)

    const aiHistoryId = await saveChatHistory({
      appId: appId.value,
      messageType: 'ai',
      content: finalContent,
    })
    if (aiHistoryId) {
      assistantMessage.id = aiHistoryId
    }
    historyTotal.value += 2
    if (!options?.preserveDraft) {
      draft.value = ''
    }
    await loadPreview()
  } catch (error) {
    console.error('chat generate failed', error)
    const fallbackMessage = assistantContentOrDefault(messages.value, assistantMessageId)
    updateMessageById(assistantMessageId, fallbackMessage)
    try {
      await saveChatHistory({
        appId: appId.value,
        messageType: 'ai',
        errorMessage: fallbackMessage,
      })
    } catch (historyError) {
      console.error('save ai error history failed', historyError)
    }
    message.error('生成失败，请重试')
  } finally {
    sending.value = false
  }
}

const assistantContentOrDefault = (list: ChatMessage[], assistantId: number | string) => {
  return list.find((item) => item.id === assistantId)?.content || '生成失败，请重试'
}

const checkPreviewExists = async (app?: Partial<API.AppVO> | Partial<API.App>) => {
  if (!app?.id) {
    return false
  }
  const url = getAppPreviewUrl(app)
  try {
    const resp = await fetch(url, { method: 'GET', credentials: 'include' })
    return resp.ok
  } catch {
    return false
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
  previewReady.value = historyTotal.value >= 2 || (await checkPreviewExists(appData.value))
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
    await initializePage()
  },
)

onMounted(async () => {
  await loginUserStore.fetchLoginUser()
  await initializePage()
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

.chat-panel__history-action {
  display: flex;
  justify-content: center;
  min-height: 24px;
}

.chat-panel__empty {
  margin-top: 120px;
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
