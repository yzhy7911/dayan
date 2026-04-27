#!/usr/bin/env node

// ============================================================
// 回复提取功能测试
// 测试是否能正确从 AI 返回中提取多条独立回复
// ============================================================

// 模拟最新版本的 extractReplies 逻辑
function extractReplies(text) {
  const replies = []
  
  // 清理文本：移除常见的引导语
  let cleaned = removeIntroText(text)
  
  // 策略1：先用换行符分割
  const lines = cleaned.split('\n').filter(line => line.trim())
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // 跳过引导性文字
    if (isIntroLine(trimmed)) {
      continue
    }
    
    // 尝试匹配编号格式：1. xxx 或 1、xxx
    const numberedRegex = /^(\d+)[.、]\s*(.+)$/
    const match = trimmed.match(numberedRegex)
    if (match) {
      const reply = match[2].trim()
      if (reply && reply.length > 3) {
        replies.push(reply)
        continue
      }
    }
    
    // 如果没有编号，检查是否是独立句子
    if (trimmed.length > 5) {
      if (trimmed.endsWith('。') || 
          trimmed.endsWith('！') || 
          trimmed.endsWith('？') ||
          trimmed.endsWith('～') ||
          trimmed.endsWith('😂') ||
          trimmed.endsWith('🔋') ||
          trimmed.endsWith('🤣') ||
          trimmed.endsWith('...')) {
        replies.push(trimmed)
      }
    }
  }
  
  // 策略2：如果没有提取到，尝试处理一行多编号的情况
  if (replies.length === 0) {
    const allNumbersRegex = /(\d+)[.、]\s*([^。！？]+[。！？]?)/g
    let match
    while ((match = allNumbersRegex.exec(cleaned)) !== null) {
      const reply = match[2].trim()
      if (reply && reply.length > 3) {
        replies.push(reply)
      }
    }
  }
  
  // 策略3：还是没提取到，按句子分割
  if (replies.length === 0) {
    const sentences = cleaned.split(/[。！？]/)
    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      if (trimmed.length > 5 && trimmed.length < 200) {
        replies.push(trimmed + '。')
      }
    }
  }
  
  // 最终保底
  if (replies.length === 0 && text.trim()) {
    replies.push(text.trim())
  }
  
  return replies.slice(0, 5)
}

// 检查是否是引导性文字
function isIntroLine(text) {
  if (text.length < 10) {
    return false
  }
  
  const introPatterns = [
    '好的，这里是',
    '好的，这里有',
    '润色结果',
    '更礼貌的版本',
    '更自信的版本',
    '更温暖的版本',
    '更简洁的版本',
    '请参考以下',
    '以下是',
    '这是3个',
    '这里有3个',
    '生成3条',
    '提供3个'
  ]
  
  for (const pattern of introPatterns) {
    if (text.startsWith(pattern)) {
      return true
    }
  }
  
  return false
}

// 移除引导文字
function removeIntroText(text) {
  let cleaned = text
  
  const patterns = [
    /^[^。！？]*[：:]/,
    /^好的，这里是[^：]*：[\\s\\S]*/,
    /^润色结果[：:][\\s\\S]*/,
  ]
  
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '')
  }
  
  return cleaned.trim()
}

// 测试用例
const TEST_CASES = [
  {
    name: '换行分隔的编号回复（用户遇到的问题）',
    input: `1. 厂家？我只知道充得快的是"快充"，充得慢的是"慢充"，充不起的是"梦中情桩"😂
2. 我只分得清"绿牌"和"蓝牌"，厂家嘛……难道是"充电宝他表舅"？🔋
3. 厂家？特斯拉、比亚迪、还是小鹏？总之不是"特能充"的"特能等"那个厂家🤣`,
    expected: 3
  },
  {
    name: '带引导语的多条回复',
    input: `好的，这里是3个更礼貌的版本：
1. 好的，只是最近行情不太好，单子少了一些。
2. 可以的，不过目前行情一般，接单量有所减少。
3. 没问题，只是最近市场平淡，手头的单子不多了。`,
    expected: 3
  },
  {
    name: '独立句子（理想情况）',
    input: `好的，只是最近行情不太好，单子少了一些。
可以的，不过目前行情一般，接单量有所减少。
没问题，只是最近市场平淡，手头的单子不多了。`,
    expected: 3
  }
]

console.log('🧪 开始测试回复提取功能...\n')

let allPassed = true

TEST_CASES.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}：${testCase.name}`)
  console.log('=' .repeat(60))
  
  const result = extractReplies(testCase.input)
  
  console.log('提取结果：')
  result.forEach((reply, idx) => {
    console.log(`  ${idx + 1}. ${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}`)
  })
  
  console.log(`预期：${testCase.expected} 条`)
  console.log(`实际：${result.length} 条`)
  
  if (result.length === testCase.expected) {
    console.log('✅ 测试通过\n')
  } else {
    console.log('❌ 测试失败\n')
    allPassed = false
  }
})

console.log('=' .repeat(60))
console.log('总结：' + (allPassed ? '✅ 所有测试通过！' : '❌ 有测试失败'))
console.log('')
console.log('💡 说明：')
console.log('- 系统会自动识别并提取多条独立回复')
console.log('- 支持换行分隔和编号格式')
console.log('- 会过滤引导语和编号前缀')
console.log('- 最终每条回复独立展示在不同的卡片中')
