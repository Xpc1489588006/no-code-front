<template>
  <section class="manage-page">
    <div class="manage-page__header">
      <div>
        <h1 class="manage-page__title">对话管理</h1>
        <p class="manage-page__subtitle">管理员可以查看、筛选和删除应用对话历史。</p>
      </div>
      <a-space>
        <a-button :loading="loading" @click="loadData">刷新</a-button>
      </a-space>
    </div>

    <a-card :bordered="false" class="manage-page__toolbar">
      <a-form layout="inline" class="manage-page__form">
        <a-form-item label="应用ID">
          <a-input-number v-model:value="searchParams.appId" class="manage-page__input" :min="1" />
        </a-form-item>
        <a-form-item label="用户ID">
          <a-input-number v-model:value="searchParams.userId" class="manage-page__input" :min="1" />
        </a-form-item>
        <a-form-item label="消息类型">
          <a-select
            v-model:value="searchParams.messageType"
            allow-clear
            placeholder="全部类型"
            class="manage-page__input"
            :options="messageTypeOptions"
          />
        </a-form-item>
        <a-form-item label="内容">
          <a-input v-model:value="searchParams.content" allow-clear class="manage-page__input" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
            <a-popconfirm
              v-if="searchParams.appId"
              title="确认删除该应用下的全部对话吗？"
              ok-text="删除"
              cancel-text="取消"
              @confirm="handleDeleteByApp"
            >
              <a-button danger :loading="deletingByApp">清空应用对话</a-button>
            </a-popconfirm>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1280 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'messageType'">
            <a-tag :color="record.messageType === 'ai' ? 'purple' : 'blue'">
              {{ formatMessageType(record.messageType) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'content'">
            <span class="manage-page__content">{{ record.content || record.errorMessage || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'user'">
            {{ record.user?.userName || record.user?.userAccount || '-' }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="goToAppChat(record)">查看应用</a-button>
              <a-popconfirm
                title="确认删除该条对话吗？"
                ok-text="删除"
                cancel-text="取消"
                @confirm="handleDelete(record)"
              >
                <a-button danger type="link" :loading="deletingId === record.id">删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import {
  deleteChatHistoryByAdmin,
  deleteChatHistoryByAppIdForAdmin,
  listChatHistoryVoByPageForAdmin,
} from '@/api/chatHistoryController'
import { formatDateTime } from '@/utils/app'

const router = useRouter()
const loading = ref(false)
const deletingByApp = ref(false)
const deletingId = ref<number | string>()
const tableData = ref<API.ChatHistoryVO[]>([])
const total = ref(0)

const createDefaultSearchParams = (): API.ChatHistoryQueryRequest => ({
  pageNum: 1,
  pageSize: 10,
  appId: undefined,
  userId: undefined,
  messageType: undefined,
  content: '',
  sortField: 'createTime',
  sortOrder: 'descend',
})

const searchParams = reactive<API.ChatHistoryQueryRequest>(createDefaultSearchParams())

const messageTypeOptions = [
  { label: '用户消息', value: 'user' },
  { label: 'AI 消息', value: 'ai' },
]

const columns = computed<TableColumnsType<API.ChatHistoryVO>>(() => [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 110 },
  { title: '应用ID', dataIndex: 'appId', key: 'appId', width: 120 },
  { title: '类型', dataIndex: 'messageType', key: 'messageType', width: 110 },
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 110 },
  { title: '用户', dataIndex: 'user', key: 'user', width: 140 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 190 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
])

const pagination = computed<TablePaginationConfig>(() => ({
  current: searchParams.pageNum,
  pageSize: searchParams.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (value) => `共 ${value} 条`,
}))

const formatMessageType = (type?: string) => {
  if (type === 'ai') {
    return 'AI'
  }
  if (type === 'user') {
    return '用户'
  }
  return '-'
}

const buildQuery = (): API.ChatHistoryQueryRequest => ({
  ...searchParams,
  content: searchParams.content || undefined,
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await listChatHistoryVoByPageForAdmin(buildQuery())
    if (res.data.code === 0 && res.data.data) {
      tableData.value = res.data.data.records || []
      total.value = res.data.data.totalRow || 0
      return
    }
    message.error(res.data.message || '加载对话列表失败')
  } catch (error) {
    console.error('load chat manage data failed', error)
    message.error('加载对话列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.pageNum = 1
  loadData()
}

const handleReset = () => {
  Object.assign(searchParams, createDefaultSearchParams())
  loadData()
}

const handleTableChange = (page: TablePaginationConfig) => {
  searchParams.pageNum = page.current || 1
  searchParams.pageSize = page.pageSize || 10
  loadData()
}

const handleDelete = async (record: API.ChatHistoryVO) => {
  if (!record.id) {
    return
  }

  deletingId.value = record.id
  try {
    const res = await deleteChatHistoryByAdmin({ id: record.id })
    if (res.data.code === 0 && res.data.data) {
      message.success('删除成功')
      if (tableData.value.length === 1 && (searchParams.pageNum || 1) > 1) {
        searchParams.pageNum = (searchParams.pageNum || 1) - 1
      }
      await loadData()
      return
    }
    message.error(res.data.message || '删除失败')
  } catch (error) {
    console.error('delete chat history failed', error)
    message.error('删除失败，请稍后重试')
  } finally {
    deletingId.value = undefined
  }
}

const handleDeleteByApp = async () => {
  if (!searchParams.appId) {
    return
  }

  deletingByApp.value = true
  try {
    const res = await deleteChatHistoryByAppIdForAdmin({ appId: searchParams.appId })
    if (res.data.code === 0 && res.data.data) {
      message.success('清空成功')
      searchParams.pageNum = 1
      await loadData()
      return
    }
    message.error(res.data.message || '清空失败')
  } catch (error) {
    console.error('delete chat history by app failed', error)
    message.error('清空失败，请稍后重试')
  } finally {
    deletingByApp.value = false
  }
}

const goToAppChat = (record: API.ChatHistoryVO) => {
  if (record.appId) {
    router.push(`/app/chat/${record.appId}`)
  }
}

onMounted(loadData)
</script>

<style scoped>
.manage-page {
  display: grid;
  gap: 20px;
}

.manage-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.manage-page__title {
  margin: 0 0 8px;
  font-size: 32px;
}

.manage-page__subtitle {
  margin: 0;
  color: #8c8c8c;
}

.manage-page__toolbar {
  border-radius: 8px;
}

.manage-page__form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 0;
}

.manage-page__input {
  width: 220px;
}

.manage-page__content {
  display: inline-block;
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

@media (max-width: 768px) {
  .manage-page__header {
    flex-direction: column;
    align-items: stretch;
  }

  .manage-page__input {
    width: 100%;
  }
}
</style>
