import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

console.log('[Vite] 配置加载中...')

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(options) {
          console.log('[Electron] 🚀 主进程启动...')
          options.startup()
        },
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist/main',
            rollupOptions: {
              external: ['node-machine-id']
            }
          }
        }
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          console.log('[Electron] 🔄 预加载脚本更新...')
          options.reload()
        },
        vite: {
          build: {
            sourcemap: 'inline',
            outDir: 'dist/preload'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  base: './',
  server: {
    port: 33445,
    open: false,
    host: 'localhost'
  },
  clearScreen: false
})
