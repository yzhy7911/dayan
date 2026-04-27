# 📚 Skills 说明

## Skill 格式

每个 Skill 是一个 `.ts` 文件，导出以下格式：

```typescript
import { registerSkill } from './skill-loader'

const skill = {
  name: '技能名称',
  description: '技能描述',
  icon: '🎯',
  prompts: {
    system: '你是一个xxx专家...',
    user: '可选的用户提示模板'
  }
}

registerSkill(skill)
```

## 示例文件

请将你的 skill 文件（如 `泡妞大师.skill.ts`）放在此文件夹中。

文件命名规范：
- 使用英文或拼音
- 以 `.skill.ts` 结尾
- 例如：`pickup-master.skill.ts`、`negotiation.skill.ts`

## 自动加载

在 `main.ts` 或入口文件中导入所有 skill 文件即可自动加载。

## 示例 Skill

```typescript
// pickup-master.skill.ts
import { registerSkill } from './skill-loader'

const skill = {
  name: '泡妞大师',
  description: '教你如何优雅地追求女生',
  icon: '💕',
  prompts: {
    system: `你是一位情感专家，擅长分析女生的心理和情感需求。
    
【核心原则】
1. 真诚大于技巧
2. 尊重对方感受
3. 保持自信但不傲慢
4. 倾听比说话更重要

【分析维度】
- 表层意思 vs 真实意图
- 情绪状态（开心/矜持/冷淡/测试）
- 潜在需求（安全感/被关注/确认心意）
- 关系阶段（陌生/熟悉/暧昧/追求）

【回复建议】
- 语气要自然，像朋友聊天
- 不要太过正式或油腻
- 适当展示价值和幽默
- 不要跪舔，保持平等`
  }
}

registerSkill(skill)
```
