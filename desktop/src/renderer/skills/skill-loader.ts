export interface Skill {
  name: string
  description: string
  icon: string
  prompts: {
    system: string
    user?: string
  }
}

export const skills: Skill[] = []

export function registerSkill(skill: Skill) {
  skills.push(skill)
  console.log(`[Skills] 已加载: ${skill.name}`)
}

export function getSkill(name: string): Skill | undefined {
  return skills.find(s => s.name === name)
}

export function getAllSkills(): Skill[] {
  return skills
}

export function getSkillNames(): string[] {
  return skills.map(s => s.name)
}

export function applySkillToContext(skillName: string, context: string): string {
  const skill = getSkill(skillName)
  if (!skill) return context
  
  return `${skill.prompts.system}\n\n【当前对话】\n${context}`
}
