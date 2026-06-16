<template>
  <section class="manage-page">
    <div class="manage-page__header">
      <div>
        <h1 class="manage-page__title">应用管理</h1>
        <p class="manage-page__subtitle">管理员可以查看、编辑、精选和删除任意应用。</p>
      </div>
      <a-space>
        <a-button @click="loadData" :loading="loading">刷新</a-button>
      </a-space>
    </div>

    <a-card :bordered="false" class="manage-page__toolbar">
      <a-form layout="inline">
        <a-form-item label="名称">
          <a-input v-model:value="searchParams.appName" allow-clear class="manage-page__input" />
        </a-form-item>
        <a-form-item label="用户ID">
          <a-input-number v-model:value="searchParams.userId" class="manage-page__input" :min="1" />
        </a-form-item>
        <a-form-item label="优先级">
          <a-input-number v-model:value="searchParams.priority" class="manage-page__input" :min="0" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
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
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'cover'">
            <a-image v-if="record.cover" :width="72" :src="record.cover" />
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'priority'">
            <a-tag :color="record.priority === 99 ? 'gold' : 'blue'">{{ record.priority || 0 }}</a-tag>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="handleEdit(record)">编辑</a-button>
              <a-button type="link" @click="handleFeatured(record)">精选</a-button>
              <a-popconfirm title="确认删除该应用吗？" ok-text="删除" cancel-text="取消" @confirm="handleDelete(record)">
                <a-button danger type="link">删除</a-button>
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
import { deleteAppByAdmin, listAppVoByPageForAdmin, updateAppByAdmin } from '@/api/appController'
import { FEATURED_APP_PRIORITY, formatDateTime } from '@/utils/app'

const router = useRouter()
const loading = ref(false)
const tableData = ref<API.AppVO[]>([])
const total = ref(0)

const searchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  appName: '',
  userId: undefined,
  priority: undefined,
})

const columns = computed<TableColumnsType<API.AppVO>>(() => [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
  { title: '名称', dataIndex: 'appName', key: 'appName', ellipsis: true },
  { title: '封面', dataIndex: 'cover', key: 'cover', width: 120 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 110 },
  { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 110 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
])

const pagination = computed<TablePaginationConfig>(() => ({
  current: searchParams.pageNum,
  pageSize: searchParams.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (value) => `共 ${value} 条`,
}))

const loadData = async () => {
  loading.value = true
  try {
    const res = await listAppVoByPageForAdmin({
      ...searchParams,
      appName: searchParams.appName || undefined,
    })
    if (res.data.code === 0 && res.data.data) {
      tableData.value = res.data.data.records || []
      total.value = res.data.data.totalRow || 0
      return
    }
    message.error(res.data.message || '加载失败')
  } catch (error) {
    console.error('load app manage data failed', error)
    message.error('加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.pageNum = 1
  loadData()
}

const handleReset = () => {
  searchParams.appName = ''
  searchParams.userId = undefined
  searchParams.priority = undefined
  searchParams.pageNum = 1
  loadData()
}

const handleTableChange = (page: TablePaginationConfig) => {
  searchParams.pageNum = page.current || 1
  searchParams.pageSize = page.pageSize || 10
  loadData()
}

const handleEdit = (record: API.AppVO) => {
  if (record.id) {
    router.push(`/app/edit/${record.id}`)
  }
}

const handleFeatured = async (record: API.AppVO) => {
  if (!record.id) {
    return
  }
  const res = await updateAppByAdmin({
    id: record.id,
    appName: record.appName,
    cover: record.cover,
    priority: FEATURED_APP_PRIORITY,
  })
  if (res.data.code === 0 && res.data.data) {
    message.success('已设为精选')
    await loadData()
    return
  }
  message.error(res.data.message || '设置失败')
}

const handleDelete = async (record: API.AppVO) => {
  if (!record.id) {
    return
  }
  const res = await deleteAppByAdmin({ id: record.id })
  if (res.data.code === 0 && res.data.data) {
    message.success('删除成功')
    await loadData()
    return
  }
  message.error(res.data.message || '删除失败')
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

.manage-page__input {
  width: 220px;
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
