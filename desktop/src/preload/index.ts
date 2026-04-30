import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleDock: () => ipcRenderer.invoke('window:toggleDock'),
    checkWeChat: () => ipcRenderer.invoke('window:checkWeChat'),
    getDockStatus: () => ipcRenderer.invoke('window:getDockStatus'),
    setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop)
  },

  clipboard: {
    getText: () => ipcRenderer.invoke('clipboard:getText'),
    setText: (text: string) => ipcRenderer.invoke('clipboard:setText', text),
    paste: () => ipcRenderer.invoke('clipboard:paste'),
    startListen: () => ipcRenderer.invoke('clipboard:startListen'),
    stopListen: () => ipcRenderer.invoke('clipboard:stopListen'),
    hasImage: () => ipcRenderer.invoke('clipboard:hasImage'),
    getImage: () => ipcRenderer.invoke('clipboard:getImage'),
    onChanged: (callback: (text: string) => void) => {
      ipcRenderer.on('clipboard:changed', (_, text) => callback(text))
    }
  },

  ocr: {
    hasImage: () => ipcRenderer.invoke('ocr:hasImage'),
    getImage: () => ipcRenderer.invoke('ocr:getImage'),
    recognize: (imageData?: string) => ipcRenderer.invoke('ocr:recognize', imageData)
  },

  license: {
    verify: (key: string) => ipcRenderer.invoke('license:verify', key),
    getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
    isActivated: () => ipcRenderer.invoke('license:isActivated')
  },

  ai: {
    generateReply: (context: string, style: string, mode?: 'fast' | 'balanced' | 'deep', imageData?: string) =>
      ipcRenderer.invoke('ai:generateReply', context, style, mode, imageData),
    polishText: (text: string, style: string) => ipcRenderer.invoke('ai:polishText', text, style),
    generatePhrasebookDrafts: (documents: any[]) => ipcRenderer.invoke('ai:generatePhrasebookDrafts', documents),
    refineKnowledgeDocument: (document: any) => ipcRenderer.invoke('ai:refineKnowledgeDocument', document),
    analyzeIntent: (chatHistory: any[], goal?: string, mode?: 'fast' | 'balanced' | 'deep') =>
      ipcRenderer.invoke('ai:analyzeIntent', chatHistory, goal, mode),
    analyzeOverall: (chatHistory: any[], goal?: string) => ipcRenderer.invoke('ai:analyzeOverall', chatHistory, goal),
    setConfig: (config: any) => ipcRenderer.invoke('ai:setConfig', config),
    initConfig: (config: any) => ipcRenderer.invoke('ai:initConfig', config),
    testConnection: () => ipcRenderer.invoke('ai:testConnection')
  },

  asr: {
    status: () => ipcRenderer.invoke('asr:status'),
    start: (sampleRate?: number) => ipcRenderer.invoke('asr:start', sampleRate),
    pushAudio: (sessionId: string, audioData: ArrayBuffer) => ipcRenderer.invoke('asr:pushAudio', sessionId, audioData),
    stop: (sessionId: string) => ipcRenderer.invoke('asr:stop', sessionId)
  },

  shortcuts: {
    getConfig: () => ipcRenderer.invoke('shortcuts:getConfig'),
    setConfig: (config: any) => ipcRenderer.invoke('shortcuts:setConfig', config),
    register: (accelerator: string, action: string) => ipcRenderer.invoke('shortcuts:register', accelerator, action),
    unregister: (accelerator: string) => ipcRenderer.invoke('shortcuts:unregister', accelerator),
    reset: () => ipcRenderer.invoke('shortcuts:reset')
  },

  // 数据库通用 IPC 代理
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  }
})

declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => Promise<void>
        close: () => Promise<void>
        toggleDock: () => Promise<boolean>
        checkWeChat: () => Promise<boolean>
        getDockStatus: () => Promise<{ enabled: boolean; wechatFound: boolean; platform: string; side: string | null }>
        setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
      }
      clipboard: {
        getText: () => Promise<string>
        setText: (text: string) => Promise<boolean>
        paste: () => Promise<boolean>
        startListen: () => Promise<boolean>
        stopListen: () => Promise<boolean>
        hasImage: () => Promise<boolean>
        getImage: () => Promise<string | null>
        onChanged: (callback: (text: string) => void) => void
      }
      ocr: {
        hasImage: () => Promise<boolean>
        getImage: () => Promise<string | null>
        recognize: (imageData?: string) => Promise<{
          success: boolean
          text: string
          lines?: {
            text: string
            confidence?: number
            box?: { x: number; y: number; width: number; height: number }
          }[]
          width?: number
          height?: number
          error?: string
        }>
      }
      license: {
        verify: (key: string) => Promise<any>
        getMachineId: () => Promise<string>
        isActivated: () => Promise<boolean>
      }
      ai: {
        generateReply: (context: string, style: string, mode?: 'fast' | 'balanced' | 'deep', imageData?: string) => Promise<{ style: string; reply: string }[]>
        polishText: (text: string, style: string) => Promise<string[]>
        generatePhrasebookDrafts: (documents: any[]) => Promise<Array<{ category: string; keyword: string; content: string; sourceTitle?: string }>>
        refineKnowledgeDocument: (document: any) => Promise<{ success: boolean; title?: string; content?: string; type?: string; tags?: string[]; summary?: string; error?: string }>
        analyzeIntent: (chatHistory: any[], goal?: string, mode?: 'fast' | 'balanced' | 'deep') => Promise<any>
        analyzeOverall: (chatHistory: any[], goal?: string) => Promise<any>
        testConnection: () => Promise<{ success: boolean; model?: string; error?: string }>
        setConfig: (config: any) => Promise<boolean>
        initConfig: (config: any) => Promise<boolean>
      }
      asr: {
        status: () => Promise<{
          available: boolean
          modelReady: boolean
          runtimeReady: boolean
          modelPath: string
          modelName: string
          error?: string
        }>
        start: (sampleRate?: number) => Promise<{
          success: boolean
          sessionId?: string
          sampleRate?: number
          error?: string
          available?: boolean
          modelReady?: boolean
          runtimeReady?: boolean
          modelPath?: string
        }>
        pushAudio: (sessionId: string, audioData: ArrayBuffer) => Promise<{
          success: boolean
          isFinal?: boolean
          text?: string
          partial?: string
          error?: string
        }>
        stop: (sessionId: string) => Promise<{
          success: boolean
          text?: string
          error?: string
        }>
      },
      shortcuts: {
        getConfig: () => Promise<any>
        setConfig: (config: any) => Promise<boolean>
        register: (accelerator: string, action: string) => Promise<boolean>
        unregister: (accelerator: string) => Promise<boolean>
        reset: () => Promise<any>
      },
      on: (channel: string, callback: (...args: any[]) => void) => void
    }
  }
}

export {}
