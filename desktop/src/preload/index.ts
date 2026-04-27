import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleDock: () => ipcRenderer.invoke('window:toggleDock'),
    setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop)
  },

  clipboard: {
    getText: () => ipcRenderer.invoke('clipboard:getText'),
    setText: (text: string) => ipcRenderer.invoke('clipboard:setText', text),
    paste: () => ipcRenderer.invoke('clipboard:paste'),
    startListen: () => ipcRenderer.invoke('clipboard:startListen'),
    stopListen: () => ipcRenderer.invoke('clipboard:stopListen'),
    onChanged: (callback: (text: string) => void) => {
      ipcRenderer.on('clipboard:changed', (_, text) => callback(text))
    }
  },

  license: {
    verify: (key: string) => ipcRenderer.invoke('license:verify', key),
    getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
    isActivated: () => ipcRenderer.invoke('license:isActivated')
  },

  ai: {
    generateReply: (context: string, style: string) => ipcRenderer.invoke('ai:generateReply', context, style),
    polishText: (text: string, style: string) => ipcRenderer.invoke('ai:polishText', text, style),
    analyzeIntent: (chatHistory: any[]) => ipcRenderer.invoke('ai:analyzeIntent', chatHistory),
    generateStrategy: (context: string) => ipcRenderer.invoke('ai:generateStrategy', context),
    setConfig: (config: any) => ipcRenderer.invoke('ai:setConfig', config),
    initConfig: (config: any) => ipcRenderer.invoke('ai:initConfig', config),
    testConnection: () => ipcRenderer.invoke('ai:testConnection')
  },

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
        setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
      }
      clipboard: {
        getText: () => Promise<string>
        setText: (text: string) => Promise<boolean>
        paste: () => Promise<boolean>
        startListen: () => Promise<boolean>
        stopListen: () => Promise<boolean>
        onChanged: (callback: (text: string) => void) => void
      }
      license: {
        verify: (key: string) => Promise<any>
        getMachineId: () => Promise<string>
        isActivated: () => Promise<boolean>
      }
      ai: {
        generateReply: (context: string, style: string) => Promise<{ style: string; reply: string }[]>
        polishText: (text: string, style: string) => Promise<string[]>
        analyzeIntent: (chatHistory: any[]) => Promise<any>
        testConnection: () => Promise<{ success: boolean; model?: string; error?: string }>
        generateStrategy: (context: string) => Promise<any>
        setConfig: (config: any) => Promise<boolean>
        initConfig: (config: any) => Promise<boolean>
      }
      on: (channel: string, callback: (...args: any[]) => void) => void
    }
  }
}

export {}
