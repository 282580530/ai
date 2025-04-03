<template>
  <div class="chat-container">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="AI Chat"
      left-arrow
      @click-left="showHistory = true"
    >
      <template #left>
        <van-icon name="bars" size="20" color="#333" />
      </template>
      <template #right>
        <van-button class="new-chat-btn" type="primary" plain size="small" @click="startNewChat">
          <van-icon name="chat-o" size="20" color="#333" />
        </van-button>
      </template>
    </van-nav-bar>

    <!-- 聊天内容区域 -->
    <div class="chat-messages" ref="messagesContainer" @scroll="handleScroll">
      <!-- 快速置底按钮 -->
      <div v-if="showScrollBottom" class="scroll-bottom-btn" @click="scrollToBottom">
        <van-button round type="primary" size="small" icon="arrow-down">
          回到底部
        </van-button>
      </div>
      
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message"
        :class="{ 
          'user': msg.role === 'user', 
          'ai': msg.role === 'ai',
          'system-message': msg.isSystemMessage 
        }"
      >
        <van-image
          v-if="!msg.isSystemMessage"
          class="avatar"
          :src="msg.role === 'user' ? userAvatar : aiAvatar"
          round
          width="36"
          height="36"
        />
        <div class="bubble">
          <div v-if="msg.role === 'ai' && msg.hasThinkingProcess" class="ai-status">
            <van-icon :name="msg.generating ? 'setting-o' : 'checked'" :class="{ 'rotating': msg.generating }" />
            <span>{{ msg.generating ? '思考中...' : '思考结束' }}</span>
          </div>
          <div v-if="msg.generating" class="generating-indicator"></div>
          <template v-if="msg.role === 'ai' && !msg.isSystemMessage">
            <div v-if="msg.thinking" class="thinking-process">
              <div class="thinking-header">
                <van-icon name="notes-o" />
                <span>思考过程</span>
              </div>
              <div class="thinking-content">{{ msg.thinking }}</div>
            </div>
            <div class="conclusion">
              <div v-if="msg.thinking" class="conclusion-header">
                <van-icon name="checked" />
                <span>结论</span>
              </div>
              <div class="conclusion-content">{{ msg.displayText }}</div>
            </div>
          </template>
          <span v-else class="text">{{ msg.displayText }}</span>
          <div v-if="msg.role === 'ai' && msg.files && msg.files.length > 0" class="file-list">
            <div v-for="(file, fileIndex) in msg.files" :key="fileIndex" class="file-item">
              <span class="file-name">{{ file.name }}</span>
              <van-button size="small" type="primary" @click="downloadFile(file)">
                <van-icon name="down" />
              </van-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部输入区域 -->
    <div class="bottom-area">
      <div class="input-area">
        <van-field
          v-model="userInput"
          rows="1"
          autosize
          type="textarea"
          placeholder="您可以向同类问题的AI助手提问"
          :disabled="isGenerating"
          @keyup.enter.prevent="sendMessage"
        />
      </div>
      <div class="action-buttons">
        <van-button
          class="upload-btn"
          icon="plus"
          @click="showUploadActions"
        />
        <van-button
          class="send-btn"
          :icon="isGenerating ? 'stop' : 'arrow'"
          type="primary"
          @click="handleAction"
        />
      </div>
    </div>

    <!-- 左侧面板 -->
    <van-popup
      v-model:show="showHistory"
      position="left"
      :style="{ width: '80%', height: '100%' }"
    >
      <div class="history-panel">
        <div class="history-header">
          <h3>选择助手</h3>
        </div>

        <!-- 助手类型列表 -->
        <div class="assistant-types-list">
          <div
            v-for="type in assistantTypes"
            :key="type.id"
            class="assistant-type-item"
            :class="{ active: currentAssistantType === type.id }"
            @click="selectAssistantType(type.id)"
          >
            <van-icon :name="type.icon" />
            <span>{{ type.name }}</span>
          </div>
        </div>
        
        <!-- 历史会话列表 -->
        <div class="history-list">
          <div class="history-title">历史会话</div>
          <div
            v-for="(session, index) in currentTypeSessions"
            :key="index"
            class="history-item"
          >
            <van-swipe-cell>
              <div class="session-content" @click="loadSession(currentAssistantType, index)">
                <div class="session-title">{{ session.title }}</div>
                <div class="session-time">{{ session.time }}</div>
              </div>
              <template #right>
                <div class="delete-btn" @click="confirmDeleteSession(currentAssistantType, index)">
                  <van-icon name="delete" />
                </div>
              </template>
            </van-swipe-cell>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 上传动作面板 -->
    <van-action-sheet
      v-model:show="showUpload"
      :actions="uploadActions"
      @select="onUploadActionSelect"
      cancel-text="取消"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { showToast, showDialog } from 'vant'

// 模拟数据
const userAvatar = ref('https://example.com/user-avatar.png')
const aiAvatar = ref('https://example.com/ai-avatar.png')
const userInput = ref('')
const messages = ref([])
const isGenerating = ref(false)
const showHistory = ref(false)
const sessions = ref({
  general: [],
  code: [],
  math: [],
  write: []
})
const messagesContainer = ref(null)
const showScrollBottom = ref(false)
const isAtBottom = ref(true)
let generateInterval = null

// 定义助手类型
const assistantTypes = [
  { id: 'service', name: '智能客服助手', icon: 'service-o', 
    welcome: '您好！我是智能客服助手，可以为您解答各类保险咨询问题。',
    thinking: '作为客服助手，我会:\n1. 理解您的问题\n2. 提供专业解答\n3. 确保服务质量',
    style: '清晰友好的解答' },
  { id: 'policy', name: '智能保单助手', icon: 'description',
    welcome: '您好！我是智能保单助手，专注于解决保单相关问题。',
    thinking: '作为保单助手，我会:\n1. 分析保单需求\n2. 解读保单条款\n3. 提供保单建议',
    style: '专业的保单解读和建议' },
  { id: 'claim', name: '智能理赔助手', icon: 'balance-o',
    welcome: '您好！我是智能理赔助手，可以帮您处理理赔相关问题。',
    thinking: '作为理赔助手，我会:\n1. 分析理赔需求\n2. 指导理赔流程\n3. 提供理赔建议',
    style: '清晰的理赔指导' },
  { id: 'underwriting', name: '智能核保助手', icon: 'shield-o',
    welcome: '您好！我是智能核保助手，可以帮您解答核保相关问题。',
    thinking: '作为核保助手，我会:\n1. 评估承保风险\n2. 解读核保要求\n3. 提供核保建议',
    style: '专业的核保分析' }
]

const currentAssistantType = ref('service')

// 添加计算属性获取当前助手类型的信息
const currentType = computed(() => {
  return assistantTypes.find(t => t.id === currentAssistantType.value)
})

// 添加计算属性获取当前类型的历史记录
const currentTypeSessions = computed(() => {
  return sessions.value[currentAssistantType.value] || []
})

// 修改选择助手类型的逻辑
const selectAssistantType = (typeId) => {
  if (currentAssistantType.value === typeId) return
  
  // 如果当前有对话内容，保存到历史记录
  if (messages.value.length > 1) { // 大于1是因为第一条是欢迎消息
    saveCurrentSession()
  }
  
  // 切换助手类型
  currentAssistantType.value = typeId
  
  // 检查是否有该类型的历史记录
  const typeSessions = sessions.value[typeId] || []
  if (typeSessions.length > 0) {
    // 如果有历史记录，加载最新的会话
    loadSession(typeId, 0)
  } else {
    // 如果没有历史记录，创建新的会话
    const selectedType = assistantTypes.find(t => t.id === typeId) || assistantTypes[0]
    messages.value = [createWelcomeMessage(selectedType)]
  }
  
  // 显示切换提示
  const selectedType = assistantTypes.find(t => t.id === typeId)
  showToast(`已切换到${selectedType.name}`)
  
  // 关闭左侧面板
  showHistory.value = false
  
  // 滚动到底部
  scrollToBottom()
}

// 修改创建欢迎消息的函数
const createWelcomeMessage = (assistantType = assistantTypes[0]) => ({
  role: 'ai',
  text: assistantType.welcome,
  displayText: assistantType.welcome,
  generating: false,
  hasThinkingProcess: false
})

// 修改生成响应的逻辑
const generateResponse = async (messageIndex) => {
  const currentType = assistantTypes.find(t => t.id === currentAssistantType.value) || assistantTypes[0]
  const thinking = currentType.thinking || '正在思考中...'
  const conclusion = currentType.style ? `基于${currentType.style}，为您提供以下回答：\n这是一个示例回答，实际应用中需要根据不同助手类型提供相应的专业回答。` : '这是一个示例回答。'
  
  let currentThinking = ''
  let currentConclusion = ''
  let isShowingThinking = true
  let thinkingIndex = 0
  let conclusionIndex = 0

  return new Promise((resolve) => {
    generateInterval = setInterval(() => {
      if (isShowingThinking && thinkingIndex < thinking.length) {
        currentThinking += thinking.charAt(thinkingIndex)
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          role: 'ai',
          thinking: currentThinking,
          displayText: '',
          generating: true,
          hasThinkingProcess: true
        }
        thinkingIndex++
      } else if (conclusionIndex < conclusion.length) {
        isShowingThinking = false
        currentConclusion += conclusion.charAt(conclusionIndex)
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          role: 'ai',
          thinking: currentThinking,
          displayText: currentConclusion,
          generating: true,
          hasThinkingProcess: true
        }
        conclusionIndex++
      } else {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          role: 'ai',
          thinking: currentThinking,
          displayText: currentConclusion,
          generating: false,
          hasThinkingProcess: true,
          files: [
            { name: '文档1.pdf', url: 'https://example.com/file1.pdf' },
            { name: '文档2.docx', url: 'https://example.com/file2.docx' },
            { name: '文档3.xlsx', url: 'https://example.com/file3.xlsx' }
          ]
        }
        stopGenerating()
        resolve()
      }
      scrollToBottom()
    }, 50)
  })
}

// 修改停止生成的逻辑
const stopGenerating = () => {
  clearInterval(generateInterval)
  isGenerating.value = false
  if (messages.value.length > 0) {
    messages.value[messages.value.length - 1].generating = false
  }
}

// 修改发送消息的逻辑
const sendMessage = async () => {
  if (!userInput.value.trim()) return

  const newMessage = {
    role: 'user',
    text: userInput.value,
    displayText: userInput.value,
    generating: false
  }

  messages.value.push(newMessage)
  userInput.value = ''
  
  // AI回复
  isGenerating.value = true
  messages.value.push({
    role: 'ai',
    text: '',
    displayText: '',
    generating: true
  })
  
  await generateResponse(messages.value.length - 1)
}

// 处理按钮操作
const handleAction = () => {
  console.log(isGenerating.value,'isGenerating.value');
  
  if (isGenerating.value) {
    stopGenerating()
  } else {
    sendMessage()
  }
}

// 处理滚动事件
const handleScroll = () => {
  if (!messagesContainer.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  const scrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50
  
  isAtBottom.value = scrolledToBottom
  showScrollBottom.value = !scrolledToBottom && messages.value.length > 0
}

// 修改原有的滚动到底部方法
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

// 监听消息变化，如果在底部则自动滚动
watch(() => messages.value.length, () => {
  if (isAtBottom.value) {
    scrollToBottom()
  }
})

// 修改新会话函数
const startNewChat = () => {
  if (messages.value.length > 0) {
    saveCurrentSession()
  }
  messages.value = [createWelcomeMessage()]
  showHistory.value = false
}

// 修改加载会话的逻辑
const loadSession = (type, index) => {
  const session = sessions.value[type][index]
  if (session) {
    messages.value = [...session.messages]
    currentAssistantType.value = session.assistantType
    // 关闭左侧面板
    showHistory.value = false
  }
}

// 修改保存会话的逻辑
const saveCurrentSession = () => {
  if (messages.value.length > 1) { // 只有当有实际对话时才保存
    const currentType = assistantTypes.find(t => t.id === currentAssistantType.value) || assistantTypes[0]
    // 确保当前助手类型的历史记录数组存在
    if (!sessions.value[currentAssistantType.value]) {
      sessions.value[currentAssistantType.value] = []
    }
    
    // 检查是否已经存在相同的会话
    const existingSessionIndex = sessions.value[currentAssistantType.value].findIndex(
      session => session.title === messages.value[1]?.text
    )
    
    // 如果不存在相同的会话，才添加新的会话记录
    if (existingSessionIndex === -1) {
      const sessionTitle = messages.value[1]?.text || '新会话'
      sessions.value[currentAssistantType.value].unshift({
        title: sessionTitle,
        time: new Date().toLocaleString(),
        messages: [...messages.value],
        assistantType: currentAssistantType.value,
        assistantName: currentType.name || '智能助手'
      })
    }
  }
}

// 修改删除会话的逻辑
const deleteSession = (type, index) => {
  // 获取要删除的会话
  const sessionToDelete = sessions.value[type][index]
  
  // 删除会话
  sessions.value[type].splice(index, 1)
  
  // 检查是否需要重置当前会话
  const needReset = 
    // 如果删除的是当前选中的会话
    (messages.value.length > 0 && 
     sessionToDelete.messages[1]?.text === messages.value[1]?.text) ||
    // 或者该类型的所有会话都被删除了
    sessions.value[type].length === 0

  if (needReset) {
    // 重置为当前助手类型的初始状态
    const currentType = assistantTypes.find(t => t.id === type) || assistantTypes[0]
    messages.value = [createWelcomeMessage(currentType)]
  }
}

// 下载文件
const downloadFile = (file) => {
  // 这里添加实际的文件下载逻辑
  showToast(`开始下载: ${file.name}`)
}

// 添加上传相关的变量和方法
const showUpload = ref(false)
const uploadActions = [
  { name: '上传图片', icon: 'photo-o' },
  { name: '上传文件', icon: 'description' }
]

const showUploadActions = () => {
  showUpload.value = true
}

const onUploadActionSelect = (action) => {
  showUpload.value = false
  if (action.name === '上传图片') {
    // 触发图片上传
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => handleFileUpload(e.target.files, 'image')
    input.click()
  } else {
    // 触发文件上传
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx'
    input.onchange = (e) => handleFileUpload(e.target.files, 'file')
    input.click()
  }
}

const handleFileUpload = (files, type) => {
  if (!files || !files.length) return
  
  const file = files[0]
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (file.size > maxSize) {
    showToast('文件大小不能超过10MB')
    return
  }
  
  // 这里添加实际的文件上传逻辑
  showToast(`${type === 'image' ? '图片' : '文件'}上传成功`)
  
  // 将文件信息添加到当前消息中
  if (messages.value.length > 0) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (!lastMessage.files) {
      lastMessage.files = []
    }
    lastMessage.files.push({
      name: file.name,
      type: type,
      url: URL.createObjectURL(file)
    })
  }
}

// 修改确认删除会话的函数
const confirmDeleteSession = (type, index) => {
  showDialog({
    title: '删除会话',
    message: '确定要删除该会话记录吗？',
    showCancelButton: true,
    confirmButtonText: '删除',
    confirmButtonColor: '#ee0a24',
    cancelButtonText: '取消'
  }).then(() => {
    deleteSession(type, index)
    showToast('删除成功')
  }).catch(() => {
    // 取消删除
  })
}

onMounted(() => {
  // 初始化示例消息，使用智能客服助手的欢迎消息
  messages.value = [createWelcomeMessage(assistantTypes[0])]
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: #f5f5f5;
  position: relative;
}

.message {
  display: flex;
  margin-bottom: 12px;
  max-width: 100%;
  padding: 0;
  position: relative;
}

.message.user {
  flex-direction: row-reverse;
  padding-left: 48px;
}

.message.ai {
  flex-direction: row;
  padding-right: 48px;
}

.avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.message.user .avatar {
  margin-right: 8px;
}

.message.ai .avatar {
  margin-left: 8px;
}

.bubble {
  width: 100%;
  max-width: 600px;
  min-width: 100px;
  padding: 12px 16px;
  border-radius: 12px;
  position: relative;
  word-break: break-word;
  overflow-wrap: break-word;
  font-size: 14px;
  line-height: 1.5;
}

.message.user .bubble {
  background: #1989fa;
  color: white;
  border-top-right-radius: 4px;
  margin-right: 8px;
}

.message.ai .bubble {
  background: white;
  color: #333;
  border: 1px solid #eee;
  border-top-left-radius: 4px;
  margin-left: 8px;
}

.bottom-area {
  border-top: 1px solid #eee;
  background: white;
  padding: 12px 16px;
}

.input-area {
  background: #f8f8f8;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
  transition: all 0.3s;
  overflow: hidden;
}

.input-area:focus-within {
  border-color: #999;
  background: #fff;
}

:deep(.van-field) {
  padding: 8px 0;
  background: transparent;
}

:deep(.van-field__control) {
  min-height: 20px;
  padding: 4px 12px;
  background: transparent;
  width: 100%;
  font-size: 14px;
  color: #333;
}

:deep(.van-field__control::placeholder) {
  color: #999;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 8px;
}

.send-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  padding: 0;
}

.send-btn .van-icon {
  font-size: 16px;
}

.upload-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  padding: 0;
  color: #666;
}

.upload-btn .van-icon {
  font-size: 16px;
}

.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.history-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.history-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: normal;
}

.assistant-types-list {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.assistant-type-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.assistant-type-item .van-icon {
  font-size: 20px;
  margin-right: 12px;
  color: #666;
}

.assistant-type-item span {
  font-size: 14px;
  color: #333;
}

.assistant-type-item.active {
  background: #f0f9ff;
}

.assistant-type-item.active .van-icon,
.assistant-type-item.active span {
  color: #1989fa;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.history-title {
  padding: 12px 0;
  color: #999;
  font-size: 14px;
}

.session-content {
  background: white;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.session-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.session-time {
  font-size: 12px;
  color: #999;
}

.generating-indicator {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: #ddd;
  animation: blink 1s infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.file-list {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  min-width: 0;
  max-width: 100%;
}

.file-item .van-button {
  min-width: 24px !important;
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
}

.file-item .van-icon {
  font-size: 14px !important;
}

.message.user .file-item {
  background: rgba(255, 255, 255, 0.2);
}

.message.ai .file-item {
  background: #f8f8f8;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 6px;
  flex: 1;
  min-width: 0;
}

.message.user .file-name {
  color: rgba(255, 255, 255, 0.9);
}

.message.ai .file-name {
  color: #666;
}

.message.generating .bubble {
  border-color: #e8f3ff;
}

.scroll-bottom-btn {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 80px;
  z-index: 10;
  animation: fade-in 0.3s ease-in-out;
}

.scroll-bottom-btn .van-button {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinking-process {
  margin-top: 8px;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
  white-space: pre-wrap;
}

.thinking-header, .conclusion-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  color: #666;
  font-size: 12px;
}

.thinking-header .van-icon, .conclusion-header .van-icon {
  margin-right: 4px;
  font-size: 14px;
}

.thinking-content {
  white-space: pre-wrap;
  color: #666;
  line-height: 1.5;
}

.conclusion {
  color: #333;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.5;
  white-space: pre-wrap;
}

.conclusion-content {
  line-height: 1.5;
}

.ai-msg .bubble {
  background: white;
  border: 1px solid #eee;
  padding: 12px;
}

.ai-status {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.ai-status .van-icon {
  margin-right: 4px;
  font-size: 14px;
}

.ai-status .rotating {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 隐藏滚动条但保持功能 */
.assistant-types::-webkit-scrollbar {
  display: none;
}
.assistant-types {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 添加系统消息样式 */
.ai-msg.system-message {
  justify-content: center;
}

.ai-msg.system-message .bubble {
  background: #f0f9ff;
  border: 1px solid #e6f4ff;
  max-width: 90%;
  padding: 8px 16px;
  font-size: 12px;
  color: #666;
}

.ai-msg.system-message .avatar {
  display: none;
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.session-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.session-time {
  font-size: 12px;
  color: #999;
}

.history-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 8px;
  color: #666;
  font-size: 14px;
}

.section-header .van-icon {
  margin-right: 6px;
  font-size: 16px;
}

.assistant-tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: #e8f3ff;
  color: #1989fa;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

/* 修改导航栏样式 */
:deep(.van-nav-bar) {
  background-color: white;
}

:deep(.van-nav-bar__title) {
  color: #333;
}

:deep(.van-nav-bar__arrow) {
  display: none;  /* 隐藏默认的返回箭头 */
}

:deep(.van-nav-bar__left) {
  padding: 0 16px;
}

:deep(.van-nav-bar__right) {
  padding-right: 16px;
}

:deep(.van-nav-bar__right .van-button) {
  color: #333;
  border-color: #333;
}

/* 修改右上角新会话按钮样式 */
.new-chat-btn {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  width: 32px !important;
  height: 32px !important;
}

.new-chat-btn .van-icon {
  font-size: 18px;
  color: #333;
}

:deep(.van-nav-bar__right .van-button) {
  background: transparent;
}

:deep(.van-nav-bar__right .van-button:active) {
  background: rgba(0, 0, 0, 0.1);
}

/* 修改历史记录面板样式 */
.history-panel {
  background: #f5f7fa;
}

.history-header h3 {
  color: #1989fa;
}

/* 修改滚动条样式 */
::-webkit-scrollbar,
::-webkit-scrollbar-track,
::-webkit-scrollbar-thumb,
::-webkit-scrollbar-thumb:hover {
  all: unset;
}

/* 删除上传相关的样式 */
.upload-area,
.upload-icon,
.upload-text,
:deep(.van-uploader__preview),
:deep(.van-uploader__preview-image),
:deep(.van-uploader__preview-delete),
:deep(.van-uploader__upload),
.preview-cover {
  display: none;
}

.assistant-types {
  display: none;
}

/* 修改上传动作面板样式 */
:deep(.van-action-sheet__item) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.van-action-sheet__item .van-icon) {
  margin-right: 8px;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 100%;
  background-color: #ee0a24;
  color: white;
}

.delete-btn .van-icon {
  font-size: 20px;
}
</style>