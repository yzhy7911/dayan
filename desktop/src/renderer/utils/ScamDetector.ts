/**
 * 反诈预警系统
 */

export interface ScamWarning {
  level: 'low' | 'medium' | 'high'
  message: string
  confidence: number
}

export class ScamDetector {
  private static readonly keywordPatterns = [
    { keywords: ['转账', '汇款', '打钱', '转钱', '付款'], level: 'high' as const },
    { keywords: ['银行卡', '密码', '验证码', '身份证', '手机号'], level: 'high' as const },
    { keywords: ['中奖', '奖金', '奖品', '免费领', '领奖'], level: 'medium' as const },
    { keywords: ['公安局', '检察院', '法院', '通缉', '逮捕'], level: 'medium' as const },
    { keywords: ['刷单', '兼职', '佣金', '返利'], level: 'high' as const },
    { keywords: ['投资', '理财', '股票', '基金', '稳赚'], level: 'medium' as const },
    { keywords: ['冒充', '假装', '客服', '老板', '领导'], level: 'high' as const },
  ]

  static analyze(text: string): ScamWarning | null {
    const lowerText = text.toLowerCase()
    let maxLevel: 'low' | 'medium' | 'high' = 'low'
    let matchedPatterns: string[] = []

    for (const pattern of this.keywordPatterns) {
      const found = pattern.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
      if (found) {
        matchedPatterns.push(pattern.keywords[0])
        if (pattern.level === 'high') {
          maxLevel = 'high'
        } else if (pattern.level === 'medium' && maxLevel !== 'high') {
          maxLevel = 'medium'
        }
      }
    }

    if (matchedPatterns.length === 0) {
      return null
    }

    const message = this.generateWarningMessage(maxLevel, matchedPatterns)
    const confidence = Math.min(0.9, 0.4 + matchedPatterns.length * 0.15)

    return {
      level: maxLevel,
      message,
      confidence,
    }
  }

  private static generateWarningMessage(level: string, keywords: string[]): string {
    if (level === 'high') {
      return `⚠️ 检测到潜在诈骗风险！内容中包含高风险关键词：${keywords.join('、')}。请提高警惕，不要轻易转账或透露个人信息。`
    }
    if (level === 'medium') {
      return `🤔 请谨慎处理！内容中包含：${keywords.join('、')}。建议核实对方身份后再操作。`
    }
    return `⚠️ 请留意，内容中包含：${keywords.join('、')}。建议谨慎处理。`
  }

  static shouldShowWarning(text: string): boolean {
    const warning = this.analyze(text)
    return warning !== null && (warning.level === 'medium' || warning.level === 'high')
  }
}
