<template>
  <section class="home-page">
    <header class="home-page__hero">
      <div class="home-page__hero-copy">
        <p class="home-page__eyebrow">NoCode 平台</p>
        <h1 class="home-page__title">一句话创建应用</h1>
        <p class="home-page__subtitle">输入提示词，生成应用并实时查看结果。</p>
      </div>

      <a-card class="home-page__prompt-card" :bordered="false">
        <a-textarea
          v-model:value="prompt"
          :auto-size="{ minRows: 5, maxRows: 8 }"
          class="home-page__prompt"
          placeholder="使用 NoCode 创建一个高效的小工具，帮我计算......"
        />
        <div class="home-page__mode-row">
          <span class="home-page__mode-label">生成模式</span>
          <a-segmented v-model:value="codeGenType" :options="codeGenTypeOptions" />
        </div>
        <div class="home-page__prompt-actions">
          <a-space>
            <a-button @click="fillExample('做一个个人博客，包含首页、文章列表和详情页')">示例 1</a-button>
            <a-button @click="fillExample('做一个企业官网，突出品牌介绍与服务展示')">示例 2</a-button>
            <a-button type="primary" :loading="creating" @click="handleCreate">创建应用</a-button>
          </a-space>
        </div>
      </a-card>
    </header>

    <a-card class="home-page__section" :bordered="false">
      <div class="home-page__section-head">
        <div>
          <h2 class="home-page__section-title">我的作品</h2>
          <p class="home-page__section-subtitle">你创建的应用会显示在这里。</p>
        </div>
        <a-input-search
          v-model:value="mySearch"
          allow-clear
          placeholder="按名称查询"
          class="home-page__search"
          @search="loadMyApps"
        />
      </div>
      <a-spin :spinning="myLoading">
        <div class="home-page__grid">
          <article
            v-for="item in myApps"
            :key="item.id"
            class="app-card"
            @click="goToChat(item.id)"
          >
            <div class="app-card__cover">
              <img v-if="item.cover" :src="item.cover" :alt="item.appName" />
              <div v-else class="app-card__cover-placeholder">{{ normalizeAppName(item.appName) }}</div>
            </div>
            <div class="app-card__body">
              <h3 class="app-card__name">{{ normalizeAppName(item.appName) }}</h3>
              <p class="app-card__meta">{{ formatRelativeTime(item.createTime) }}</p>
            </div>
          </article>
        </div>
        <a-empty v-if="!myApps.length && !myLoading" description="暂无数据" />
      </a-spin>
      <div class="home-page__pager">
        <a-pagination
          v-model:current="myPage.pageNum"
          v-model:page-size="myPage.pageSize"
          :total="myTotal"
          :show-size-changer="false"
          @change="loadMyApps"
        />
      </div>
    </a-card>

    <a-card class="home-page__section" :bordered="false">
      <div class="home-page__section-head">
        <div>
          <h2 class="home-page__section-title">精选案例</h2>
          <p class="home-page__section-subtitle">优先级 99 的应用会出现在这里。</p>
        </div>
        <a-input-search
          v-model:value="featuredSearch"
          allow-clear
          placeholder="按名称查询"
          class="home-page__search"
          @search="loadFeaturedApps"
        />
      </div>
      <a-spin :spinning="featuredLoading">
        <div class="home-page__grid">
          <article
            v-for="item in featuredApps"
            :key="item.id"
            class="app-card app-card--featured"
            @click="goToChat(item.id)"
          >
            <div class="app-card__cover">
              <img v-if="item.cover" :src="item.cover" :alt="item.appName" />
              <div v-else class="app-card__cover-placeholder">{{ normalizeAppName(item.appName) }}</div>
            </div>
            <div class="app-card__body">
              <h3 class="app-card__name">{{ normalizeAppName(item.appName) }}</h3>
              <p class="app-card__meta">{{ getAppOwnerName(item) }}</p>
            </div>
          </article>
        </div>
        <a-empty v-if="!featuredApps.length && !featuredLoading" description="暂无数据" />
      </a-spin>
      <div class="home-page__pager">
        <a-pagination
          v-model:current="featuredPage.pageNum"
          v-model:page-size="featuredPage.pageSize"
          :total="featuredTotal"
          :show-size-changer="false"
          @change="loadFeaturedApps"
        />
      </div>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { addApp, listFeaturedAppVoByPage, listMyAppVoByPage } from '@/api/appController'
import { deriveAppName, formatRelativeTime, getAppOwnerName, normalizeAppName } from '@/utils/app'

const router = useRouter()
const prompt = ref('')
const codeGenType = ref<'html' | 'multi_file'>('multi_file')
const creating = ref(false)

const codeGenTypeOptions = [
  { label: '原生 HTML', value: 'html' },
  { label: '原生多文件', value: 'multi_file' },
]

const myLoading = ref(false)
const featuredLoading = ref(false)
const myApps = ref<API.AppVO[]>([])
const featuredApps = ref<API.AppVO[]>([])
const myTotal = ref(0)
const featuredTotal = ref(0)
const mySearch = ref('')
const featuredSearch = ref('')

const myPage = reactive({
  pageNum: 1,
  pageSize: 6,
})

const featuredPage = reactive({
  pageNum: 1,
  pageSize: 6,
})

const loadMyApps = async () => {
  myLoading.value = true
  try {
    const res = await listMyAppVoByPage({
      pageNum: myPage.pageNum,
      pageSize: myPage.pageSize,
      appName: mySearch.value || undefined,
      sortField: 'createTime',
      sortOrder: 'descend',
    })
    if (res.data.code === 0 && res.data.data) {
      myApps.value = res.data.data.records || []
      myTotal.value = res.data.data.totalRow || 0
      return
    }
    message.error(res.data.message || '加载我的作品失败')
  } catch (error) {
    console.error('load my apps failed', error)
    message.error('加载我的作品失败，请稍后重试')
  } finally {
    myLoading.value = false
  }
}

const loadFeaturedApps = async () => {
  featuredLoading.value = true
  try {
    const res = await listFeaturedAppVoByPage({
      pageNum: featuredPage.pageNum,
      pageSize: featuredPage.pageSize,
      appName: featuredSearch.value || undefined,
      sortField: 'priority',
      sortOrder: 'descend',
    })
    if (res.data.code === 0 && res.data.data) {
      featuredApps.value = res.data.data.records || []
      featuredTotal.value = res.data.data.totalRow || 0
      return
    }
    message.error(res.data.message || '加载精选案例失败')
  } catch (error) {
    console.error('load featured apps failed', error)
    message.error('加载精选案例失败，请稍后重试')
  } finally {
    featuredLoading.value = false
  }
}

const goToChat = (id?: number | string) => {
  if (!id) {
    return
  }
  router.push(`/app/chat/${id}`)
}

const fillExample = (text: string) => {
  prompt.value = text
}

const handleCreate = async () => {
  const value = prompt.value.trim()
  if (!value) {
    message.warning('请输入提示词')
    return
  }

  creating.value = true
  try {
    const res = await addApp({
      appName: deriveAppName(value),
      initPrompt: value,
      codeGenType: codeGenType.value,
    })
    if (res.data.code === 0 && res.data.data) {
      message.success('创建成功')
      await router.push(`/app/chat/${res.data.data}`)
      return
    }
    message.error(res.data.message || '创建失败')
  } catch (error) {
    console.error('create app failed', error)
    message.error('创建失败，请稍后重试')
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadMyApps(), loadFeaturedApps()])
})
</script>

<style scoped>
.home-page {
  display: grid;
  gap: 24px;
}

.home-page__hero {
  display: grid;
  gap: 20px;
  align-items: center;
  padding: 64px 56px 40px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(232, 250, 247, 0.88)),
    linear-gradient(135deg, #eff9ff 0%, #ffffff 60%, #dcfff2 100%);
  border-radius: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.home-page__hero-copy {
  display: grid;
  gap: 10px;
  justify-items: center;
  text-align: center;
}

.home-page__eyebrow {
  margin: 0;
  color: #1677ff;
  font-weight: 600;
}

.home-page__title {
  margin: 0;
  font-size: 42px;
  line-height: 1.2;
  color: #111827;
}

.home-page__subtitle {
  margin: 0;
  color: #6b7280;
}

.home-page__prompt-card {
  border-radius: 8px;
}

.home-page__mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.home-page__mode-label {
  color: #595959;
  font-weight: 600;
}

.home-page__prompt-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.home-page__section {
  border-radius: 8px;
}

.home-page__section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.home-page__section-title {
  margin: 0 0 6px;
  font-size: 28px;
}

.home-page__section-subtitle {
  margin: 0;
  color: #8c8c8c;
}

.home-page__search {
  width: 280px;
}

.home-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.app-card {
  overflow: hidden;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid rgba(5, 5, 5, 0.06);
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.app-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.app-card__cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f5f7fa;
}

.app-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-card__cover-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 12px;
  font-weight: 600;
  color: #1677ff;
}

.app-card__body {
  display: grid;
  gap: 4px;
  padding: 14px 16px 16px;
}

.app-card__name {
  margin: 0;
  font-size: 16px;
}

.app-card__meta {
  margin: 0;
  color: #8c8c8c;
  font-size: 13px;
}

.home-page__pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 960px) {
  .home-page__hero {
    padding: 36px 24px 28px;
  }

  .home-page__title {
    font-size: 32px;
  }

  .home-page__grid {
    grid-template-columns: 1fr;
  }

  .home-page__section-head {
    align-items: stretch;
    flex-direction: column;
  }

  .home-page__mode-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .home-page__search {
    width: 100%;
  }
}
</style>
