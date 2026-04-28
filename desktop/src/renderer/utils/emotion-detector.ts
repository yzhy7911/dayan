/**
 * 表情包情绪识别工具
 */

export interface EmotionResult {
  emotion: string;
  confidence: number;
  suggestions: string[];
}

export interface EmojiMapping {
  [key: string]: {
    emotion: string;
    keywords: string[];
    style: string;
  };
}

// 常见表情和对应的情绪
const emojiMappings: EmojiMapping = {
  // 积极情绪
  '😊': { emotion: '开心', keywords: ['开心', '高兴', '愉快'], style: 'friendly' },
  '😄': { emotion: '开心', keywords: ['开心', '大笑', '快乐'], style: 'friendly' },
  '🥰': { emotion: '喜欢', keywords: ['喜欢', '爱', '可爱'], style: 'warm' },
  '😍': { emotion: '喜爱', keywords: ['喜爱', '喜欢', '爱'], style: 'warm' },
  '🤗': { emotion: '拥抱', keywords: ['拥抱', '友好', '温暖'], style: 'warm' },
  '👍': { emotion: '赞同', keywords: ['赞同', '好的', '支持'], style: 'friendly' },
  '🎉': { emotion: '庆祝', keywords: ['庆祝', '恭喜', '高兴'], style: 'friendly' },
  '🎊': { emotion: '庆祝', keywords: ['庆祝', '恭喜', '快乐'], style: 'friendly' },
  '👏': { emotion: '赞赏', keywords: ['赞赏', '厉害', '好棒'], style: 'friendly' },
  '💕': { emotion: '喜欢', keywords: ['喜欢', '爱', '心'], style: 'warm' },

  // 中性情绪
  '🙂': { emotion: '平静', keywords: ['平静', '还好', '一般'], style: 'friendly' },
  '🤔': { emotion: '思考', keywords: ['思考', '疑问', '想想'], style: 'formal' },
  '😐': { emotion: '平静', keywords: ['平静', '无表情', '一般'], style: 'formal' },

  // 消极情绪
  '😢': { emotion: '难过', keywords: ['难过', '伤心', '不开心'], style: 'empathetic' },
  '😭': { emotion: '哭泣', keywords: ['哭泣', '难过', '伤心'], style: 'empathetic' },
  '😔': { emotion: '失落', keywords: ['失落', '不开心', '失望'], style: 'empathetic' },
  '😒': { emotion: '不满', keywords: ['不满', '无语', '不想'], style: 'concise' },
  '😠': { emotion: '生气', keywords: ['生气', '愤怒', '不满'], style: 'concise' },
  '😞': { emotion: '失望', keywords: ['失望', '难过', '不开心'], style: 'empathetic' },

  // 其他情绪
  '😅': { emotion: '尴尬', keywords: ['尴尬', '汗', '不好意思'], style: 'humorous' },
  '🤣': { emotion: '爆笑', keywords: ['笑', '好笑', '搞笑'], style: 'humorous' },
  '😜': { emotion: '调皮', keywords: ['调皮', '有趣', '开玩笑'], style: 'humorous' },
  '🙄': { emotion: '无语', keywords: ['无语', '翻白眼', '无语'], style: 'humorous' },
  '🥺': { emotion: '可怜', keywords: ['可怜', '拜托', '求求'], style: 'empathetic' },
  '😌': { emotion: '满足', keywords: ['满足', '安心', '放心'], style: 'friendly' },
};

export class EmotionDetector {
  /**
   * 从文本中检测情绪
   */
  static detectFromText(text: string): EmotionResult | null {
    // 检查文本中的表情
    const emojis = text.match(/[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Flag_Sequence}\p{Emoji_Keycap_Sequence}\p{Emoji_Tag_Sequence}\p{Emoji_ZWJ_Sequence}]/gu);

    if (!emojis || emojis.length === 0) {
      return null;
    }

    // 分析最频繁出现的表情
    const emojiCount = new Map<string, number>();
    for (const emoji of emojis) {
      emojiCount.set(emoji, (emojiCount.get(emoji) || 0) + 1);
    }

    // 找出出现最多的表情
    let mostFrequentEmoji = emojis[0];
    let maxCount = 0;

    for (const [emoji, count] of emojiCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentEmoji = emoji;
      }
    }

    // 查找表情映射
    const mapping = emojiMappings[mostFrequentEmoji];
    if (!mapping) {
      return null;
    }

    return {
      emotion: mapping.emotion,
      confidence: Math.min(0.9, 0.5 + maxCount * 0.1),
      suggestions: mapping.keywords,
    };
  }

  /**
   * 根据情绪推荐回复风格
   */
  static getStyleRecommendation(emotion: string): string {
    const styleMap: Record<string, string> = {
      '开心': 'friendly',
      '喜欢': 'warm',
      '庆祝': 'friendly',
      '赞赏': 'friendly',
      '难过': 'empathetic',
      '哭泣': 'empathetic',
      '失望': 'empathetic',
      '生气': 'concise',
      '不满': 'concise',
      '思考': 'formal',
      '平静': 'friendly',
      '尴尬': 'humorous',
      '爆笑': 'humorous',
      '调皮': 'humorous',
      '可怜': 'empathetic',
      '满足': 'friendly',
    };

    return styleMap[emotion] || 'friendly';
  }

  /**
   * 生成基于情绪的回复建议
   */
  static generateSuggestions(emotion: string): string[] {
    const suggestionMap: Record<string, string[]> = {
      '开心': [
        '哈哈，看你很开心！',
        '真好，为你高兴！',
        '能让你开心真是太好了！',
      ],
      '喜欢': [
        '看来你很喜欢这个~',
        '能得到你的喜欢真好！',
        '喜欢就好！',
      ],
      '庆祝': [
        '恭喜恭喜！🎉',
        '太棒了，值得庆祝！',
        '这真是好消息！',
      ],
      '难过': [
        '怎么了？发生什么事了吗？',
        '别难过，抱抱你',
        '会好起来的，加油！',
      ],
      '失望': [
        '别失望，我们再试试？',
        '没关系，下次会更好的',
        '理解你的感受',
      ],
      '生气': [
        '消消气，别气坏身体',
        '深呼吸，冷静一下',
        '什么事让你这么生气？',
      ],
      '思考': [
        '让我想想看...',
        '嗯，确实值得好好想想',
        '你觉得呢？',
      ],
      '尴尬': [
        '哈哈，没事没事',
        '别尴尬，都会过去的',
        '这种情况确实有点尴尬',
      ],
    };

    return suggestionMap[emotion] || [
      '我收到你的消息了',
      '嗯嗯，我明白了',
      '好的好的',
    ];
  }

  /**
   * 获取所有支持的表情列表
   */
  static getSupportedEmojis(): Array<{ emoji: string; emotion: string }> {
    return Object.entries(emojiMappings).map(([emoji, data]) => ({
      emoji,
      emotion: data.emotion,
    }));
  }
}
