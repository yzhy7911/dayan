import { createHash } from 'crypto'
import { machineIdSync } from 'node-machine-id'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import CryptoJS from 'crypto-js'

/**
 * 📝 TODO: 未来计划 - 采用在线授权系统
 *
 * 当前实现：离线激活码验证
 * 未来计划：
 * 1. 服务端验证 - 激活码需要连接服务器验证
 * 2. 实时有效期检查 - 定期与服务器同步授权状态
 * 3. 在线解绑/换绑 - 支持用户自助管理设备
 * 4. 激活码绑定账号 - 用户注册登录后管理授权
 * 5. 订阅模式支持 - 月付/年付订阅管理
 * 6. Web管理后台 - 激活码生成、用户管理、数据统计
 *
 * @see 搭言-技术架构方案.md - 授权系统章节
 */

interface LicenseInfo {
  isValid: boolean
  type: 'free' | 'pro' | 'svip'
  expireDate: string | null
  machineId: string
}

class LicenseManager {
  private readonly LICENSE_FILE = 'license.dat'
  private readonly AES_KEY = 'dayan_license_2026'
  private machineId: string = ''

  constructor() {
    this.init()
  }

  private init() {
    try {
      this.machineId = machineIdSync(true)
    } catch (e) {
      this.machineId = this.generateFallbackMachineId()
    }
  }

  private generateFallbackMachineId(): string {
    const platform = process.platform
    const arch = process.arch
    const cpus = require('os').cpus().length
    const totalMem = require('os').totalmem()
    const hostname = require('os').hostname()

    const raw = `${platform}-${arch}-${cpus}-${totalMem}-${hostname}`
    return createHash('md5').update(raw).digest('hex')
  }

  getMachineId(): string {
    return this.machineId
  }

  private getLicensePath(): string {
    const userData = app.getPath('userData')
    if (!existsSync(userData)) {
      mkdirSync(userData, { recursive: true })
    }
    return join(userData, this.LICENSE_FILE)
  }

  verifyLicense(key: string): LicenseInfo {
    try {
      const decodedKey = Buffer.from(key, 'base64').toString()
      const [machineHash, type, expireTimestamp] = decodedKey.split('|')

      const expectedHash = createHash('md5')
        .update(this.machineId)
        .digest('hex')

      if (machineHash !== expectedHash) {
        return {
          isValid: false,
          type: 'free',
          expireDate: null,
          machineId: this.machineId
        }
      }

      const expireDate = new Date(parseInt(expireTimestamp))
      if (expireDate < new Date()) {
        return {
          isValid: false,
          type: 'free',
          expireDate: null,
          machineId: this.machineId
        }
      }

      const licenseInfo: LicenseInfo = {
        isValid: true,
        type: type as 'pro' | 'svip',
        expireDate: expireDate.toISOString(),
        machineId: this.machineId
      }

      this.saveLicense(licenseInfo)

      return licenseInfo
    } catch (e) {
      console.error('Verify license failed:', e)
      return {
        isValid: false,
        type: 'free',
        expireDate: null,
        machineId: this.machineId
      }
    }
  }

  private saveLicense(license: LicenseInfo) {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(license),
      this.AES_KEY
    ).toString()

    writeFileSync(this.getLicensePath(), encrypted)
  }

  loadLicense(): LicenseInfo {
    try {
      const licensePath = this.getLicensePath()
      if (!existsSync(licensePath)) {
        return {
          isValid: false,
          type: 'free',
          expireDate: null,
          machineId: this.machineId
        }
      }

      const encrypted = readFileSync(licensePath, 'utf8')
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.AES_KEY).toString(CryptoJS.enc.Utf8)
      const license = JSON.parse(decrypted)

      if (license.machineId !== this.machineId) {
        return {
          isValid: false,
          type: 'free',
          expireDate: null,
          machineId: this.machineId
        }
      }

      if (license.expireDate && new Date(license.expireDate) < new Date()) {
        return {
          isValid: false,
          type: 'free',
          expireDate: null,
          machineId: this.machineId
        }
      }

      return license
    } catch (e) {
      console.error('Load license failed:', e)
      return {
        isValid: false,
        type: 'free',
        expireDate: null,
        machineId: this.machineId
      }
    }
  }

  isActivated(): boolean {
    const license = this.loadLicense()
    return license.isValid
  }

  getLicenseType(): 'free' | 'pro' | 'svip' {
    const license = this.loadLicense()
    return license.type
  }

  hasPermission(feature: string): boolean {
    const license = this.loadLicense()
    if (!license.isValid) {
      return feature === 'basic_reply'
    }

    const permissions: Record<string, string[]> = {
      pro: ['basic_reply', 'style_switch', 'multi_modal', 'knowledge_base'],
      svip: ['basic_reply', 'style_switch', 'multi_modal', 'knowledge_base',
             'coach_mode', 'strategy_analysis', 'contact_profiler', 'style_learning']
    }

    return permissions[license.type]?.includes(feature) ?? false
  }
}

export const licenseManager = new LicenseManager()
