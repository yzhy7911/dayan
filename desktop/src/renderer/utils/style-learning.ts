/**
 * 用户个性化风格学习系统
 */

export interface StylePreference {
  style: string;
  count: number;
  lastUsed: number;
}

export interface LearningData {
  preferences: StylePreference[];
  totalUsage: number;
  lastUpdated: number;
}

export class StyleLearner {
  private static readonly STORAGE_KEY = 'dayan-style-preferences';
  private static data: LearningData | null = null;

  /**
   * 初始化学习系统
   */
  static init(): void {
    this.loadData();
  }

  /**
   * 从本地存储加载数据
   */
  private static loadData(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.data = JSON.parse(saved);
      } else {
        this.data = {
          preferences: [],
          totalUsage: 0,
          lastUpdated: Date.now(),
        };
      }
    } catch (e) {
      console.error('[StyleLearner] 加载数据失败:', e);
      this.data = {
        preferences: [],
        totalUsage: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * 保存数据到本地存储
   */
  private static saveData(): void {
    try {
      if (this.data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch (e) {
      console.error('[StyleLearner] 保存数据失败:', e);
    }
  }

  /**
   * 记录用户选择的风格
   */
  static recordChoice(style: string): void {
    if (!this.data) {
      this.data = {
        preferences: [],
        totalUsage: 0,
        lastUpdated: Date.now(),
      };
    }

    const existing = this.data.preferences.find(p => p.style === style);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = Date.now();
    } else {
      this.data.preferences.push({
        style,
        count: 1,
        lastUsed: Date.now(),
      });
    }

    this.data.totalUsage += 1;
    this.data.lastUpdated = Date.now();

    this.saveData();
    console.log('[StyleLearner] 记录风格选择:', style);
  }

  /**
   * 获取用户偏好的风格（按使用频率排序）
   */
  static getPreferredStyles(limit = 3): string[] {
    if (!this.data || this.data.preferences.length === 0) {
      return ['friendly', 'warm', 'formal']; // 默认推荐
    }

    // 按使用频率排序
    const sorted = [...this.data.preferences].sort((a, b) => {
      // 优先考虑使用次数
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      // 次数相同的话，考虑最后使用时间
      return b.lastUsed - a.lastUsed;
    });

    return sorted.slice(0, limit).map(p => p.style);
  }

  /**
   * 获取最推荐的风格
   */
  static getRecommendedStyle(): string {
    const preferred = this.getPreferredStyles(1);
    return preferred[0] || 'friendly';
  }

  /**
   * 获取风格使用统计
   */
  static getStyleStats(): StylePreference[] {
    if (!this.data) return [];
    return [...this.data.preferences].sort((a, b) => b.count - a.count);
  }

  /**
   * 获取使用频率百分比
   */
  static getStylePercentage(style: string): number {
    if (!this.data || this.data.totalUsage === 0) return 0;
    const pref = this.data.preferences.find(p => p.style === style);
    if (!pref) return 0;
    return (pref.count / this.data.totalUsage) * 100;
  }

  /**
   * 计算风格是否足够个性化（有足够数据）
   */
  static hasEnoughData(): boolean {
    if (!this.data) return false;
    return this.data.totalUsage >= 10; // 至少使用10次后才认为有足够数据
  }

  /**
   * 重置学习数据
   */
  static reset(): void {
    this.data = {
      preferences: [],
      totalUsage: 0,
      lastUpdated: Date.now(),
    };
    this.saveData();
  }

  /**
   * 获取学习进度（0-100）
   */
  static getLearningProgress(): number {
    if (!this.data) return 0;
    return Math.min(100, (this.data.totalUsage / 10) * 100); // 10次使用达到100%
  }

  /**
   * 为特定风格推荐增强的提示词
   */
  static getEnhancedPrompt(style: string, basePrompt: string): string {
    const percentage = this.getStylePercentage(style);
    const hasEnough = this.hasEnoughData();

    if (!hasEnough || percentage < 20) {
      return basePrompt; // 数据不够时不调整
    }

    // 根据使用频率调整提示词，让输出更符合用户偏好
    const enhancement = `\n\n用户偏好分析：这种风格用户选择了约${Math.round(percentage)}%，请尽量贴合用户的交流习惯。`;
    return basePrompt + enhancement;
  }
}
