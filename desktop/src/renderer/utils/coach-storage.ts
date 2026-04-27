import Dexie, { Table } from 'dexie'

export interface CoachMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  analysis?: {
    winRate: number
    advantages: string
    disadvantages: string
    surfaceIntent: string
    realIntent: string
    emotion: string
    needs: string
    risks: string
    shouldDo: string[]
    shouldNotDo: string[]
    recommendedTone: string
    replies: Array<{ style: string; content: string }>
  }
  timestamp: number
}

export interface CoachGoal {
  id?: number
  name: string
  goal: string
  status: 'active' | 'completed' | 'archived'
  messages: CoachMessage[]
  createdAt: number
  updatedAt: number
}

class CoachDatabase extends Dexie {
  goals!: Table<CoachGoal>

  constructor() {
    super('coach-db')
    this.version(1).stores({
      goals: '++id, name, status, createdAt'
    })
  }
}

export const coachDB = new CoachDatabase()

export class CoachStorage {
  static async createGoal(name: string, goal: string): Promise<number> {
    const goalObj: CoachGoal = {
      name,
      goal,
      status: 'active',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    return await coachDB.goals.add(goalObj)
  }

  static async getGoals(): Promise<CoachGoal[]> {
    const goals = await coachDB.goals.orderBy('createdAt').reverse().toArray()
    return goals.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
  }

  static async getGoal(id: number): Promise<CoachGoal | undefined> {
    return await coachDB.goals.get(id)
  }

  static async updateGoal(id: number, updates: Partial<CoachGoal>): Promise<number> {
    return await coachDB.goals.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
  }

  static async addMessage(goalId: number, message: CoachMessage): Promise<number> {
    const goal = await coachDB.goals.get(goalId)
    if (!goal) throw new Error('Goal not found')
    
    goal.messages.push(message)
    goal.updatedAt = Date.now()
    
    await coachDB.goals.put(goal)
    return message.id || 0
  }

  static async deleteGoal(id: number): Promise<void> {
    await coachDB.goals.delete(id)
  }

  static async archiveGoal(id: number): Promise<void> {
    await coachDB.goals.update(id, {
      status: 'archived',
      updatedAt: Date.now()
    })
  }

  static async getActiveGoals(): Promise<CoachGoal[]> {
    return await coachDB.goals
      .where('status')
      .equals('active')
      .reverse()
      .sortBy('updatedAt')
  }
}
