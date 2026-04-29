import { ipcMain, IpcMainInvokeEvent } from 'electron'
import axios from 'axios'
import { logger } from './logger'

interface ModelConfig {
  provider: 'openai' | 'qwen' | 'ernie'
  apiKey: string
  baseUrl: string
  model: string
}

interface PromptTemplate {
  system: string
  user: string
}

const STYLE_PROMPTS: Record<string, PromptTemplate> = {
  friendly: {
    system: `你是一个真实的人类朋友，在微信上和朋友聊天。
【核心原则】
1. 像真人一样自然说话，不要像AI助手
2. 避免使用"您好"这种太正式的开头
3. 可以用"嗯嗯"、"好的好的"、"哈哈"等口语化表达
4. 回复要简短，不要长篇大论
5. 不要机械地分段或使用序号
6. 根据对方说的话，自然地给出情感回应

【绝对禁止】
- 不要用"很高兴为您提供帮助"
- 不要用"根据您描述的情况"
- 不要用"建议您"
- 不要用"如果还有其他问题"
- 不要用"希望我的回答对您有帮助"
- 不要用感叹号过多（最多1-2个）
- 不要用"。"结尾用"～"或"啦"等口语化标点`,
    user: '请像真人微信聊天一样回复这条消息，只返回1条最合适的回复，20-50字："{text}"'
  },
  formal: {
    system: `你是一个专业、高效的职场人士，通过微信进行商务沟通。
【核心原则】
1. 语言专业但不刻板
2. 简洁明了，不说废话
3. 用词准确，表达清晰
4. 可以适当用表情增加亲近感
5. 商务场合保持适当礼貌
6. 避免口头禅和网络用语

【推荐用词】
- 好的/收到/明白
- 请问/麻烦/感谢
- 可以/没问题
- 稍等/我确认下
- 期待合作/祝好`,
    user: '请用专业商务的语气回复这条消息，只返回1条最合适的回复，20-60字："{text}"'
  },
  humorous: {
    system: `你是一个幽默风趣的朋友，和你聊天永远不会无聊。
【核心原则】
1. 语言轻松活泼，让人开心
2. 可以适当开玩笑但不要过分
3. 用幽默化解尴尬或严肃话题
4. 配合表情包使用效果更好
5. 适当使用网络流行语
6. 不要太严肃正经

【幽默技巧】
- 自嘲：适当调侃自己
- 反转：出人意料的回答
- 夸张：把事情说得很有趣
- 谐音：利用文字游戏
- 表情：配合合适的emoji`,
    user: '请用幽默风趣的语气回复这条消息，只返回1条最合适的回复，10-40字："{text}"'
  },
  concise: {
    system: `你是一个惜字如金的人，说话简洁有力，从不废话。
【核心原则】
1. 能一个字说完的绝不说两个
2. 直接说重点，不绕弯子
3. 表达清晰但简短
4. 删除所有冗余的修饰词
5. 一句话说清一件事

【精简技巧】
- 删除"我觉得"、"我认为"
- 删除"其实"、"其实呢"
- 删除"大概"、"可能"等模糊词
- 删除"哈"、"嗯"等语气词
- 用短句代替长句`,
    user: '请用最简洁的方式回复这条消息，只返回1条最合适的回复，5-20字："{text}"'
  },
  empathetic: {
    system: `你是一个超级善解人意的人，总能准确感知对方的情绪。
【核心原则】
1. 先回应对方的情绪，再回应内容
2. 让对方感到被理解和关心
3. 适当表达认同和共鸣
4. 用温暖的言语安慰对方
5. 避免空洞的安慰话
6. 真诚比技巧更重要

【温暖表达】
- "我懂你"
- "确实挺难的"
- "换成我也会这样想"
- "别太自责了"
- "我一直都在"
- "会好起来的"`,
    user: '请用温暖共情的语气回复这条消息，只返回1条最合适的回复，15-50字："{text}"'
  },
  business: {
    system: `你是一个经验丰富的销售/客服，通过微信与客户沟通。
【核心原则】
1. 专业但不冷漠
2. 积极但不逼迫
3. 耐心解答问题
4. 适当促成成交
5. 维护客户关系
6. 处理异议要圆滑

【销售技巧】
- 用"我们"代替"你"
- 提供价值而不是推销
- 解决顾虑而不是忽视
- 创造紧迫感但不过度
- 记住客户的需求和偏好`,
    user: '请用专业销售的语气回复客户的这条消息，只返回1条最合适的回复，30-60字："{text}"'
  }
}

const POLISH_PROMPTS: Record<string, PromptTemplate> = {
  polite: {
    system: `你是一位语言礼仪专家，擅长把普通的话改得更礼貌得体。
【核心原则】
1. 保持原意不变
2. 增加礼貌用语
3. 让语气更温和
4. 删除生硬表达
5. 保持自然流畅
6. 不要过度客气

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话改得更礼貌得体，直接输出3条独立的结果，每条5-30字，不要任何引导文字：\n\n"{text}"'
  },
  confident: {
    system: `你是一位自信表达教练，擅长把犹豫的话改得更坚定有力。
【核心原则】
1. 保持原意但更有底气
2. 删除"我觉得"、"可能"等不确定词
3. 用肯定句代替疑问句
4. 删除冗余解释
5. 表达清晰但不傲慢
6. 让人感觉你很靠谱

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话改得更自信坚定，直接输出3条独立的结果，每条5-30字，不要任何引导文字：\n\n"{text}"'
  },
  warm: {
    system: `你是一位情感沟通专家，擅长把平淡的话改得更温暖有爱。
【核心原则】
1. 增加情感温度
2. 让表达更有人情味
3. 适当增加关心
4. 删除冷漠生硬
5. 让对方感到温暖
6. 保持真诚不做作

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话改得更温暖有爱，直接输出3条独立的结果，每条5-40字，不要任何引导文字：\n\n"{text}"'
  },
  concise: {
    system: `你是一位文字精简专家，擅长把啰嗦的话改得简洁有力。
【核心原则】
1. 删除所有冗余词汇
2. 保留核心信息
3. 用短句代替长句
4. 删除重复表达
5. 砍掉所有废话
6. 一句话说清一件事

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话精简成最简短但意思不变，直接输出3条独立的结果，每条3-15字，越短越好，不要任何引导文字：\n\n"{text}"'
  },
  formal: {
    system: `你是一位专业商务人士，擅长把普通的话改得更加正式规范。
【核心原则】
1. 保持原意不变
2. 使用正式商务用语
3. 用词精准专业
4. 语气庄重得体
5. 避免口语化表达
6. 符合职场沟通规范

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话改得更加正式规范，直接输出3条独立的结果，每条10-40字，不要任何引导文字：\n\n"{text}"'
  },
  rigorous: {
    system: `你是一位严谨的沟通专家，擅长把模糊的话改得更加严谨周密。
【核心原则】
1. 保持原意不变
2. 逻辑清晰有条理
3. 用词精准无歧义
4. 表达周全严谨
5. 避免模糊不清的表述
6. 经得起推敲

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话改得更加严谨周密，直接输出3条独立的结果，每条10-40字，不要任何引导文字：\n\n"{text}"'
  },
  ambiguous: {
    system: `你是一位情感沟通高手，擅长把直白的话改得更加暧昧有氛围感。
【核心原则】
1. 保持原意但增加暗示
2. 言有尽而意无穷
3. 营造暧昧氛围
4. 留有想象空间
5. 温柔且有深意
6. 让对方心领神会

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话改得更加暧昧有氛围感，直接输出3条独立的结果，每条10-30字，不要任何引导文字：\n\n"{text}"'
  },
  greenTea: {
    system: `你是一位高情商沟通专家，擅长把直接的话改得更加"绿茶"（看似无辜实则高明）。
【核心原则】
1. 表面温柔无辜
2. 实则暗含深意
3. 语气轻柔不争
4. 善于示弱但占理
5. 让人无法拒绝
6. 看似无意实则有心

【输出要求】
- 直接输出3条独立的润色结果
- 每条都是一个完整的句子/回复
- 不要加任何引导文字（如"好的，这里是..."、"润色结果："等）
- 不要加序号或编号
- 每条之间用换行分隔
- 直接开始写回复内容`,
    user: '请把下面这句话改得更加"绿茶"（高段位表达），直接输出3条独立的结果，每条10-30字，不要任何引导文字：\n\n"{text}"'
  }
}

const COACH_PROMPTS = {
  fullAnalysis: {
    system: `你是一位顶级的聊天军师，擅长深度分析对话并给出最佳策略。你的分析要专业、精准、实用。

【重要规则】
- 始终用"ta"来指代对方，不要用"你"
- 对话中的"我"指的是用户，"ta"指的是对方

【分析维度】
1. 局势判断：评估当前形势，给出胜率（0-100%）
2. 意图分析：ta的表面意图 + ta的真实意图 + ta的情绪状态
3. 策略建议：应该做的 + 不要做的 + 推荐语气
4. 推荐话术：3条精心设计的回复

【输出要求 - 严格遵守】
必须输出标准 JSON 格式，不要有任何其他文字：
{
  "winRate": 65,
  "advantages": "ta的优势",
  "disadvantages": "ta的劣势",
  "surfaceIntent": "ta表面想说什么",
  "realIntent": "ta真正想要什么",
  "emotion": "ta的情绪状态",
  "needs": "ta的核心需求",
  "risks": "潜在风险",
  "shouldDo": ["建议1", "建议2", "建议3"],
  "shouldNotDo": ["禁忌1", "禁忌2", "禁忌3"],
  "recommendedTone": "推荐语气",
  "replies": [
    {"style": "话术1风格", "content": "具体话术内容，15-30字，像真人聊天"},
    {"style": "话术2风格", "content": "具体话术内容，15-30字，像真人聊天"},
    {"style": "话术3风格", "content": "具体话术内容，15-30字，像真人聊天"}
  ]
}

【重要说明】
- winRate: 0-100 的数字，不要百分号
- advantages/disadvantages: 各一句话描述
- surfaceIntent/realIntent: 各一句话
- emotion: 一个词或短语
- needs: 一句话
- risks: 一句话
- shouldDo/shouldNotDo: 各3条，每条10-20字
- recommendedTone: 一个词（友好/正式/强硬/委婉/共情）
- replies: 必须3条，每条15-30字，像真人微信聊天，不要太长

【绝对禁止】
- 不要加解释或说明
- 不要用 markdown 代码块
- 不要用序号或列表
- 只输出纯 JSON 对象`,
    user: '请分析以下对话，给出完整的军师分析报告：{context}'
  },
  overallAnalysis: {
    system: `你是一位顶级情感关系专家，擅长对整段聊天历史进行深度分析和总结。

【重要规则】
- 始终用"ta"来指代对方，不要用"你"
- 对话中的"我"指的是用户，"ta"指的是对方

【分析维度】
1. 整体胜率：根据整个对话氛围，给出综合成功率（0-100）
2. 关系现状：判断两人当前处于什么阶段（陌生/熟悉/暧昧/热恋等），以及整体氛围如何
3. 对方性格：分析对方的性格特点，用3-5个关键词标签总结
4. 潜在风险：列出3条当前对话中存在的问题或潜在风险
5. 下一步建议：给出3条具体的后续行动建议

【输出要求 - 严格遵守】
必须输出标准 JSON 格式，不要有任何其他文字：
{
  "winRate": 65,
  "relationshipStatus": "详细描述当前关系阶段和氛围",
  "personality": ["性格标签1", "性格标签2", "性格标签3", "性格标签4"],
  "risks": ["风险1", "风险2", "风险3"],
  "nextSteps": ["建议1", "建议2", "建议3"]
}`,
    user: '请对以下整段聊天历史进行深度分析，给出完整的分析报告：{context}'
  }
}

class AIEngine {
  private config: ModelConfig | null = null
  private retryCount = 2
  private retryDelay = 1000

  init() {
    this.setupIpcHandlers()
    logger.info('AI', '引擎初始化完成')
  }

  setConfig(config: ModelConfig) {
    this.config = config
    logger.info('[AI] 配置已更新:', config.provider, config.model)
  }

  private setupIpcHandlers() {
    // Remove existing handler before registering to avoid duplicate
    const safeHandle = (channel: string, handler: any) => {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, handler)
    }

    safeHandle('ai:generateReply', (_event: IpcMainInvokeEvent, context: string, style: string, imageData?: string) => {
      return this.generateReply(context, style, imageData)
    })

    safeHandle('ai:polishText', (_event: IpcMainInvokeEvent, text: string, style: string) => {
      return this.polishText(text, style)
    })

    safeHandle('ai:analyzeIntent', (_event: IpcMainInvokeEvent, chatHistory: any[], goal?: string) => {
      return this.analyzeIntent(chatHistory, goal)
    })

    safeHandle('ai:setConfig', (_event: IpcMainInvokeEvent, config: ModelConfig) => {
      this.setConfig(config)
      return true
    })

    safeHandle('ai:testConnection', () => {
      return this.testConnection()
    })

    safeHandle('ai:initConfig', (_event: IpcMainInvokeEvent, config: ModelConfig) => {
      this.setConfig(config)
      logger.info('AI', '已从渲染进程同步配置')
      return true
    })

    safeHandle('ai:analyzeOverall', (_event: IpcMainInvokeEvent, chatHistory: any[], goal?: string) => {
      return this.analyzeOverall(chatHistory, goal)
    })
  }

  async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    if (!this.config?.apiKey) {
      return { success: false, error: '请先配置 API Key' }
    }

    try {
      const response = await axios.get(
        `${this.config.baseUrl}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 10000
        }
      )

      if (response.status === 200) {
        return { success: true, model: this.config.model }
      } else {
        return { success: false, error: `HTTP ${response.status}` }
      }
    } catch (e: any) {
      logger.error('Test connection failed:', e)
      return {
        success: false,
        error: e.response?.data?.error?.message || e.message || '未知错误'
      }
    }
  }

  async generateReply(context: string, style: string = 'friendly', imageData?: string): Promise<{ style: string; reply: string }[]> {
    // 如果 style 是 'all'，生成所有风格的回复
    if (style === 'all') {
      return await this.generateAllStyleReplies(context, imageData)
    }

    // 否则生成单一风格的回复
    const template = STYLE_PROMPTS[style] || STYLE_PROMPTS.friendly

    try {
      const messages = [
        { role: 'system', content: template.system },
        { role: 'user', content: this.buildUserContent(context, template.user, imageData) }
      ]

      const result = await this.callLLMWithRetry(messages)
      const reply = this.extractFirstReply(result)

      return [{
        style: style,
        reply: reply || result
      }]
    } catch (e: any) {
      logger.error('[AI] 生成回复失败:', e)
      return [{
        style: style,
        reply: e.message || '抱歉，AI生成失败，请稍后重试。'
      }]
    }
  }

  private buildUserContent(context: string, template: string, imageData?: string): any {
    // 如果有图片数据，构建包含图片的内容
    if (imageData && imageData.startsWith('data:')) {
      // 提取 base64 数据（去掉 data:image/xxx;base64, 前缀）
      const base64Data = imageData.split(',')[1]
      
      return [
        {
          type: 'text',
          text: template.replace('{text}', context || '[图片内容]')
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Data}`
          }
        }
      ]
    }
    
    return template.replace('{text}', context)
  }

  // 生成所有风格的回复
  private async generateAllStyleReplies(context: string, imageData?: string): Promise<{ style: string; reply: string }[]> {
    const styles = ['friendly', 'formal', 'humorous', 'concise', 'empathetic']
    const results: { style: string; reply: string }[] = []

    // 构造批量生成的 prompt - 优化 JSON 输出格式
    const systemPrompt = `你是一个专业的微信聊天助手，根据对方的消息生成多种风格的回复。

【回复要求】
1. 必须严格按照 JSON 格式输出
2. 每种风格只生成1条回复
3. 每条回复要像真人聊天，自然口语化
4. 回复要简短（10-50字），不要长篇大论

【风格定义】
- friendly: 像朋友聊天，亲切自然
- formal: 专业商务，但不死板
- humorous: 轻松有趣，让人开心
- concise: 字字珠玑，不说废话
- empathetic: 温暖理解，情绪共鸣

【输出格式 - 必须严格遵守】
直接返回 JSON 对象，不要有任何其他文字：
{"friendly":"友好回复","formal":"正式回复","humorous":"幽默回复","concise":"简洁回复","empathetic":"共情回复"}

【重要】
- 不要加序号或编号
- 不要加解释或说明
- 不要用 markdown 代码块
- 直接输出 JSON 对象`

    try {
      const userContent = this.buildUserContent(context, `对方说："{text}"`, imageData)
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]

      const result = await this.callLLM(messages)
      logger.info('AI', '收到原始回复:', result.substring(0, 200))

      // 尝试解析 JSON
      try {
        // 尝试提取 JSON 对象
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          logger.info('AI', '找到 JSON:', jsonMatch[0].substring(0, 100))
          const parsed = JSON.parse(jsonMatch[0])
          logger.info('AI', 'JSON 解析成功:', Object.keys(parsed))

          for (const [style, reply] of Object.entries(parsed)) {
            if (styles.includes(style) && reply && typeof reply === 'string') {
              results.push({ style, reply: reply.trim() })
            }
          }

          logger.info('AI', '成功提取', { count: results.length })
        }
      } catch (e: any) {
        logger.error('AI', 'JSON 解析失败:', e)
        // JSON 解析失败时的处理
      }

      // 如果 JSON 解析失败或提取数量不够，生成兜底回复
      if (results.length < 3) {
        logger.info('AI', 'JSON 解析失败或提取不足，使用兜底策略')
        // 返回错误提示
        results.push({ style: 'friendly', reply: '❌ 生成失败，请检查网络或API配置' })
      }

      return results

    } catch (e: any) {
      logger.error('AI', '生成所有风格回复失败:', e)
      return [{
        style: 'friendly',
        reply: '❌ ' + (e.message || '抱歉，AI生成失败，请稍后重试。')
      }]
    }
  }

  async polishText(text: string, style: string = 'polite'): Promise<string[]> {
    const template = POLISH_PROMPTS[style] || POLISH_PROMPTS.polite

    try {
      const messages = [
        { role: 'system', content: template.system },
        { role: 'user', content: template.user.replace('{text}', text) }
      ]

      const result = await this.callLLM(messages)
      const replies = this.extractReplies(result)
      return replies.length > 0 ? replies : [result]
    } catch (e: any) {
      logger.error('AI', '润色文本失败:', e)
      return ['❌ ' + (e.message || '润色失败，请稍后重试')]
    }
  }

  async analyzeIntent(chatHistory: any[], goal?: string): Promise<any> {
    try {
      const historyText = chatHistory
        .map((m: any) => `${m.role === 'user' ? '对方' : '我'}：${m.content}`)
        .join('\\n')

      const template = COACH_PROMPTS.fullAnalysis
      const messages = [
        { role: 'system', content: template.system },
        { role: 'user', content: template.user.replace('{context}', historyText + (goal ? `\\n\\n用户目标：${goal}` : '')) }
      ]

      logger.info('AI', '开始军师分析', { messageCount: chatHistory.length, hasGoal: !!goal })

      const result = await this.callLLMWithRetry(messages)
      logger.info('AI', '军师分析完成', { length: result.length })

      try {
        // 尝试匹配完整的 JSON
        let jsonMatch = result.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const jsonStr = jsonMatch[0]
          logger.info('AI', 'JSON 字符串长度:', { length: jsonStr.length })

          // 尝试解析
          try {
            const parsed = JSON.parse(jsonStr)
            logger.info('AI', 'JSON 解析成功')
            logger.info('AI', '解析后的字段:', Object.keys(parsed))
            return {
              ...parsed,
              success: true
            }
          } catch (parseError: any) {
            logger.error('AI', 'JSON 解析失败，尝试修复...', parseError)
            // 尝试修复不完整的 JSON
            const fixed = this.fixIncompleteJSON(jsonStr)
            if (fixed) {
              logger.info('AI', 'JSON 修复成功')
              return {
                ...fixed,
                success: true
              }
            }
          }
        } else {
          logger.error('AI', '未找到 JSON 对象')
        }
      } catch (e: any) {
        logger.error('AI', 'JSON 处理失败:', e)
      }

      return {
        success: false,
        winRate: 50,
        advantages: '无法分析',
        disadvantages: '无法分析',
        surfaceIntent: '无法分析',
        realIntent: '无法分析',
        emotion: '未知',
        needs: '无法分析',
        risks: '暂无风险',
        shouldDo: ['请稍后重试'],
        shouldNotDo: ['不要轻易下结论'],
        recommendedTone: '友好',
        replies: [
          { style: '友好', content: '让我想想怎么回复比较合适' },
          { style: '正式', content: '感谢您的反馈，我们会认真考虑' },
          { style: '委婉', content: '您的建议很有价值，我们会进一步优化' }
        ]
      }
    } catch (e: any) {
      logger.error('AI', '分析意图失败:', e)
      return {
        success: false,
        winRate: 50,
        advantages: '分析失败',
        disadvantages: '分析失败',
        surfaceIntent: '分析失败',
        realIntent: '分析失败',
        emotion: '未知',
        needs: '分析失败',
        risks: '分析失败',
        shouldDo: ['请检查网络连接'],
        shouldNotDo: ['不要放弃'],
        recommendedTone: '友好',
        replies: [
          { style: '友好', content: '让我想想怎么回复比较合适' },
          { style: '正式', content: '感谢您的反馈，我们会认真考虑' },
          { style: '委婉', content: '您的建议很有价值，我们会进一步优化' }
        ],
        error: e?.message || '分析失败，请检查网络连接'
      }
    }
  }

  async analyzeOverall(chatHistory: any[], goal?: string): Promise<any> {
    try {
      const historyText = chatHistory
        .map((m: any) => `${m.role === 'user' ? '对方' : '我'}：${m.content}`)
        .join('\n')

      const template = COACH_PROMPTS.overallAnalysis
      const messages = [
        { role: 'system', content: template.system },
        { role: 'user', content: `【对话目标】${goal || '未设定'}\n\n【聊天记录】\n${historyText}` }
      ]

      logger.info('AI', '开始整体分析', { messageCount: chatHistory.length })

      const result = await this.callLLMWithRetry(messages)

      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return { ...parsed, success: true }
        }
      } catch (e: any) {
        logger.error('AI', '整体分析 JSON 解析失败:', e)
      }

      return {
        success: false,
        winRate: 50,
        relationshipStatus: '无法准确判断，建议继续对话积累数据',
        personality: ['数据不足'],
        risks: ['建议增加更多对话后再分析'],
        nextSteps: ['继续与对方对话，积累更多聊天数据', '尝试在不同话题上进行互动', '观察对方的回复频率和时长变化']
      }
    } catch (e: any) {
      logger.error('AI', '整体分析失败:', e)
      return {
        success: false,
        winRate: 50,
        relationshipStatus: '分析出错，请稍后重试',
        personality: ['分析失败'],
        risks: ['请检查网络连接'],
        nextSteps: ['稍后重试'],
        error: e?.message || '分析失败，请检查网络连接'
      }
    }
  }

  private fixIncompleteJSON(jsonStr: string): any | null {
    try {
      // 尝试补全 JSON
      let fixed = jsonStr
      
      // 如果 replies 数组被截断，尝试补全
      if (fixed.includes('"replies"')) {
        const repliesMatch = fixed.match(/"replies"\s*:\s*\[([\s\S]*)$/)
        if (repliesMatch && !fixed.includes(']')) {
          fixed = fixed + ']'
        }
        
        // 尝试补全最后一个 replies 项
        const lastReplyMatch = fixed.match(/"content":\s*"([^"]*?)$/)
        if (lastReplyMatch) {
          const content = lastReplyMatch[1]
          const quote = content.includes('"') ? "'" : '"'
          fixed = fixed + `${quote}]}`
        }
      }
      
      // 尝试补全其他被截断的字符串
      if (!fixed.endsWith('}')) {
        fixed = fixed + '}'
      }
      
      // 尝试解析修复后的 JSON
      return JSON.parse(fixed)
    } catch (e: any) {
      logger.error('AI', 'JSON 修复失败:', e)
      return null
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async callLLMWithRetry(
    messages: { role: string; content: string }[],
    retries: number = this.retryCount
  ): Promise<string> {
    try {
      return await this.callLLM(messages)
    } catch (e: any) {
      if (retries > 0 && this.isRetryableError(e)) {
        logger.info('AI', `请求失败，${this.retryDelay / 1000}s 后重试`, { retriesRemaining: retries })
        await this.sleep(this.retryDelay)
        return this.callLLMWithRetry(messages, retries - 1)
      }
      throw e
    }
  }

  private isRetryableError(e: any): boolean {
    const status = e.response?.status
    return !status || status >= 500 || status === 429 || e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT'
  }

  private async callLLM(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.config) {
      throw new Error('请先配置 API Key')
    }

    if (!this.config.apiKey) {
      throw new Error('API Key 不能为空')
    }

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      const content = response.data.choices[0]?.message?.content
      if (!content) {
        throw new Error('API 返回内容为空')
      }

      return content.trim()
    } catch (e: any) {
      const errorMsg = this.getErrorMessage(e)
      logger.error('[AI] LLM 调用失败:', errorMsg)
      throw new Error(errorMsg)
    }
  }

  private getErrorMessage(e: any): string {
    if (e.response) {
      const status = e.response.status
      const data = e.response.data

      switch (status) {
        case 401:
          return 'API Key 无效，请检查配置'
        case 403:
          return 'API 权限不足'
        case 404:
          return '模型不存在或接口地址错误'
        case 429:
          return '请求过于频繁，请稍后再试'
        case 500:
        case 502:
        case 503:
          return '服务器暂时不可用，请稍后重试'
        default:
          return data?.error?.message || `请求失败 (${status})`
      }
    }

    if (e.code === 'ECONNABORTED') {
      return '请求超时，请检查网络连接'
    }

    if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') {
      return '无法连接到 API 服务器，请检查地址配置'
    }

    return e.message || '未知错误'
  }

  private extractReplies(text: string): string[] {
    const replies: string[] = []
    
    // 清理文本：移除常见的引导语
    let cleaned = this.removeIntroText(text)
    
    // 策略1：先用换行符分割（如果 AI 按行输出）
    const lines = cleaned.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // 跳过引导性文字
      if (this.isIntroLine(trimmed)) {
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
      
      // 如果没有编号，检查是否是独立句子（有明确结束标点）
      if (trimmed.length > 5) {
        if (trimmed.endsWith('。') || 
            trimmed.endsWith('！') || 
            trimmed.endsWith('？') ||
            trimmed.endsWith('～') ||
            trimmed.endsWith('😂') ||
            trimmed.endsWith('�') ||
            trimmed.endsWith('🤣') ||
            trimmed.endsWith('...')) {
          replies.push(trimmed)
        }
      }
    }
    
    // 策略2：如果没有提取到，尝试处理一行多编号的情况
    // 如："1. xxx 2. xxx 3. xxx"
    if (replies.length === 0) {
      // 使用正则匹配所有 "数字. 内容" 的模式
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
      // 按常见标点分割
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
    
    logger.info('AI', '提取到的回复数:', { count: replies.length })
    return replies.slice(0, 5)
  }
  
  // 检查是否是引导性文字
  private isIntroLine(text: string): boolean {
    // 如果文本太短，不是引导语
    if (text.length < 10) {
      return false
    }
    
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
    
    // 检查是否匹配任何引导模式
    for (const pattern of introPatterns) {
      if (text.startsWith(pattern)) {
        return true
      }
    }
    
    return false
  }
  
  // 移除引导文字
  private removeIntroText(text: string): string {
    let cleaned = text
    
    const patterns = [
      /^[^。！？]*[：:]/,  // 移除 "xxx：" 之前的部分
      /^好的，这里是[^：]*：[\\s\\S]*/,  // 移除 "好的，这里是xxx："
      /^润色结果[：:][\\s\\S]*/,  // 移除 "润色结果："
    ]
    
    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '')
    }
    
    return cleaned.trim()
  }

  // 提取第一条完整回复
  private extractFirstReply(text: string): string {
    const lines = text.split('\\n').filter(line => line.trim())
    const numberedRegex = /^\\d+[\\.、]\\s*(.+)/

    for (const line of lines) {
      const match = line.match(numberedRegex)
      if (match) {
        return match[1].trim()
      }
    }

    // 如果没有匹配到序号，返回第一行
    if (lines.length > 0) {
      return lines[0].trim()
    }

    // 如果连第一行都没有，返回原文
    return text.trim()
  }
}

export const aiEngine = new AIEngine()
