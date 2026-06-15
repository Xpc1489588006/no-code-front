<template>
  <section class="user-manage-page">
    <div class="user-manage-page__header">
      <div>
        <h1 class="user-manage-page__title">{{ pageTitle }}</h1>
        <p class="user-manage-page__subtitle">{{ pageSubtitle }}</p>
      </div>
      <a-space>
        <a-button v-if="!isAdmin" type="primary" @click="openEditModal()">编辑我的资料</a-button>
        <a-button @click="loadData" :loading="loading">刷新</a-button>
      </a-space>
    </div>

    <a-card v-if="isAdmin" :bordered="false" class="user-manage-page__toolbar">
      <a-form layout="inline" :model="searchParams" class="user-manage-page__form">
        <a-form-item label="账号">
          <a-input
            v-model:value="searchParams.userAccount"
            allow-clear
            placeholder="按账号搜索"
            class="user-manage-page__input"
          />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input
            v-model:value="searchParams.userName"
            allow-clear
            placeholder="按昵称搜索"
            class="user-manage-page__input"
          />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-model:value="searchParams.userRole"
            allow-clear
            placeholder="全部角色"
            class="user-manage-page__input"
            :options="roleOptions"
          />
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
        :scroll="{ x: 960 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'userRole'">
            <a-tag :color="record.userRole === 'admin' ? 'gold' : 'blue'">
              {{ formatRole(record.userRole) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'userName'">
            {{ record.userName || '-' }}
          </template>

          <template v-else-if="column.key === 'userProfile'">
            {{ record.userProfile || '-' }}
          </template>

          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openEditModal(record)">编辑</a-button>
              <a-popconfirm
                v-if="isAdmin"
                title="确认删除该用户吗？"
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

    <a-modal
      v-model:open="editModalVisible"
      :title="isAdminEditingOthers ? '编辑用户' : '编辑我的资料'"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSave"
    >
      <a-form layout="vertical" :model="editForm">
        <a-form-item label="账号">
          <a-input :value="editingTarget?.userAccount || loginUser.userAccount || '-'" disabled />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input v-model:value="editForm.userName" maxlength="32" placeholder="请输入昵称" />
        </a-form-item>
        <a-form-item label="头像地址">
          <a-input
            v-model:value="editForm.userAvatar"
            placeholder="请输入头像 URL"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="个人简介">
          <a-textarea
            v-model:value="editForm.userProfile"
            :rows="4"
            maxlength="200"
            show-count
            placeholder="介绍一下自己"
          />
        </a-form-item>
        <a-form-item v-if="isAdminEditing" label="角色">
          <a-select v-model:value="editForm.userRole" :options="roleOptions" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { deleteUser, getUserVoById, listUserVoByPage, updateUser } from '@/api/userController'
import { useLoginUserStore } from '@/stores/loginUser'

interface SearchParams extends API.UserQueryRequest {
  pageNum: number
  pageSize: number
}

interface EditFormState extends API.UserUpdateRequest {
  userAvatar: string
  userName: string
  userProfile: string
  userRole: string
}

const loading = ref(false)
const saving = ref(false)
const deletingId = ref<number>()
const editModalVisible = ref(false)
const editingTarget = ref<API.UserVO | API.LoginUserVO>()
const tableData = ref<API.UserVO[]>([])
const total = ref(0)

const loginUserStore = useLoginUserStore()
const { loginUser } = storeToRefs(loginUserStore)

const isAdmin = computed(() => loginUser.value.userRole === 'admin')
const pageTitle = computed(() => (isAdmin.value ? '用户管理' : '个人资料'))
const pageSubtitle = computed(() =>
  isAdmin.value ? '查看、筛选、编辑和删除平台用户' : '在这里维护你的昵称、头像和个人简介',
)
const isAdminEditing = computed(() => isAdmin.value)
const isAdminEditingOthers = computed(
  () => isAdmin.value && editingTarget.value?.id !== loginUser.value.id,
)

const defaultSearchParams = (): SearchParams => ({
  pageNum: 1,
  pageSize: 10,
  userAccount: '',
  userName: '',
  userRole: undefined,
})

const searchParams = reactive<SearchParams>(defaultSearchParams())

const editForm = reactive<EditFormState>({
  id: undefined,
  userName: '',
  userAvatar: '',
  userProfile: '',
  userRole: 'user',
})

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' },
]

const columns = computed<TableColumnsType<API.UserVO>>(() => {
  const baseColumns: TableColumnsType<API.UserVO> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '账号', dataIndex: 'userAccount', key: 'userAccount', ellipsis: true },
    { title: '昵称', dataIndex: 'userName', key: 'userName', ellipsis: true },
    { title: '简介', dataIndex: 'userProfile', key: 'userProfile', ellipsis: true },
    { title: '角色', dataIndex: 'userRole', key: 'userRole', width: 120 },
  ]

  if (isAdmin.value) {
    baseColumns.push({ title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 200 })
  }

  baseColumns.push({ title: '操作', key: 'action', width: isAdmin.value ? 160 : 120, fixed: 'right' })
  return baseColumns
})

const pagination = computed<TablePaginationConfig | false>(() => {
  if (!isAdmin.value) {
    return false
  }
  return {
    current: searchParams.pageNum,
    pageSize: searchParams.pageSize,
    total: total.value,
    showSizeChanger: true,
    showTotal: (value) => `共 ${value} 条`,
  }
})

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

const formatRole = (role?: string) => {
  return role === 'admin' ? '管理员' : '普通用户'
}

const fillEditForm = (target: API.UserVO | API.LoginUserVO) => {
  editForm.id = target.id
  editForm.userName = target.userName || ''
  editForm.userAvatar = target.userAvatar || ''
  editForm.userProfile = target.userProfile || ''
  editForm.userRole = target.userRole || 'user'
}

const buildAdminQuery = (): API.UserQueryRequest => {
  const { pageNum, pageSize, userAccount, userName, userRole } = searchParams
  return {
    pageNum,
    pageSize,
    userAccount: userAccount || undefined,
    userName: userName || undefined,
    userRole,
  }
}

const loadData = async () => {
  if (!loginUser.value.id) {
    await loginUserStore.fetchLoginUser()
  }

  if (!loginUser.value.id) {
    message.warning('当前未获取到登录用户信息')
    return
  }

  loading.value = true
  try {
    if (isAdmin.value) {
      const res = await listUserVoByPage(buildAdminQuery())
      if (res.data.code === 0 && res.data.data) {
        tableData.value = res.data.data.records || []
        total.value = res.data.data.totalRow || 0
        return
      }
      message.error(res.data.message || '加载用户列表失败')
      return
    }

    const res = await getUserVoById({ id: loginUser.value.id })
    if (res.data.code === 0 && res.data.data) {
      tableData.value = [res.data.data]
      total.value = 1
      return
    }
    message.error(res.data.message || '加载个人资料失败')
  } catch (error) {
    console.error('load user data failed', error)
    message.error(isAdmin.value ? '加载用户列表失败，请稍后重试' : '加载个人资料失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.pageNum = 1
  loadData()
}

const handleReset = () => {
  Object.assign(searchParams, defaultSearchParams())
  loadData()
}

const handleTableChange = (page: TablePaginationConfig) => {
  if (!isAdmin.value) {
    return
  }
  searchParams.pageNum = page.current || 1
  searchParams.pageSize = page.pageSize || 10
  loadData()
}

const openEditModal = (record?: API.UserVO) => {
  const target = record || tableData.value[0] || loginUser.value
  if (!target?.id) {
    message.warning('当前没有可编辑的用户信息')
    return
  }
  editingTarget.value = target
  fillEditForm(target)
  editModalVisible.value = true
}

const handleSave = async () => {
  if (!editForm.id) {
    message.error('缺少用户 ID，无法保存')
    return
  }

  if (!editForm.userName.trim()) {
    message.warning('请输入昵称')
    return
  }

  saving.value = true
  try {
    const payload: API.UserUpdateRequest = {
      id: editForm.id,
      userName: editForm.userName.trim(),
      userAvatar: editForm.userAvatar.trim() || undefined,
      userProfile: editForm.userProfile.trim() || undefined,
    }

    if (isAdmin.value) {
      payload.userRole = editForm.userRole
    }

    const res = await updateUser(payload)
    if (res.data.code === 0 && res.data.data) {
      message.success('保存成功')
      editModalVisible.value = false
      await Promise.all([loadData(), loginUserStore.fetchLoginUser()])
      return
    }
    message.error(res.data.message || '保存失败')
  } catch (error) {
    console.error('update user failed', error)
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (record: API.UserVO) => {
  if (!record.id) {
    message.error('缺少用户 ID，无法删除')
    return
  }

  deletingId.value = record.id
  try {
    const res = await deleteUser({ id: record.id })
    if (res.data.code === 0 && res.data.data) {
      message.success('删除成功')
      if (tableData.value.length === 1 && searchParams.pageNum > 1) {
        searchParams.pageNum -= 1
      }
      await loadData()
      return
    }
    message.error(res.data.message || '删除失败')
  } catch (error) {
    console.error('delete user failed', error)
    message.error('删除失败，请稍后重试')
  } finally {
    deletingId.value = undefined
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.user-manage-page {
  display: grid;
  gap: 20px;
}

.user-manage-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.user-manage-page__title {
  margin: 0 0 8px;
  font-size: 32px;
  line-height: 1.2;
  color: #1f1f1f;
}

.user-manage-page__subtitle {
  margin: 0;
  color: #8c8c8c;
}

.user-manage-page__toolbar {
  border-radius: 8px;
}

.user-manage-page__form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 0;
}

.user-manage-page__input {
  width: 220px;
}

@media (max-width: 768px) {
  .user-manage-page__header {
    flex-direction: column;
    align-items: stretch;
  }

  .user-manage-page__title {
    font-size: 28px;
  }

  .user-manage-page__input {
    width: 100%;
  }
}
</style>
