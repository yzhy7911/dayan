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

type ResponseMode = 'fast' | 'balanced' | 'deep'

const NATURAL_REPLY_RULES = `你在替用户写微信里的下一句回复，不是写建议。
【先读上下文】
- 如果有多轮记录，重点看最后一条“对方”说了什么
- “我”是用户已经说过的话，不要重复用户已表达过的内容
- 如果最后一条是“我”说的，就顺着当前局面补一句自然的话，不要假装对方又说了什么

【说话质感】
- 像真人临时打出来的微信消息，可以有轻微口语、省略和停顿
- 一次只回一句或两句，优先 8-35 个字
- 不要总结局势，不要讲道理，不要解释你为什么这么回
- 不要写成客服话术、作文、咨询建议、情绪分析
- 不要使用“根据你说的/我理解你的意思/建议你/可以回复/以下是”
- 不要输出引号、序号、标签、括号说明、markdown
- 标点自然，少用感叹号；不要每句都用“～”`

const STYLE_PROMPTS: Record<string, PromptTemplate> = {
  friendly: {
    system: `${NATURAL_REPLY_RULES}
【友好风格】
- 亲近但别热情过头
- 可以用“嗯嗯”“哈哈”“那也行”“我懂”这类日常表达
- 像熟人聊天，不要端着`,
    user: '根据下面聊天记录，直接写用户下一句微信回复。只输出回复本身：\n{text}'
  },
  formal: {
    system: `${NATURAL_REPLY_RULES}
【正式风格】
- 稳一点、礼貌一点，但仍然像微信消息
- 不要写邮件腔，不要“尊敬的/祝商祺”
- 能短就短，保留必要信息`,
    user: '根据下面聊天记录，直接写用户下一句偏正式的微信回复。只输出回复本身：\n{text}'
  },
  humorous: {
    system: `${NATURAL_REPLY_RULES}
【幽默风格】
- 轻轻带一点好笑就行，不要硬造梗
- 不要油腻，不要段子手，不要过度夸张
- 如果场景严肃，幽默要收着点`,
    user: '根据下面聊天记录，直接写用户下一句带一点幽默感的微信回复。只输出回复本身：\n{text}'
  },
  concise: {
    system: `${NATURAL_REPLY_RULES}
【简洁风格】
- 尽量 5-18 个字
- 直接接话，不铺垫
- 不冷漠，短但有人味`,
    user: '根据下面聊天记录，直接写用户下一句很简洁的微信回复。只输出回复本身：\n{text}'
  },
  empathetic: {
    system: `${NATURAL_REPLY_RULES}
【共情风格】
- 先接住对方情绪，再轻轻回应事情
- 不要空泛安慰，不要心理咨询腔
- 温和、具体、像真的在听`,
    user: '根据下面聊天记录，直接写用户下一句更共情的微信回复。只输出回复本身：\n{text}'
  },
  business: {
    system: `${NATURAL_REPLY_RULES}
【销售/客服风格】
- 专业、积极，但不要逼单
- 先回应顾虑，再给一个很轻的下一步
- 像微信沟通，不要客服模板`,
    user: '根据下面聊天记录，直接写用户下一句销售/客服场景的微信回复。只输出回复本身：\n{text}'
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
- 只输出纯 JSON 对象
- 第一个字符必须是 {，最后一个字符必须是 }`,
    user: '只输出一个合法 JSON 对象，不要解释，不要 markdown。请分析以下对话，给出完整的军师分析报告：\n{context}'
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

  private isPolishLikeOutput(text: string): boolean {
    const normalized = text.replace(/\s+/g, '').toLowerCase()
    return /润色|改写|优化|版本\d|版本一|版本二|建议回复|可以回复|回复示例|参考回复|如下/.test(normalized)
  }

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

    safeHandle('ai:generateReply', (_event: IpcMainInvokeEvent, context: string, style: string, modeOrImage?: ResponseMode | string, imageData?: string) => {
      const mode: ResponseMode = modeOrImage === 'fast' || modeOrImage === 'balanced' || modeOrImage === 'deep'
        ? modeOrImage
        : 'balanced'
      const image = typeof modeOrImage === 'string' && modeOrImage.startsWith('data:')
        ? modeOrImage
        : imageData
      return this.generateReply(context, style, mode, image)
    })

    safeHandle('ai:polishText', (_event: IpcMainInvokeEvent, text: string, style: string) => {
      return this.polishText(text, style)
    })

    safeHandle('ai:generatePhrasebookDrafts', (_event: IpcMainInvokeEvent, documents: any[]) => {
      return this.generatePhrasebookDrafts(documents)
    })

    safeHandle('ai:refineKnowledgeDocument', (_event: IpcMainInvokeEvent, document: any) => {
      return this.refineKnowledgeDocument(document)
    })

    safeHandle('ai:analyzeIntent', (_event: IpcMainInvokeEvent, chatHistory: any[], goal?: string, mode: ResponseMode = 'balanced') => {
      return this.analyzeIntent(chatHistory, goal, mode)
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

  async generateReply(
    context: string,
    style: string = 'friendly',
    mode: ResponseMode = 'balanced',
    imageData?: string
  ): Promise<{ style: string; reply: string }[]> {
    // 如果 style 是 'all'，生成所有风格的回复
    if (style === 'all') {
      return await this.generateAllStyleReplies(context, mode, imageData)
    }

    // 否则生成单一风格的回复
    const template = STYLE_PROMPTS[style] || STYLE_PROMPTS.friendly

    try {
      const baseUserContent = this.buildUserContent(context, template.user, imageData)
      const multiReplyInstruction = `

请一次给出3条不同表述的候选回复，要求：
- 本任务是“代写下一句回复”，不是润色或改写原句
- 不要输出“润色版/版本1/版本2/优化建议/可改成”
- 不要复述用户原话，不要解释思路
- 每条都可直接发送
- 语气一致但措辞有差异
- 不要解释，不要标题
- 每条单独一行`
      const singleStylePrompt = typeof baseUserContent === 'string'
        ? `${baseUserContent}${multiReplyInstruction}`
        : baseUserContent

      const messages = [
        { role: 'system', content: template.system },
        { role: 'user', content: singleStylePrompt }
      ]

      const result = await this.callLLMWithRetry(messages, undefined, mode)
      let parsedReplies = this.extractReplies(result)
        .map(item => this.cleanGeneratedReply(item))
        .filter(Boolean)
        .slice(0, 3)

      // 兜底：如果检测到“润色/版本说明”倾向，自动再生成一次更严格结果
      if (this.isPolishLikeOutput(result) || parsedReplies.some(item => this.isPolishLikeOutput(item))) {
        const strictMessages = [
          { role: 'system', content: `${template.system}\n\n【最终硬规则】你是代写聊天下一句，不是润色器。严禁输出“润色/版本/建议/说明”。` },
          { role: 'user', content: `${singleStylePrompt}\n\n再次强调：只输出可直接发送的3条回复，每条一行。` }
        ]
        const retryResult = await this.callLLMWithRetry(strictMessages, 1, mode)
        parsedReplies = this.extractReplies(retryResult)
          .map(item => this.cleanGeneratedReply(item))
          .filter(Boolean)
          .filter(item => !this.isPolishLikeOutput(item))
          .slice(0, 3)
      }

      if (parsedReplies.length > 0) {
        return parsedReplies.map(reply => ({
          style: style,
          reply
        }))
      }

      const fallbackReply = this.cleanGeneratedReply(this.extractFirstReply(result)) || result
      if (this.isPolishLikeOutput(fallbackReply)) {
        return [{
          style: style,
          reply: '我再换个更自然的说法，你稍等一下。'
        }]
      }

      return [{
        style: style,
        reply: fallbackReply
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
  private async generateAllStyleReplies(
    context: string,
    mode: ResponseMode = 'balanced',
    imageData?: string
  ): Promise<{ style: string; reply: string }[]> {
    const styles = ['friendly', 'formal', 'humorous', 'concise', 'empathetic']
    const results: { style: string; reply: string }[] = []

    // 构造批量生成的 prompt - 优化 JSON 输出格式
    const systemPrompt = `${NATURAL_REPLY_RULES}

你需要一次生成 5 种不同风格的微信下一句回复。

【回复要求】
1. 必须严格按照 JSON 格式输出
2. 每种风格只生成1条回复
3. 每条都要像真人临时打出来的微信消息
4. 不要让 5 条只是同一句话换形容词，要真的有差异
5. 回复要短，通常 8-35 字

【风格定义】
- friendly: 亲近自然
- formal: 稳妥礼貌，但不邮件腔
- humorous: 轻轻带一点好笑，不硬造梗
- concise: 很短但不冷
- empathetic: 先接情绪，温和具体

【输出格式 - 必须严格遵守】
直接返回 JSON 对象，不要有任何其他文字：
{"friendly":"友好回复","formal":"正式回复","humorous":"幽默回复","concise":"简洁回复","empathetic":"共情回复"}

【重要】
- 不要加序号或编号
- 不要加解释或说明
- 不要用 markdown 代码块
- 直接输出 JSON 对象`

    try {
      const userContent = this.buildUserContent(context, `根据下面聊天记录，生成用户下一句回复的 5 个风格版本：\n{text}`, imageData)
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]

      const result = await this.callLLM(messages, mode)
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
              const cleaned = this.cleanGeneratedReply(reply)
              if (!this.isPolishLikeOutput(cleaned)) {
                results.push({ style, reply: cleaned })
              }
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

  async generatePhrasebookDrafts(documents: any[]): Promise<Array<{ category: string; keyword: string; content: string; sourceTitle?: string }>> {
    try {
      const sourceText = documents
        .map((doc, index) => [
          `资料${index + 1}：${doc.title || '未命名资料'}`,
          `场景：${doc.scene || '通用'}`,
          `类型：${doc.type || '资料'}`,
          `内容：${doc.content || ''}`
        ].join('\n'))
        .join('\n\n')

      const messages = [
        {
          role: 'system',
          content: `你是销售/客服/关系沟通的标准话术整理师。你的任务是把知识库资料提炼成“可以直接发给对方”的标准回答。

要求：
- 只基于资料内容提炼，不要编造资料里没有的价格、优惠、承诺、政策或关系事实
- 每条话术回答一个明确问题
- 回答要克制、统一、自然，适合微信或私聊直接发送
- 遇到资料缺少依据时，回答要引导“我帮您确认最新政策/情况”，不要硬答
- 输出 3-6 条

必须只输出 JSON，不要输出解释文字：
{
  "items": [
    {
      "category": "商务",
      "keyword": "客户常问问题",
      "content": "可以直接发送的标准回答",
      "sourceTitle": "依据资料标题"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `请从以下知识库资料中提取标准问题和标准回答草稿：\n\n${sourceText}`
        }
      ]

      const result = await this.callLLMWithRetry(messages)
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.error('AI', '生成话术草稿失败：未找到 JSON 对象')
        return []
      }

      const parsed = JSON.parse(jsonMatch[0])
      const items = Array.isArray(parsed.items) ? parsed.items : []
      return items
        .filter((item: any) => item?.keyword && item?.content)
        .slice(0, 8)
        .map((item: any) => ({
          category: typeof item.category === 'string' ? item.category : '商务',
          keyword: String(item.keyword).trim(),
          content: String(item.content).trim(),
          sourceTitle: typeof item.sourceTitle === 'string' ? item.sourceTitle : undefined
        }))
    } catch (e: any) {
      logger.error('AI', '生成话术草稿失败:', e)
      return []
    }
  }

  async refineKnowledgeDocument(document: any): Promise<{
    success: boolean
    title?: string
    content?: string
    type?: string
    tags?: string[]
    summary?: string
    error?: string
  }> {
    try {
      const messages = [
        {
          role: 'system',
          content: `你是知识库整理助手。请把原始资料整理成可检索、可引用、可用于回复和军师分析的知识条目。

要求：
- 保留关键事实，不编造资料中不存在的价格、优惠、承诺、时间、人物关系
- 内容应简洁、结构清晰，适合后续检索
- 生成 3-6 个标签，标签尽量短
- type 只能在这些值中选择一个：产品资料、价格政策、售后规则、禁止承诺、异议处理、关系笔记、沟通策略、客户背景

只输出 JSON：
{
  "title": "优化后的标题",
  "type": "产品资料",
  "tags": ["标签1", "标签2"],
  "summary": "一句话摘要（30字以内）",
  "content": "整理后的正文"
}`
        },
        {
          role: 'user',
          content: `请整理以下资料：\n标题：${document?.title || '未命名'}\n场景：${document?.scene || '通用'}\n类型：${document?.type || '产品资料'}\n内容：${document?.content || ''}`
        }
      ]

      const result = await this.callLLMWithRetry(messages)
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { success: false, error: '未解析到整理结果' }
      }

      const parsed = JSON.parse(jsonMatch[0])
      return {
        success: true,
        title: typeof parsed.title === 'string' ? parsed.title.trim() : undefined,
        content: typeof parsed.content === 'string' ? parsed.content.trim() : undefined,
        type: typeof parsed.type === 'string' ? parsed.type.trim() : undefined,
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((tag: any) => String(tag).trim()).filter(Boolean).slice(0, 8) : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : undefined
      }
    } catch (e: any) {
      logger.error('AI', '整理知识资料失败:', e)
      return { success: false, error: e?.message || '整理失败' }
    }
  }

  async analyzeIntent(chatHistory: any[], goal?: string, mode: ResponseMode = 'balanced'): Promise<any> {
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

      const result = await this.callLLMWithRetry(messages, undefined, mode)
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
          const fallback = this.buildCoachFallbackFromText(result)
          return {
            ...fallback,
            success: true,
            parseWarning: '模型未返回 JSON，已使用文本兜底解析'
          }
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

  private buildCoachFallbackFromText(text: string): any {
    const cleaned = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/#+\s*/g, '')
      .trim()

    const lines = cleaned
      .split('\n')
      .map(line => line.replace(/^[-*、\d.\s]+/, '').trim())
      .filter(Boolean)

    const pick = (patterns: RegExp[], fallback: string) => {
      for (const pattern of patterns) {
        const match = cleaned.match(pattern)
        if (match?.[1]?.trim()) return match[1].trim().slice(0, 80)
      }
      return fallback
    }

    const winRateMatch = cleaned.match(/(\d{1,3})\s*%/)
    const winRate = winRateMatch ? Math.max(0, Math.min(100, Number(winRateMatch[1]))) : 50
    const replyLines = lines
      .filter(line => !/(胜率|优势|劣势|意图|情绪|需求|风险|建议|不要|应该|语气)/.test(line))
      .filter(line => line.length >= 4 && line.length <= 80)
      .slice(-3)

    return {
      winRate,
      advantages: pick([/优势[：:]\s*([^\n]+)/, /有利[：:]\s*([^\n]+)/], '已有对话上下文，可以继续观察ta的反馈'),
      disadvantages: pick([/劣势[：:]\s*([^\n]+)/, /风险[：:]\s*([^\n]+)/], '信息还不够完整，避免过度解读'),
      surfaceIntent: pick([/表面意图[：:]\s*([^\n]+)/, /表面[：:]\s*([^\n]+)/], 'ta在表达当前想法或状态'),
      realIntent: pick([/真实意图[：:]\s*([^\n]+)/, /真实[：:]\s*([^\n]+)/], 'ta可能在试探你的反应'),
      emotion: pick([/情绪[：:]\s*([^\n]+)/], '不确定'),
      needs: pick([/需求[：:]\s*([^\n]+)/], '需要被理解和轻量回应'),
      risks: pick([/风险[：:]\s*([^\n]+)/], '不要急着推进或追问'),
      shouldDo: [
        '先接住ta的情绪',
        '回复短一点，别压迫',
        '给对方留出余地'
      ],
      shouldNotDo: [
        '不要连续追问',
        '不要急着解释太多',
        '不要强行推进关系'
      ],
      recommendedTone: '温和',
      replies: (replyLines.length ? replyLines : [
        '嗯，我明白你的意思，我先不急着说太多',
        '那你先按自己的节奏来，我这边没关系',
        '我懂，先别有压力，我们慢慢说'
      ]).map((content, index) => ({
        style: ['温和', '轻松', '稳妥'][index] || '温和',
        content
      }))
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
    retries: number = this.retryCount,
    mode: ResponseMode = 'balanced'
  ): Promise<string> {
    try {
      return await this.callLLM(messages, mode)
    } catch (e: any) {
      if (retries > 0 && this.isRetryableError(e)) {
        logger.info('AI', `请求失败，${this.retryDelay / 1000}s 后重试`, { retriesRemaining: retries })
        await this.sleep(this.retryDelay)
        return this.callLLMWithRetry(messages, retries - 1, mode)
      }
      throw e
    }
  }

  private isRetryableError(e: any): boolean {
    const status = e.response?.status
    return !status || status >= 500 || status === 429 || e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT'
  }

  private async callLLM(messages: { role: string; content: string }[], mode: ResponseMode = 'balanced'): Promise<string> {
    if (!this.config) {
      throw new Error('请先配置 API Key')
    }

    if (!this.config.apiKey) {
      throw new Error('API Key 不能为空')
    }

    try {
      const inferenceConfig = mode === 'fast'
        ? { temperature: 0.7, top_p: 0.88, presence_penalty: 0.1, max_tokens: 620, timeout: 18000 }
        : mode === 'deep'
          ? { temperature: 0.9, top_p: 0.94, presence_penalty: 0.25, max_tokens: 1600, timeout: 40000 }
          : { temperature: 0.86, top_p: 0.92, presence_penalty: 0.2, max_tokens: 1200, timeout: 30000 }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages: messages,
          temperature: inferenceConfig.temperature,
          top_p: inferenceConfig.top_p,
          presence_penalty: inferenceConfig.presence_penalty,
          max_tokens: inferenceConfig.max_tokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: inferenceConfig.timeout
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

  private cleanGeneratedReply(text: string): string {
    let cleaned = text.trim()

    cleaned = cleaned
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/```$/g, '')
      .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
      .replace(/^(回复|参考回复|建议回复|可以回复|话术|微信回复)\s*[：:]\s*/i, '')
      .replace(/^第?\s*\d+\s*[条个]?[.、)：:]\s*/, '')
      .replace(/^(好的|当然可以|可以的)[，,。！!\s]*(?=(我|你|这|那|先|嗯|好|不|要|可以|行|没|辛苦|谢谢|别|再|就|那))/i, '')
      .trim()

    const lines = cleaned
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => !this.isIntroLine(line))

    cleaned = lines[0] || cleaned

    return cleaned
      .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
      .trim()
  }
}

export const aiEngine = new AIEngine()
