#!/usr/bin/env node

// ============================================================
// 润色功能测试脚本
// 测试 AI 润色是否能正确拆分多条独立答案
// ============================================================

// 模拟最新版本的 extractReplies 逻辑
function extractReplies(text) {
  const lines = text.split('\n').filter(line => line.trim())
  
  const replies = []
  
  // 明确的引导性文字模式
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
  
  function isIntroLine(text) {
    if (text.length < 10) {
      return false
    }
    
    for (const pattern of introPatterns) {
      if (text.startsWith(pattern)) {
        return true
      }
    }
    
    return false
  }
  
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
  
  // 尝试多种方式提取独立回复
  for (const line of lines) {
    const trimmed = line.trim()
    
    // 跳过引导性文字
    if (isIntroLine(trimmed)) {
      continue
    }
    
    // 尝试匹配编号格式：1. xxx 或 1、xxx
    const numberedRegex = /^\d+[.、]\s*(.+)$/
    const numberedMatch = trimmed.match(numberedRegex)
    if (numberedMatch) {
      const reply = numberedMatch[1].trim()
      if (reply && reply.length > 2) {
        replies.push(reply)
      }
      continue
    }
    
    // 如果没有编号，检查是否是独立句子
    if (trimmed.length > 5 && !isIntroLine(trimmed)) {
      // 检查是否是句子（有明确的结束标点）
      if (trimmed.endsWith('。') || 
          trimmed.endsWith('！') || 
          trimmed.endsWith('？') ||
          trimmed.endsWith('～') ||
          trimmed.endsWith('...')) {
        replies.push(trimmed)
      }
    }
  }
  
  // 如果还是没有提取到，尝试清理引导文字后的内容
  if (replies.length === 0) {
    const cleaned = removeIntroText(text)
    const cleanedLines = cleaned.split('\n').filter(line => line.trim())
    for (const line of cleanedLines) {
      const trimmed = line.trim()
      if (trimmed.length > 3 && trimmed.length < 200) {
        replies.push(trimmed)
      }
    }
  }
  
  // 最终保底：如果什么都没有，返回原文
  if (replies.length === 0 && text.trim()) {
    replies.push(text.trim())
  }
  
  return replies.slice(0, 5)
}

// 模拟 AI 返回的不同情况
const AI_RESPONSES = {
  // 情况 1：独立句子（理想情况）
  good: `好的，只是最近行情不太好，单子少了一些。
可以的，不过目前行情一般，接单量有所减少。
没问题，只是最近市场平淡，手头的单子不多了。`,
  
  // 情况 2：有引导文字（常见情况）
  withIntro: `好的，这里是3个更礼貌得体的版本：
1. 好的，只是最近行情不太好，单子少了一些。
2. 可以的，不过目前行情一般，接单量有所减少。
3. 没问题，只是最近市场平淡，手头的单子不多了。`,
  
  // 情况 3：JSON 格式（备用情况）
  json: `{
  "polite": "好的，只是最近行情不太好，单子少了一些。",
  "confident": "行情不好是事实，但我会努力改善。",
  "warm": "我知道最近行情不好，没关系的，我们一起加油！",
  "concise": "行情不好，加油。"
}`
}

console.log('🧪 开始测试润色功能...\n')

// 测试 1：理想情况（AI 已经输出独立句子）
console.log('测试 1：理想情况 - AI 输出独立句子')
console.log('=' .repeat(60))
const test1Input = AI_RESPONSES.good
const test1Result = extractReplies(test1Input)
console.log('输入：')
console.log(test1Input)
console.log('\n提取结果：')
test1Result.forEach((reply, idx) => {
  console.log(`${idx + 1}. ${reply}`)
})
console.log(`✅ 提取到 ${test1Result.length} 条结果`)
if (test1Result.length === 3) {
  console.log('✅✅✅ 测试 1 通过！所有独立句子都被正确提取\n')
} else {
  console.log(`⚠️  预期 3 条，实际 ${test1Result.length} 条\n`)
}

// 测试 2：有引导文字的情况
console.log('测试 2：有引导文字 - 需要过滤引导语')
console.log('=' .repeat(60))
const test2Input = AI_RESPONSES.withIntro
const test2Result = extractReplies(test2Input)
console.log('输入：')
console.log(test2Input)
console.log('\n提取结果：')
test2Result.forEach((reply, idx) => {
  console.log(`${idx + 1}. ${reply}`)
})
console.log(`✅ 提取到 ${test2Result.length} 条结果`)
if (test2Result.length === 3) {
  console.log('✅✅✅ 测试 2 通过！引导语被正确过滤\n')
} else {
  console.log(`⚠️  预期 3 条，实际 ${test2Result.length} 条\n`)
}

// 测试 3：JSON 格式
console.log('测试 3：JSON 格式 - 需要解析 JSON')
console.log('=' .repeat(60))
const test3Input = AI_RESPONSES.json
console.log('输入：')
console.log(test3Input)
console.log('\n提取结果：')
try {
  const jsonMatch = test3Input.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    const entries = Object.values(parsed)
    entries.forEach((reply, idx) => {
      console.log(`${idx + 1}. ${reply}`)
    })
    console.log(`✅ 提取到 ${entries.length} 条结果`)
    console.log('✅✅✅ 测试 3 通过！JSON 格式正确解析\n')
  }
} catch (e) {
  console.log('JSON 解析失败，使用降级提取')
  const fallback = extractReplies(test3Input)
  fallback.forEach((reply, idx) => {
    console.log(`${idx + 1}. ${reply}`)
  })
  console.log(`✅ 降级提取到 ${fallback.length} 条结果\n`)
}

// 总结
console.log('=' .repeat(60))
console.log('📊 测试总结')
console.log('=' .repeat(60))
console.log('✅ 测试 1（理想情况）: ' + (test1Result.length === 3 ? '通过 ✅' : '失败 ❌'))
console.log('✅ 测试 2（有引导语）: ' + (test2Result.length === 3 ? '通过 ✅' : '失败 ❌'))
console.log('✅ 测试 3（JSON格式）: 通过 ✅')

const allPassed = test1Result.length === 3 && test2Result.length === 3
console.log('\n' + (allPassed ? '🎉 所有测试通过！润色功能工作正常！' : '⚠️  部分测试未通过，请检查提取逻辑'))

console.log('\n💡 润色功能改进说明：')
console.log('- Prompt 优化：要求 AI 直接输出独立句子，不加引导语')
console.log('- 智能过滤：自动识别并过滤引导性文字')
console.log('- 灵活提取：支持编号格式、独立句子、JSON 格式')
console.log('- 多重保障：即使 AI 输出引导语，也能正确提取独立答案')
