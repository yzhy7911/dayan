<template>
  <div class="knowledge-page">
    <section class="knowledge-hero surface-panel">
      <div class="hero-copy">
        <p class="hero-kicker">Knowledge Atelier</p>
        <h1 class="hero-title">把高频表达沉淀成一套可检索、可复用、可批量维护的话术资产。</h1>
        <p class="hero-desc">
          这里更像一间安静的内容库。搜索、分类、导入和新增都被收进同一张工作台里，减少来回切换。
        </p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat-card">
          <span class="stat-label">{{ activeLibraryTab === 'phrasebook' ? '全部话术' : '全部资料' }}</span>
          <strong class="stat-value">{{ totalAssetCount }}</strong>
        </div>
        <div class="hero-stat-card">
          <span class="stat-label">当前筛选</span>
          <strong class="stat-value">{{ filteredAssetCount }}</strong>
        </div>
        <div class="hero-stat-card">
          <span class="stat-label">当前视图</span>
          <strong class="stat-value">{{ activeLibraryTab === 'phrasebook' ? selectedCategory : '知识库' }}</strong>
        </div>
        <div class="hero-stat-card">
          <span class="stat-label">导入策略</span>
          <strong class="stat-value">{{ skipDuplicates ? '跳过重复' : '允许覆盖' }}</strong>
        </div>
      </div>
    </section>

    <section class="control-panel surface-panel">
      <div class="control-head">
        <div>
          <p class="section-kicker">Browse & Curate</p>
          <h2 class="section-title">{{ activeLibraryTab === 'phrasebook' ? '话术本检索与管理' : '知识库资料预览' }}</h2>
        </div>
        <div v-if="activeLibraryTab === 'phrasebook'" class="action-group">
          <button class="btn btn-secondary" @click="triggerFileImport">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 3v9" />
              <path d="M6.5 8.5 10 12l3.5-3.5" />
              <path d="M3.5 15.5h13" />
            </svg>
            导入
          </button>
          <button class="btn btn-secondary" @click="exportKnowledge">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 12V3" />
              <path d="M6.5 6.5 10 3l3.5 3.5" />
              <path d="M3.5 15.5h13" />
            </svg>
            导出
          </button>
          <button class="btn btn-primary" @click="openAddModal">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M10 4.5v11" />
              <path d="M4.5 10h11" />
            </svg>
            新建
          </button>
        </div>
        <div v-else class="action-group">
          <button class="btn btn-secondary" @click="triggerFileImport">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 3v9" />
              <path d="M6.5 8.5 10 12l3.5-3.5" />
              <path d="M3.5 15.5h13" />
            </svg>
            导入
          </button>
          <button
            class="btn btn-secondary"
            :disabled="!pendingKnowledgeDocuments.length || isBatchRefiningDocs"
            @click="batchRefineKnowledgeDocuments"
          >
            {{ isBatchRefiningDocs ? '整理中' : '批量整理' }}
          </button>
          <button class="btn btn-primary" @click="openKnowledgeDocModal()">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M10 4.5v11" />
              <path d="M4.5 10h11" />
            </svg>
            新建
          </button>
          <button class="btn btn-primary" :disabled="!enabledKnowledgeDocuments.length || isGeneratingPhraseDrafts" @click="generatePhraseDraftsFromKnowledge()">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 3.5v13" />
              <path d="M4.5 8.5h11" />
              <path d="M6 14.5h8" />
            </svg>
            提炼
          </button>
        </div>
      </div>

      <div class="asset-tabs">
        <button
          class="asset-tab"
          :class="{ active: activeLibraryTab === 'phrasebook' }"
          @click="activeLibraryTab = 'phrasebook'"
        >
          话术本
        </button>
        <button
          class="asset-tab"
          :class="{ active: activeLibraryTab === 'knowledge' }"
          @click="activeLibraryTab = 'knowledge'"
        >
          知识库
        </button>
      </div>

      <div class="search-row">
        <label class="search-field">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m14 14 3 3" />
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索关键词、内容或场景"
            @input="searchKnowledge"
          />
        </label>

        <div class="search-meta">
          <span class="result-chip">{{ filteredAssetCount }} 条结果</span>
          <span v-if="searchKeyword" class="result-tip">匹配 “{{ searchKeyword }}”</span>
        </div>
      </div>

      <div v-if="activeLibraryTab === 'phrasebook'" class="category-cluster">
        <button
          v-for="cat in categories"
          :key="cat"
          class="category-chip"
          :class="{ active: selectedCategory === cat }"
          @click="handleCategoryChange(cat)"
        >
          <span>{{ cat }}</span>
          <strong>{{ getCategoryCount(cat) }}</strong>
        </button>
      </div>
    </section>

    <section class="library-layout">
      <div class="library-panel surface-panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">Library</p>
            <h3 class="section-title">{{ activeLibraryTab === 'phrasebook' ? '话术列表' : '知识资料' }}</h3>
          </div>
          <span class="panel-meta">{{ activePanelMeta }}</span>
        </div>

        <div v-if="activeLibraryTab === 'phrasebook' && filteredKnowledge.length" class="knowledge-grid">
          <article v-for="item in filteredKnowledge" :key="item.id" class="knowledge-card">
            <div class="knowledge-card-head">
              <div class="keyword-wrap">
                <span class="knowledge-category">{{ item.category }}</span>
                <h4 class="knowledge-keyword">{{ item.keyword }}</h4>
              </div>
              <button class="icon-action danger" @click="handleDeleteKnowledge(item.id!)" title="删除">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.5 5.5h11" />
                  <path d="M7.5 5.5V4.4c0-.5.4-.9.9-.9h3.2c.5 0 .9.4.9.9v1.1" />
                  <path d="M6.5 7.5v7" />
                  <path d="M10 7.5v7" />
                  <path d="M13.5 7.5v7" />
                  <path d="M5.5 5.5v9.2c0 1 .8 1.8 1.8 1.8h5.4c1 0 1.8-.8 1.8-1.8V5.5" />
                </svg>
              </button>
            </div>

            <p class="knowledge-content">{{ item.content }}</p>

            <div class="knowledge-card-foot">
              <span class="asset-note">适合快速调用的稳定表达</span>
              <button class="card-copy-btn" @click="copyKnowledge(item.content)">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="7" y="7" width="9" height="9" rx="2" />
                  <path d="M5.5 12V6.8c0-1 .8-1.8 1.8-1.8h5.2" />
                </svg>
                复制使用
              </button>
            </div>
          </article>
        </div>

        <div v-else-if="activeLibraryTab === 'knowledge' && filteredKnowledgeDocuments.length" class="knowledge-grid">
          <article v-for="item in filteredKnowledgeDocuments" :key="item.id" class="knowledge-card document-card">
            <div class="knowledge-card-head">
              <div class="keyword-wrap">
                <span class="knowledge-category" :class="{ disabled: !item.enabled }">{{ item.enabled ? `${item.scene} / ${item.type}` : '已停用' }}</span>
                <h4 class="knowledge-keyword">{{ item.title }}</h4>
              </div>
              <div class="card-action-row">
                <button class="icon-action" @click="toggleKnowledgeDocument(item)" :title="item.enabled ? '停用' : '启用'">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
                    <circle cx="10" cy="10" r="2.2" />
                  </svg>
                </button>
                <button class="icon-action" @click="openKnowledgeDocModal(item)" title="编辑">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 14.5V16h1.5L14.8 6.7l-1.5-1.5L4 14.5z" />
                    <path d="M12.8 5.2 14.3 3.7a1.2 1.2 0 0 1 1.7 1.7l-1.5 1.5" />
                  </svg>
                </button>
                <button class="icon-action danger" @click="deleteKnowledgeDocumentItem(item)" title="删除">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4.5 5.5h11" />
                    <path d="M7.5 5.5V4.4c0-.5.4-.9.9-.9h3.2c.5 0 .9.4.9.9v1.1" />
                    <path d="M6.5 7.5v7" />
                    <path d="M10 7.5v7" />
                    <path d="M13.5 7.5v7" />
                    <path d="M5.5 5.5v9.2c0 1 .8 1.8 1.8 1.8h5.4c1 0 1.8-.8 1.8-1.8V5.5" />
                  </svg>
                </button>
              </div>
            </div>

            <p class="knowledge-content">{{ item.content }}</p>

            <div class="knowledge-card-foot">
              <span class="asset-note">{{ item.source || '本地知识库' }}</span>
              <div class="foot-actions">
                <button
                  class="card-copy-btn"
                  :disabled="refiningDocId === item.id"
                  @click="refineKnowledgeDocumentItem(item)"
                >
                  {{ refiningDocId === item.id ? '整理中...' : 'AI整理' }}
                </button>
                <button class="card-copy-btn" @click="generatePhraseDraftsFromKnowledge([item])">
                  提炼话术
                </button>
                <button class="card-copy-btn" @click="copyKnowledge(item.content)">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="7" y="7" width="9" height="9" rx="2" />
                    <path d="M5.5 12V6.8c0-1 .8-1.8 1.8-1.8h5.2" />
                  </svg>
                  复制资料
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-else-if="!isLoading" class="empty-state">
          <div class="empty-mark">
            <svg viewBox="0 0 64 64" fill="none">
              <rect x="10" y="12" width="44" height="40" rx="14" fill="rgba(15,118,110,0.12)" />
              <path d="M22 24h20" stroke="#0f766e" stroke-width="2.6" stroke-linecap="round" />
              <path d="M22 32h14" stroke="#0f766e" stroke-width="2.6" stroke-linecap="round" opacity="0.65" />
              <path d="M22 40h10" stroke="#0f766e" stroke-width="2.6" stroke-linecap="round" opacity="0.4" />
            </svg>
          </div>
          <h4 class="empty-title">还没有可展示的内容</h4>
          <p class="empty-text">{{ activeLibraryTab === 'phrasebook' ? '可以先新建一条，或者通过导入把已有表达整理进来。' : '可以先新建一条资料，后续回复和军师会用它作为依据。' }}</p>
          <button v-if="activeLibraryTab === 'phrasebook'" class="btn btn-primary" @click="openAddModal">立即添加</button>
          <button v-else class="btn btn-primary" @click="openKnowledgeDocModal()">立即添加</button>
        </div>
      </div>

      <aside class="insight-panel surface-panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">Overview</p>
            <h3 class="section-title">分类概览</h3>
          </div>
        </div>

        <div class="insight-stack">
          <div v-for="item in categoryStats" :key="item.name" class="insight-card">
            <div class="insight-line">
              <span class="insight-name">{{ item.name }}</span>
              <strong class="insight-count">{{ item.count }}</strong>
            </div>
            <div class="insight-bar">
              <span class="insight-fill" :style="{ width: `${getCategoryRatio(item.count)}%` }"></span>
            </div>
          </div>
        </div>

        <div class="insight-note">
          <p class="note-title">维护建议</p>
          <p class="note-text">
            让每条话术只表达一个明确意图，后续检索会更快，也更容易组合成自然回复。
          </p>
        </div>
      </aside>
    </section>

    <input
      ref="fileInputRef"
      type="file"
      accept=".json,.csv,.txt,.md,.markdown,.srt,.vtt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,video/*,audio/*"
      multiple
      class="hidden-input"
      @change="handleFileImport"
    />

    <div v-if="showPhraseDraftModal" class="modal-overlay" @click="showPhraseDraftModal = false">
      <div class="modal-shell modal-wide surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Generate Phrasebook</p>
            <h3 class="modal-title">从知识库生成话术草稿</h3>
          </div>
          <button class="icon-action" @click="showPhraseDraftModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>

        <div v-if="isGeneratingPhraseDrafts" class="import-empty-card">
          <p class="empty-title small">正在从资料中提炼标准回答...</p>
          <p class="empty-text compact">生成后请先审核，再确认加入话术本。</p>
        </div>

        <div v-else-if="phraseDrafts.length" class="import-preview">
          <div class="preview-head">
            <div>
              <span class="preview-count">生成了 {{ phraseDrafts.length }} 条话术草稿</span>
              <p class="preview-tip">话术本代表统一口径，建议确认内容准确后再加入。</p>
            </div>
            <label class="check-line">
              <input type="checkbox" :checked="allPhraseDraftsSelected" @change="toggleAllPhraseDrafts" />
              <span>全选</span>
            </label>
          </div>

          <div class="preview-list">
            <label v-for="(item, index) in phraseDrafts" :key="index" class="preview-item draft-item">
              <input v-model="item.selected" type="checkbox" />
              <div class="draft-content">
                <span class="knowledge-category">{{ item.category }}</span>
                <strong class="preview-keyword">{{ item.keyword }}</strong>
                <p class="preview-content">{{ item.content }}</p>
                <p v-if="item.sourceTitle" class="preview-more">依据：{{ item.sourceTitle }}</p>
              </div>
            </label>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showPhraseDraftModal = false">取消</button>
            <button class="btn btn-primary" :disabled="!selectedPhraseDrafts.length" @click="confirmPhraseDrafts">
              加入话术本
            </button>
          </div>
        </div>

        <div v-else class="import-empty-card">
          <p class="empty-title small">没有生成可用草稿</p>
          <p class="empty-text compact">可以补充更明确的产品资料、政策规则或客户常问内容后再试。</p>
          <div class="modal-footer left">
            <button class="btn btn-secondary" @click="showPhraseDraftModal = false">关闭</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showKnowledgeDocModal" class="modal-overlay" @click="showKnowledgeDocModal = false">
      <div class="modal-shell surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Knowledge Source</p>
            <h3 class="modal-title">{{ editingKnowledgeDocId ? '编辑知识资料' : '新建知识资料' }}</h3>
          </div>
          <button class="icon-action" @click="showKnowledgeDocModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input v-model="knowledgeDocForm.title" class="form-input" placeholder="例如：价格政策说明" type="text" />
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">场景</label>
              <select v-model="knowledgeDocForm.scene" class="form-select">
                <option v-for="scene in knowledgeScenes" :key="scene" :value="scene">{{ scene }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">类型</label>
              <select v-model="knowledgeDocForm.type" class="form-select">
                <option v-for="type in knowledgeTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <input v-model="knowledgeDocTagsInput" class="form-input" placeholder="用逗号分隔，例如：价格,优惠,退款" type="text" />
          </div>

          <div class="form-group">
            <label class="form-label">来源</label>
            <input v-model="knowledgeDocForm.source" class="form-input" placeholder="例如：销售手册 / 恋爱笔记 / 公司政策" type="text" />
          </div>

          <div class="form-group">
            <label class="form-label">资料内容</label>
            <textarea v-model="knowledgeDocForm.content" class="form-textarea" placeholder="输入事实资料、规则依据、禁忌事项或背景笔记" rows="7"></textarea>
          </div>

          <label class="check-line">
            <input v-model="knowledgeDocForm.enabled" type="checkbox" />
            <span>启用为回复和军师的参考资料</span>
          </label>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showKnowledgeDocModal = false">取消</button>
          <button class="btn btn-primary" :disabled="!isKnowledgeDocFormValid" @click="saveKnowledgeDocument">
            保存资料
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal-shell surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Create Entry</p>
            <h3 class="modal-title">新建话术</h3>
          </div>
          <button class="icon-action" @click="showAddModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">关键词</label>
            <input
              v-model="newKnowledge.keyword"
              class="form-input"
              placeholder="例如：加班回复"
              type="text"
            />
          </div>

          <div class="form-group">
            <label class="form-label">分类</label>
            <select v-model="newKnowledge.category" class="form-select">
              <option v-for="cat in categories.filter(c => c !== '全部')" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">话术内容</label>
            <textarea
              v-model="newKnowledge.content"
              class="form-textarea"
              placeholder="输入这条表达的完整内容"
              rows="5"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!isFormValid"
            @click="handleAddKnowledge"
          >
            确认添加
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-shell modal-compact surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Confirm</p>
            <h3 class="modal-title">删除这条话术</h3>
          </div>
          <button class="icon-action" @click="showDeleteModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>
        <p class="delete-text">删除后不可恢复。如果这条话术仍可能复用，建议先导出再清理。</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal-shell modal-wide surface-panel" @click.stop>
        <div class="modal-header">
          <div>
            <p class="section-kicker">Import Assets</p>
            <h3 class="modal-title">{{ activeLibraryTab === 'phrasebook' ? '导入话术资产' : '导入知识资料' }}</h3>
          </div>
          <button class="icon-action" @click="showImportModal = false" title="关闭">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="m5 5 10 10" />
              <path d="M15 5 5 15" />
            </svg>
          </button>
        </div>

        <div v-if="importPreview.length === 0 && knowledgeDocImportPreview.length === 0" class="import-empty">
          <div class="import-empty-card">
            <p class="empty-title small">{{ activeLibraryTab === 'phrasebook' ? '选择 JSON 或 CSV 文件导入现有话术。' : '上传文档、Markdown、图片或音视频素材导入知识资料。' }}</p>
            <p class="empty-text compact">{{ activeLibraryTab === 'phrasebook' ? '如果你还没有模板，可以先下载 CSV 示例再整理内容。' : '支持常见办公文件与 Markdown；图片会自动 OCR，音视频会生成待整理摘要条目。' }}</p>
            <div class="modal-footer left">
              <button class="btn btn-secondary" @click="activeLibraryTab === 'phrasebook' ? downloadTemplate() : downloadKnowledgeTemplate()">
                下载模板
              </button>
              <button class="btn btn-primary" @click="triggerFileImport">选择文件</button>
            </div>
          </div>

          <div class="format-grid">
            <div class="format-card">
              <span class="format-title">JSON 示例</span>
              <pre v-if="activeLibraryTab === 'phrasebook'" class="import-format">{
  "items": [
    {
      "category": "工作",
      "keyword": "关键词",
      "content": "话术内容"
    }
  ]
}</pre>
              <pre v-else class="import-format">{
  "items": [
    {
      "title": "价格政策",
      "scene": "销售",
      "type": "价格政策",
      "tags": ["价格", "优惠"],
      "content": "年付按正式政策执行，不能承诺额外折扣。"
    }
  ]
}</pre>
            </div>
            <div v-if="activeLibraryTab === 'phrasebook'" class="format-card">
              <span class="format-title">CSV 示例</span>
              <pre class="import-format">category,keyword,content
工作,加班回复,今天晚上有点事，可能需要加一会儿班
日常,问候,你好呀！最近怎么样？</pre>
            </div>
          </div>
        </div>

        <div v-else class="import-preview">
          <div class="preview-head">
            <div>
              <span class="preview-count">检测到 {{ activeLibraryTab === 'phrasebook' ? importPreview.length : knowledgeDocImportPreview.length }} 条可导入{{ activeLibraryTab === 'phrasebook' ? '话术' : '资料' }}</span>
              <p class="preview-tip">{{ activeLibraryTab === 'phrasebook' ? '导入前会保留分类信息，并按你的策略处理重复关键词。' : '导入后会默认启用，可在知识库中停用或编辑。' }}</p>
            </div>
            <label v-if="activeLibraryTab === 'phrasebook'" class="check-line">
              <input v-model="skipDuplicates" type="checkbox" />
              <span>跳过重复关键词</span>
            </label>
          </div>

          <div v-if="activeLibraryTab === 'phrasebook'" class="preview-list">
            <div v-for="(item, index) in importPreview.slice(0, 8)" :key="index" class="preview-item">
              <span class="knowledge-category">{{ item.category }}</span>
              <strong class="preview-keyword">{{ item.keyword }}</strong>
              <p class="preview-content">{{ item.content }}</p>
            </div>
          </div>
          <div v-else class="preview-list">
            <div v-for="(item, index) in knowledgeDocImportPreview.slice(0, 8)" :key="index" class="preview-item">
              <span class="knowledge-category">{{ item.scene }} / {{ item.type }}</span>
              <strong class="preview-keyword">{{ item.title }}</strong>
              <p class="preview-content">{{ item.content }}</p>
            </div>
          </div>

          <p v-if="activeLibraryTab === 'phrasebook' && importPreview.length > 8" class="preview-more">
            还有 {{ importPreview.length - 8 }} 条话术将在确认后一并导入。
          </p>
          <p v-if="activeLibraryTab === 'knowledge' && knowledgeDocImportPreview.length > 8" class="preview-more">
            还有 {{ knowledgeDocImportPreview.length - 8 }} 条资料将在确认后一并导入。
          </p>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
            <button class="btn btn-primary" @click="confirmImport">确认导入</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

// 组件名称，用于 keep-alive 缓存
defineOptions({ name: 'Knowledge' })

import {
  addKnowledge as addKnowledgeDB,
  addKnowledgeDocument,
  bulkAddKnowledge,
  bulkAddKnowledgeDocuments,
  deleteKnowledge as deleteKnowledgeDB,
  deleteKnowledgeDocument,
  getKnowledgeBase,
  getKnowledgeDocuments,
  initDatabase,
  searchKnowledge as searchKnowledgeDB,
  updateKnowledgeDocument
} from '../utils/storage'
import { useToast } from '../composables/useToast'

interface KnowledgeItem {
  id?: number
  category: string
  keyword: string
  content: string
  createdAt: number
}

interface KnowledgeDocument {
  id?: number
  title: string
  content: string
  scene: string
  type: string
  tags: string[]
  source?: string
  enabled: boolean
  createdAt: number
  updatedAt: number
}

const toast = useToast()
const searchKeyword = ref('')
const selectedCategory = ref('全部')
const activeLibraryTab = ref<'phrasebook' | 'knowledge'>('phrasebook')
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const showImportModal = ref(false)
const showKnowledgeDocModal = ref(false)
const showPhraseDraftModal = ref(false)
const deletingId = ref<number | null>(null)
const editingKnowledgeDocId = ref<number | null>(null)
const knowledge = ref<KnowledgeItem[]>([])
const isLoading = ref(true)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importPreview = ref<Array<{ category: string; keyword: string; content: string }>>([])
const knowledgeDocImportPreview = ref<Array<Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>>>([])
const skipDuplicates = ref(true)
const knowledgeDocuments = ref<KnowledgeDocument[]>([])
const knowledgeDocTagsInput = ref('')
const isGeneratingPhraseDrafts = ref(false)
const refiningDocId = ref<number | null>(null)
const isBatchRefiningDocs = ref(false)
const phraseDrafts = ref<Array<{ category: string; keyword: string; content: string; sourceTitle?: string; selected: boolean }>>([])

const newKnowledge = ref({
  keyword: '',
  category: '工作',
  content: ''
})

const categories = ['全部', '工作', '情感', '商务', '日常']
const knowledgeScenes = ['通用', '销售', '恋爱', '客服', '职场']
const knowledgeTypes = ['产品资料', '价格政策', '售后规则', '禁止承诺', '异议处理', '关系笔记', '沟通策略', '客户背景']

const emptyKnowledgeDocForm = () => ({
  title: '',
  content: '',
  scene: '通用',
  type: '产品资料',
  tags: [] as string[],
  source: '',
  enabled: true
})

const knowledgeDocForm = ref(emptyKnowledgeDocForm())

const filteredKnowledge = computed(() => {
  let result = knowledge.value

  if (selectedCategory.value !== '全部') {
    result = result.filter(item => item.category === selectedCategory.value)
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item =>
      item.keyword.toLowerCase().includes(keyword) ||
      item.content.toLowerCase().includes(keyword)
    )
  }

  return result
})

const filteredKnowledgeDocuments = computed(() => {
  if (!searchKeyword.value.trim()) return knowledgeDocuments.value

  const keyword = searchKeyword.value.toLowerCase()
  return knowledgeDocuments.value.filter(item =>
    item.title.toLowerCase().includes(keyword) ||
    item.content.toLowerCase().includes(keyword) ||
    item.scene.toLowerCase().includes(keyword) ||
    item.type.toLowerCase().includes(keyword) ||
    item.tags.some(tag => tag.toLowerCase().includes(keyword))
  )
})

const enabledKnowledgeDocuments = computed(() => knowledgeDocuments.value.filter(item => item.enabled))
const pendingKnowledgeDocuments = computed(() =>
  knowledgeDocuments.value.filter(item => {
    const tags = Array.isArray(item.tags) ? item.tags : []
    return tags.includes('待整理') || item.content.includes('摘要待整理')
  })
)
const selectedPhraseDrafts = computed(() => phraseDrafts.value.filter(item => item.selected))
const allPhraseDraftsSelected = computed(() => phraseDrafts.value.length > 0 && phraseDrafts.value.every(item => item.selected))

const totalAssetCount = computed(() =>
  activeLibraryTab.value === 'phrasebook' ? knowledge.value.length : knowledgeDocuments.value.length
)
const filteredAssetCount = computed(() =>
  activeLibraryTab.value === 'phrasebook' ? filteredKnowledge.value.length : filteredKnowledgeDocuments.value.length
)
const activePanelMeta = computed(() => {
  if (activeLibraryTab.value === 'knowledge') return '资料依据'
  return selectedCategory.value === '全部' ? '全量视图' : `${selectedCategory.value} 分类`
})

const categoryStats = computed(() =>
  categories
    .filter(category => category !== '全部')
    .map(category => ({
      name: category,
      count: knowledge.value.filter(item => item.category === category).length
    }))
)

const isFormValid = computed(() => {
  return newKnowledge.value.keyword.trim() && newKnowledge.value.content.trim()
})

const isKnowledgeDocFormValid = computed(() => {
  return knowledgeDocForm.value.title.trim() && knowledgeDocForm.value.content.trim()
})

const getCategoryCount = (category: string) => {
  if (category === '全部') {
    return knowledge.value.length
  }

  return knowledge.value.filter(item => item.category === category).length
}

const getCategoryRatio = (count: number) => {
  if (!knowledge.value.length) {
    return 0
  }

  return Math.max(10, Math.round((count / knowledge.value.length) * 100))
}

onMounted(async () => {
  try {
    await initDatabase()
    const data = await getKnowledgeBase()
    knowledge.value = data
    knowledgeDocuments.value = await getKnowledgeDocuments()
    console.log('[Knowledge] ✅ 话术库加载完成，共', data.length, '条')
  } catch (error) {
    console.error('[Knowledge] ❌ 话术库加载失败:', error)
    toast.error('话术库加载失败')
  } finally {
    isLoading.value = false
  }
})

const searchKnowledge = async () => {
  if (activeLibraryTab.value === 'knowledge') return

  if (!searchKeyword.value.trim()) {
    const data = await getKnowledgeBase()
    knowledge.value = data
    return
  }

  const results = await searchKnowledgeDB(searchKeyword.value)
  knowledge.value = results
}

const handleCategoryChange = async (category: string) => {
  selectedCategory.value = category
  searchKeyword.value = ''

  const data = await getKnowledgeBase()
  if (category === '全部') {
    knowledge.value = data
  } else {
    knowledge.value = data.filter(item => item.category === category)
  }
}

const copyKnowledge = async (content: string) => {
  await window.electronAPI?.clipboard?.setText?.(content)
  toast.success('已复制到剪贴板')
}

const refreshKnowledgeDocuments = async () => {
  knowledgeDocuments.value = await getKnowledgeDocuments()
}

const openAddModal = () => {
  newKnowledge.value = { keyword: '', category: '工作', content: '' }
  showAddModal.value = true
}

const openKnowledgeDocModal = (item?: KnowledgeDocument) => {
  if (item) {
    editingKnowledgeDocId.value = item.id || null
    knowledgeDocForm.value = {
      title: item.title,
      content: item.content,
      scene: item.scene,
      type: item.type,
      tags: [...(item.tags || [])],
      source: item.source || '',
      enabled: item.enabled
    }
    knowledgeDocTagsInput.value = (item.tags || []).join(', ')
  } else {
    editingKnowledgeDocId.value = null
    knowledgeDocForm.value = emptyKnowledgeDocForm()
    knowledgeDocTagsInput.value = ''
  }
  showKnowledgeDocModal.value = true
}

const parseTagsInput = (value: string) => {
  return Array.from(new Set(
    value
      .split(/[,，、\n]/)
      .map(tag => tag.trim())
      .filter(Boolean)
  ))
}

const saveKnowledgeDocument = async () => {
  if (!isKnowledgeDocFormValid.value) return

  const payload = {
    ...knowledgeDocForm.value,
    title: knowledgeDocForm.value.title.trim(),
    content: knowledgeDocForm.value.content.trim(),
    source: knowledgeDocForm.value.source?.trim(),
    tags: parseTagsInput(knowledgeDocTagsInput.value)
  }

  try {
    if (editingKnowledgeDocId.value) {
      await updateKnowledgeDocument(editingKnowledgeDocId.value, payload)
      toast.success('知识资料已更新')
    } else {
      await addKnowledgeDocument(payload)
      toast.success('知识资料已添加')
    }
    await refreshKnowledgeDocuments()
    showKnowledgeDocModal.value = false
  } catch (error) {
    console.error('[Knowledge] ❌ 保存知识资料失败:', error)
    toast.error('保存失败，请重试')
  }
}

const toggleKnowledgeDocument = async (item: KnowledgeDocument) => {
  if (!item.id) return
  try {
    await updateKnowledgeDocument(item.id, { enabled: !item.enabled })
    await refreshKnowledgeDocuments()
    toast.success(item.enabled ? '已停用这条资料' : '已启用这条资料')
  } catch (error) {
    console.error('[Knowledge] ❌ 切换知识资料状态失败:', error)
    toast.error('操作失败，请重试')
  }
}

const deleteKnowledgeDocumentItem = async (item: KnowledgeDocument) => {
  if (!item.id) return
  if (!window.confirm(`确定删除知识资料「${item.title}」吗？删除后不可恢复。`)) return

  try {
    await deleteKnowledgeDocument(item.id)
    await refreshKnowledgeDocuments()
    toast.success('知识资料已删除')
  } catch (error) {
    console.error('[Knowledge] ❌ 删除知识资料失败:', error)
    toast.error('删除失败，请重试')
  }
}

const refineKnowledgeDocumentItem = async (item: KnowledgeDocument) => {
  if (!item.id || refiningDocId.value === item.id) return

  refiningDocId.value = item.id
  try {
    const result = await window.electronAPI?.ai?.refineKnowledgeDocument?.(item)
    if (!result?.success) {
      toast.error(result?.error || 'AI 整理失败')
      return
    }

    const nextTags = Array.isArray(result.tags)
      ? result.tags.filter(Boolean).filter(tag => tag !== '待整理')
      : (item.tags || []).filter(tag => tag !== '待整理')
    const contentWithSummary = result.summary
      ? `${result.summary}\n\n${result.content || item.content}`.trim()
      : (result.content || item.content)

    await updateKnowledgeDocument(item.id, {
      title: result.title || item.title,
      type: result.type || item.type,
      tags: nextTags,
      content: contentWithSummary
    })
    await refreshKnowledgeDocuments()
    toast.success('已完成 AI 整理')
  } catch (error) {
    console.error('[Knowledge] ❌ AI 整理知识资料失败:', error)
    toast.error('整理失败，请检查模型配置')
  } finally {
    refiningDocId.value = null
  }
}

const batchRefineKnowledgeDocuments = async () => {
  if (isBatchRefiningDocs.value) return
  const pendingDocs = pendingKnowledgeDocuments.value.slice(0, 20)
  if (!pendingDocs.length) {
    toast.info('当前没有待整理资料')
    return
  }

  isBatchRefiningDocs.value = true
  let successCount = 0
  try {
    for (const item of pendingDocs) {
      if (!item.id) continue
      refiningDocId.value = item.id
      const result = await window.electronAPI?.ai?.refineKnowledgeDocument?.(item)
      if (!result?.success) continue

      const nextTags = Array.isArray(result.tags)
        ? result.tags.filter(Boolean).filter(tag => tag !== '待整理').slice(0, 8)
        : (item.tags || []).filter(tag => tag !== '待整理')
      const contentWithSummary = result.summary
        ? `${result.summary}\n\n${result.content || item.content}`.trim()
        : (result.content || item.content)

      await updateKnowledgeDocument(item.id, {
        title: result.title || item.title,
        type: result.type || item.type,
        tags: nextTags,
        content: contentWithSummary
      })
      successCount += 1
    }

    await refreshKnowledgeDocuments()
    if (successCount > 0) {
      toast.success(`已批量整理 ${successCount} 条资料`)
    } else {
      toast.warning('没有可整理成功的资料，请检查模型配置')
    }
  } catch (error) {
    console.error('[Knowledge] ❌ 批量整理知识资料失败:', error)
    toast.error('批量整理失败，请稍后重试')
  } finally {
    refiningDocId.value = null
    isBatchRefiningDocs.value = false
  }
}

const normalizePhraseDraftCategory = (category: string) => {
  return categories.includes(category) && category !== '全部' ? category : '商务'
}

const generatePhraseDraftsFromKnowledge = async (documents?: KnowledgeDocument[]) => {
  const docs = (documents?.length ? documents : enabledKnowledgeDocuments.value).slice(0, 8)
  if (!docs.length) {
    toast.warning('没有可用于提炼的话术资料')
    return
  }

  showPhraseDraftModal.value = true
  isGeneratingPhraseDrafts.value = true
  phraseDrafts.value = []

  try {
    const result = await window.electronAPI?.ai?.generatePhrasebookDrafts?.(docs)
    phraseDrafts.value = (result || [])
      .filter(item => item.keyword?.trim() && item.content?.trim())
      .map(item => ({
        category: normalizePhraseDraftCategory(item.category || '商务'),
        keyword: item.keyword.trim(),
        content: item.content.trim(),
        sourceTitle: item.sourceTitle,
        selected: true
      }))

    if (!phraseDrafts.value.length) {
      toast.warning('没有生成可用话术草稿')
    }
  } catch (error) {
    console.error('[Knowledge] ❌ 生成话术草稿失败:', error)
    toast.error('生成失败，请检查模型配置')
  } finally {
    isGeneratingPhraseDrafts.value = false
  }
}

const toggleAllPhraseDrafts = () => {
  const next = !allPhraseDraftsSelected.value
  phraseDrafts.value.forEach(item => {
    item.selected = next
  })
}

const confirmPhraseDrafts = async () => {
  if (!selectedPhraseDrafts.value.length) return

  try {
    await bulkAddKnowledge(selectedPhraseDrafts.value.map(item => ({
      category: item.category,
      keyword: item.keyword,
      content: item.content
    })))
    knowledge.value = await getKnowledgeBase()
    activeLibraryTab.value = 'phrasebook'
    showPhraseDraftModal.value = false
    toast.success(`已加入 ${selectedPhraseDrafts.value.length} 条话术`)
  } catch (error) {
    console.error('[Knowledge] ❌ 加入话术本失败:', error)
    toast.error('加入失败，请重试')
  }
}

const handleAddKnowledge = async () => {
  if (!isFormValid.value) return

  try {
    await addKnowledgeDB(newKnowledge.value)
    const data = await getKnowledgeBase()
    knowledge.value = data
    showAddModal.value = false
    toast.success('话术添加成功')
    console.log('[Knowledge] ✅ 添加话术成功')
  } catch (error) {
    console.error('[Knowledge] ❌ 添加话术失败:', error)
    toast.error('添加失败，请重试')
  }
}

const handleDeleteKnowledge = (id: number) => {
  deletingId.value = id
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!deletingId.value) return

  try {
    await deleteKnowledgeDB(deletingId.value)
    knowledge.value = knowledge.value.filter(item => item.id !== deletingId.value)
    toast.success('话术已删除')
    console.log('[Knowledge] ✅ 删除话术成功')
  } catch (error) {
    console.error('[Knowledge] ❌ 删除话术失败:', error)
    toast.error('删除失败，请重试')
  } finally {
    showDeleteModal.value = false
    deletingId.value = null
  }
}

const triggerFileImport = () => {
  showImportModal.value = true
  importPreview.value = []
  knowledgeDocImportPreview.value = []
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const parseCSV = (text: string): Array<{ category: string; keyword: string; content: string }> => {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase())
  const categoryIndex = headers.indexOf('category')
  const keywordIndex = headers.indexOf('keyword')
  const contentIndex = headers.indexOf('content')

  if (categoryIndex === -1 || keywordIndex === -1 || contentIndex === -1) {
    const items: Array<{ category: string; keyword: string; content: string }> = []
    for (const line of lines) {
      const parts = line.split(',')
      if (parts.length >= 3) {
        items.push({
          category: parts[0].trim(),
          keyword: parts[1].trim(),
          content: parts.slice(2).join(',').trim()
        })
      }
    }
    return items
  }

  const items: Array<{ category: string; keyword: string; content: string }> = []
  for (let index = 1; index < lines.length; index++) {
    const parts = lines[index].split(',')
    if (parts.length > Math.max(categoryIndex, keywordIndex, contentIndex)) {
      items.push({
        category: parts[categoryIndex]?.trim() || '',
        keyword: parts[keywordIndex]?.trim() || '',
        content: parts.slice(contentIndex).join(',').trim()
      })
    }
  }

  return items
}

const downloadTemplate = () => {
  const csvContent = `category,keyword,content
工作,加班回复,今天晚上有点事，可能需要加一会儿班
日常,问候,你好呀！最近怎么样？
情感,安慰,别难过，一切都会好起来的
商务,感谢,非常感谢您的帮助！`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '话术导入模板.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('模板已下载')
}

const downloadKnowledgeTemplate = () => {
  const jsonContent = JSON.stringify({
    items: [
      {
        title: '价格政策说明',
        scene: '销售',
        type: '价格政策',
        tags: ['价格', '优惠', '退款'],
        source: '销售手册',
        enabled: true,
        content: '年付优惠、赠品和退款规则必须以公司正式政策为准，不能口头承诺额外折扣。'
      }
    ]
  }, null, 2)

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '知识库导入模板.json')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('模板已下载')
}

const normalizeKnowledgeDocImport = (items: any[]): Array<Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>> => {
  return items
    .filter(item => item && typeof item === 'object' && typeof item.title === 'string' && typeof item.content === 'string')
    .map(item => ({
      title: item.title.trim(),
      content: item.content.trim(),
      scene: knowledgeScenes.includes(item.scene) ? item.scene : '通用',
      type: knowledgeTypes.includes(item.type) ? item.type : '产品资料',
      tags: Array.isArray(item.tags)
        ? item.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
        : parseTagsInput(String(item.tags || '')),
      source: typeof item.source === 'string' ? item.source.trim() : '',
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true
    }))
    .filter(item => item.title && item.content)
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const getFileExtension = (fileName: string) => {
  const index = fileName.lastIndexOf('.')
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : ''
}

const buildPendingMediaSummary = (file: File, scene: string, type: string) => {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
  return {
    title: `${file.name} 摘要待整理`,
    content: [
      `文件名：${file.name}`,
      `文件类型：${file.type || '未知'}`,
      `文件大小：${sizeMB} MB`,
      '当前版本暂不直接解析该二进制文件内容。',
      '建议补充：',
      '1) 核心结论',
      '2) 关键事实或参数',
      '3) 可直接发送的标准回答边界'
    ].join('\n'),
    scene,
    type,
    tags: ['待整理', '上传文件'],
    source: `上传文件：${file.name}`,
    enabled: true
  }
}

const parseKnowledgeDocsFromJsonText = (text: string) => {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    return []
  }
  const rawItems = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : []
  return normalizeKnowledgeDocImport(rawItems)
}

const createKnowledgeDocFromPlainText = (fileName: string, text: string) => {
  const titleBase = fileName.replace(/\.[^/.]+$/, '')
  const content = text.trim().slice(0, 12000)
  if (!content) return null

  return {
    title: titleBase || '未命名资料',
    content,
    scene: '通用',
    type: '产品资料',
    tags: ['上传文件', '文本'],
    source: `上传文件：${fileName}`,
    enabled: true
  }
}

const extractKnowledgeDocsFromFile = async (file: File): Promise<Array<Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>>> => {
  const fileName = file.name
  const extension = getFileExtension(fileName)
  const mime = file.type.toLowerCase()

  if (mime.startsWith('image/')) {
    const imageData = await readFileAsDataUrl(file)
    const result = await window.electronAPI?.ocr?.recognize?.(imageData)
    const text = result?.success ? (result.text || '').trim() : ''
    if (!text) {
      return [buildPendingMediaSummary(file, '通用', '产品资料')]
    }

    return [{
      title: `${fileName} OCR 结果`,
      content: text.slice(0, 12000),
      scene: '通用',
      type: '产品资料',
      tags: ['上传文件', '图片', 'OCR'],
      source: `图片OCR：${fileName}`,
      enabled: true
    }]
  }

  if (mime.startsWith('video/')) {
    return [buildPendingMediaSummary(file, '通用', '沟通策略')]
  }

  if (mime.startsWith('audio/')) {
    return [buildPendingMediaSummary(file, '通用', '沟通策略')]
  }

  if (extension === 'json') {
    const text = await file.text()
    const docs = parseKnowledgeDocsFromJsonText(text)
    if (docs.length > 0) return docs
    const asTextDoc = createKnowledgeDocFromPlainText(fileName, text)
    return asTextDoc ? [asTextDoc] : []
  }

  if (['txt', 'md', 'markdown', 'srt', 'vtt', 'csv'].includes(extension)) {
    const text = await file.text()
    const asTextDoc = createKnowledgeDocFromPlainText(fileName, text)
    return asTextDoc ? [asTextDoc] : []
  }

  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    return [buildPendingMediaSummary(file, '通用', '产品资料')]
  }

  return [buildPendingMediaSummary(file, '通用', '产品资料')]
}

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (!files.length) return

  try {
    if (activeLibraryTab.value === 'knowledge') {
      const docsBatches = await Promise.all(files.map(uploadedFile => extractKnowledgeDocsFromFile(uploadedFile)))
      const validDocs = docsBatches.flat().filter(item => item.title && item.content)
      if (validDocs.length === 0) {
        toast.error('没有找到有效的知识资料')
        return
      }

      knowledgeDocImportPreview.value = validDocs
      toast.success(`检测到 ${validDocs.length} 条可导入资料`)
      return
    }

    const file = files[0]
    const text = await file.text()
    let items: Array<{ category: string; keyword: string; content: string }> = []
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.csv')) {
      items = parseCSV(text)
    } else {
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        toast.error('JSON 格式错误，请检查文件内容')
        return
      }

      if (Array.isArray(data)) {
        items = data
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data
      } else {
        toast.error('未找到可导入的话术数据')
        return
      }
    }

    const validItems = items.filter(item =>
      item && typeof item === 'object' &&
      typeof item.keyword === 'string' &&
      typeof item.content === 'string' &&
      item.keyword.trim() &&
      item.content.trim()
    )

    if (validItems.length === 0) {
      toast.error('没有找到有效的话术数据')
      return
    }

    validItems.forEach(item => {
      if (!item.category || !categories.includes(item.category)) {
        item.category = '日常'
      }
    })

    importPreview.value = validItems
    toast.success(`检测到 ${validItems.length} 条有效话术`)
  } catch (error) {
    console.error('[Knowledge] ❌ 解析导入文件失败:', error)
    toast.error('文件解析失败，请重试')
  } finally {
    target.value = ''
  }
}

const confirmImport = async () => {
  if (activeLibraryTab.value === 'knowledge') {
    if (knowledgeDocImportPreview.value.length === 0) return

    try {
      await bulkAddKnowledgeDocuments(knowledgeDocImportPreview.value)
      await refreshKnowledgeDocuments()
      toast.success(`成功导入 ${knowledgeDocImportPreview.value.length} 条资料`)
    } catch (error) {
      console.error('[Knowledge] ❌ 批量导入知识资料失败:', error)
      toast.error('导入失败，请重试')
    } finally {
      showImportModal.value = false
      knowledgeDocImportPreview.value = []
    }
    return
  }

  if (importPreview.value.length === 0) return

  try {
    let itemsToImport = [...importPreview.value]

    if (skipDuplicates.value) {
      const existingKeywords = new Set(knowledge.value.map(item => item.keyword))
      const originalLength = itemsToImport.length
      itemsToImport = itemsToImport.filter(item => !existingKeywords.has(item.keyword))
      const skippedCount = originalLength - itemsToImport.length
      if (skippedCount > 0) {
        toast.info(`已跳过 ${skippedCount} 条重复话术`)
      }
    }

    if (itemsToImport.length === 0) {
      toast.warning('没有可导入的话术')
      showImportModal.value = false
      return
    }

    await bulkAddKnowledge(itemsToImport)
    const data = await getKnowledgeBase()
    knowledge.value = data
    toast.success(`成功导入 ${itemsToImport.length} 条话术`)
    console.log('[Knowledge] ✅ 批量导入话术成功，共', itemsToImport.length, '条')
  } catch (error) {
    console.error('[Knowledge] ❌ 批量导入失败:', error)
    toast.error('导入失败，请重试')
  } finally {
    showImportModal.value = false
    importPreview.value = []
  }
}

const exportKnowledge = () => {
  if (knowledge.value.length === 0) {
    toast.warning('没有可导出的话术')
    return
  }

  try {
    const exportData = knowledge.value.map(item => ({
      category: item.category,
      keyword: item.keyword,
      content: item.content
    }))

    const jsonStr = JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      count: exportData.length,
      items: exportData
    }, null, 2)

    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `话术库_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`成功导出 ${exportData.length} 条话术`)
    console.log('[Knowledge] ✅ 导出话术成功，共', exportData.length, '条')
  } catch (error) {
    console.error('[Knowledge] ❌ 导出话术失败:', error)
    toast.error('导出失败，请重试')
  }
}
</script>

<style scoped>
.knowledge-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.28s ease;
}

.knowledge-hero,
.control-panel,
.library-panel,
.insight-panel {
  padding: var(--space-5);
}

.knowledge-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background:
    radial-gradient(circle at top right, rgba(47, 107, 102, 0.14), transparent 30%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.14), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 243, 237, 0.9) 100%);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero-kicker,
.section-kicker {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.hero-title,
.section-title,
.modal-title {
  font-size: var(--font-xl);
  line-height: 1.32;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-desc {
  max-width: 560px;
  font-size: var(--font-md);
  line-height: 1.7;
  color: var(--text-secondary);
}

.knowledge-hero .hero-stats {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: var(--space-3) !important;
}

.hero-stat-card,
.insight-card {
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.58);
}

.stat-label,
.asset-note,
.preview-tip,
.empty-text,
.note-text {
  font-size: var(--font-sm);
  line-height: 1.55;
  color: var(--text-secondary);
}

.stat-value {
  display: block;
  margin-top: 6px;
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.control-head,
.panel-head,
.modal-header,
.knowledge-card-head,
.knowledge-card-foot,
.preview-head,
.insight-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.action-group .btn {
  width: 80px;
}

.action-group .btn svg {
  width: 16px;
  height: 16px;
}

.asset-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 4px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(72, 57, 41, 0.08);
}

.asset-tab {
  min-height: 36px;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: var(--font-sm);
  font-weight: 700;
  transition: all var(--transition);
}

.asset-tab.active {
  color: var(--text-inverse);
  background: var(--primary-gradient);
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.16);
}

.library-note-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  background: rgba(15, 118, 110, 0.1);
  color: var(--primary-dark);
  font-size: var(--font-xs);
  font-weight: 800;
}

.search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.search-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 46px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.search-field:focus-within {
  border-color: rgba(47, 107, 102, 0.3);
  box-shadow: 0 0 0 4px rgba(47, 107, 102, 0.12);
  background: rgba(255, 255, 255, 0.9);
}

.search-field svg {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-field input {
  width: 100%;
  background: transparent;
  font-size: var(--font-md);
  color: var(--text-primary);
}

.search-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.result-chip,
.panel-meta {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border-color);
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
}

.result-tip {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

.category-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(72, 57, 41, 0.1);
  color: var(--text-secondary);
  transition: all var(--transition);
}

.category-chip strong {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.category-chip:hover {
  border-color: rgba(47, 107, 102, 0.24);
  color: var(--text-primary);
}

.category-chip.active {
  background: linear-gradient(135deg, rgba(47, 107, 102, 0.94) 0%, rgba(34, 77, 89, 0.94) 100%);
  border-color: transparent;
  color: var(--text-inverse);
  box-shadow: 0 18px 36px rgba(15, 118, 110, 0.18);
}

.category-chip.active strong {
  color: var(--text-inverse);
}

.library-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.82fr);
  gap: var(--space-4);
  min-height: 0;
}

.library-panel,
.insight-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.knowledge-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.knowledge-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 220px;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(248, 242, 234, 0.72) 100%);
  border: 1px solid rgba(255, 255, 255, 0.58);
  transition: transform var(--transition), box-shadow var(--transition);
}

.knowledge-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.document-card {
  border-color: rgba(37, 99, 235, 0.12);
}

.keyword-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.knowledge-category {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: 24px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  background: var(--primary-bg);
  color: var(--primary-dark);
  font-size: var(--font-xs);
  font-weight: 700;
}

.knowledge-category.disabled {
  background: rgba(72, 57, 41, 0.08);
  color: var(--text-tertiary);
}

.knowledge-keyword {
  font-size: var(--font-lg);
  line-height: 1.35;
  font-weight: 700;
  color: var(--text-primary);
}

.knowledge-content {
  flex: 1;
  font-size: var(--font-md);
  line-height: 1.72;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.knowledge-card-foot {
  align-items: center;
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-light);
}

.card-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto !important;
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  width: fit-content;
  max-width: 132px;
  min-width: 0;
  min-height: 32px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: all var(--transition);
}

.card-copy-btn:hover {
  color: var(--text-primary);
  background: var(--surface-control);
  border-color: var(--border-strong);
}

.card-copy-btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.card-copy-btn svg {
  width: 14px !important;
  height: 14px !important;
  max-width: 14px;
  max-height: 14px;
  flex-shrink: 0;
  display: block;
}

.foot-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.icon-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(72, 57, 41, 0.1);
  color: var(--text-tertiary);
  transition: all var(--transition);
  flex-shrink: 0;
}

.card-action-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.icon-action svg {
  width: 16px;
  height: 16px;
}

.icon-action:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
  background: rgba(255, 255, 255, 0.94);
}

.icon-action.danger:hover {
  color: var(--error);
  border-color: rgba(180, 35, 24, 0.18);
  background: rgba(180, 35, 24, 0.08);
}

.insight-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.insight-name,
.insight-count,
.note-title,
.preview-keyword {
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.insight-bar {
  width: 100%;
  height: 8px;
  margin-top: var(--space-3);
  border-radius: var(--radius-full);
  overflow: hidden;
  background: rgba(72, 57, 41, 0.08);
}

.insight-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
}

.insight-note {
  margin-top: auto;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.note-title {
  margin-bottom: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-5);
}

.empty-mark {
  width: 80px;
  height: 80px;
}

.empty-mark svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.empty-title.small {
  font-size: var(--font-md);
}

.empty-text.compact {
  max-width: 420px;
}

.hidden-input {
  display: none;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: rgba(17, 14, 12, 0.36);
  backdrop-filter: blur(8px);
  z-index: 1100;
  animation: fadeIn 0.22s ease;
}

.modal-shell {
  width: min(560px, 100%);
  max-height: min(84vh, 820px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  overflow-y: auto;
}

.modal-shell.modal-wide {
  width: min(760px, 100%);
}

.modal-shell.modal-compact {
  width: min(420px, 100%);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.form-label {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: var(--font-md);
  transition: all var(--transition);
}

.form-textarea {
  min-height: 132px;
  resize: vertical;
  line-height: 1.7;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: rgba(47, 107, 102, 0.3);
  box-shadow: 0 0 0 4px rgba(47, 107, 102, 0.12);
  background: rgba(255, 255, 255, 0.92);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.modal-footer.left {
  justify-content: flex-start;
}

.btn-danger {
  background: linear-gradient(135deg, #c25a4f 0%, #9d3c34 100%);
  color: var(--text-inverse);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(157, 60, 52, 0.22);
}

.delete-text {
  font-size: var(--font-md);
  line-height: 1.7;
  color: var(--text-secondary);
}

.import-empty,
.import-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.import-empty-card {
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.52);
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.format-card {
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.52);
}

.format-title,
.preview-count {
  display: block;
  margin-bottom: var(--space-3);
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.import-format {
  margin: 0;
  white-space: pre-wrap;
  font-size: var(--font-sm);
  line-height: 1.7;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', monospace;
}

.check-line {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 34px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(72, 57, 41, 0.08);
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.check-line input {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
}

.preview-list {
  display: grid;
  gap: var(--space-3);
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.preview-content,
.preview-more {
  font-size: var(--font-sm);
  line-height: 1.6;
  color: var(--text-secondary);
}

:global(.dark-theme) .knowledge-hero {
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 30%),
    radial-gradient(circle at bottom left, rgba(179, 138, 99, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(39, 32, 27, 0.96) 0%, rgba(25, 20, 17, 0.94) 100%);
}

:global(.dark-theme) .hero-stat-card,
:global(.dark-theme) .search-field,
:global(.dark-theme) .category-chip,
:global(.dark-theme) .knowledge-card,
:global(.dark-theme) .insight-card,
:global(.dark-theme) .insight-note,
:global(.dark-theme) .icon-action,
:global(.dark-theme) .modal-shell,
:global(.dark-theme) .form-input,
:global(.dark-theme) .form-select,
:global(.dark-theme) .form-textarea,
:global(.dark-theme) .format-card,
:global(.dark-theme) .import-empty-card,
:global(.dark-theme) .preview-item,
:global(.dark-theme) .check-line,
:global(.dark-theme) .result-chip,
:global(.dark-theme) .panel-meta {
  background: rgba(255, 255, 255, 0.05);
}

:global(.dark-theme) .knowledge-category {
  background: rgba(45, 212, 191, 0.12);
}

:global(.dark-theme) .category-chip.active {
  background: linear-gradient(135deg, rgba(45, 212, 191, 0.9) 0%, rgba(26, 71, 84, 0.96) 100%);
}

@media (max-width: 1180px) {
  .knowledge-hero,
  .library-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .insight-panel {
    order: -1;
  }
}

@media (max-width: 860px) {
  .hero-stats,
  .knowledge-grid,
  .format-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .search-row,
  .control-head,
  .preview-head,
  .form-grid {
    flex-direction: column;
    align-items: stretch;
    display: flex;
  }

  .knowledge-card-foot {
    flex-direction: row;
    align-items: center;
  }

  .card-copy-btn {
    flex: 0 0 auto;
    flex-grow: 0;
    width: fit-content;
    max-width: 132px;
  }
}
</style>
