import * as ort from 'onnxruntime-node'
import * as sharp from 'sharp'
import * as fs from 'fs'

const charSet = buildCharset()

function buildCharset(): string[] {
  const charset: string[] = [' ']
  charset.push(...'0123456789')
  charset.push(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  charset.push(...'abcdefghijklmnopqrstuvwxyz')
  charset.push(...',.!?;:[]{}()<>/\\@#$%^&*+-=~`')
  charset.push(...'，。！？；：、「」『』【】（）《》·—…～')
  
  const commonChinese = [
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '你', '我', '他', '她', '它', '这', '那', '哪', '谁', '什么',
    '的', '了', '和', '是', '在', '有', '不', '人', '都', '上',
    '大', '地', '中', '说', '要', '去', '会', '着', '看', '好',
    '自己', '们', '把', '个', '来', '到', '知道', '后', '作', '时',
    '就', '出', '可', '以', '国', '心', '天', '下', '山', '水',
    '火', '土', '风', '雨', '雷', '电', '日', '月', '星', '云',
    '海', '江', '河', '湖', '田', '口', '手', '足', '耳', '目',
    '头', '面', '身', '骨', '肉', '血', '皮', '发', '毛', '父',
    '母', '兄', '弟', '姐', '妹', '儿', '女', '夫', '妻', '朋',
    '友', '师', '生', '学', '校', '书', '本', '笔', '纸', '电',
    '话', '信', '邮', '钱', '财', '物', '食', '衣', '住', '行',
    '工', '作', '习', '活', '爱', '情', '家', '事', '世', '界',
    '间', '空', '方', '向', '东', '南', '西', '北', '左', '右',
    '前', '高', '低', '长', '短', '小', '多', '少', '快', '慢',
    '坏', '真', '假', '美', '丑', '善', '恶', '非', '对', '错',
    '正', '反', '开', '关', '进', '无', '生', '死', '存', '亡',
    '动', '静', '黑', '白', '红', '黄', '蓝', '绿', '青', '紫',
    '金', '银', '铜', '铁', '木', '石', '玉', '珠', '宝', '明',
    '暗', '冷', '热', '温', '凉', '酸', '甜', '苦', '辣', '咸',
    '香', '臭', '声', '音', '色', '味', '光', '影', '气', '力',
    '能', '功', '过', '罪', '罚', '奖', '惩', '名', '利', '权',
    '位', '职', '责', '义', '勇', '智', '信', '礼', '廉', '耻',
    '忠', '孝', '仁', '平', '战', '争', '安', '危', '福', '祸',
    '吉', '凶', '病', '医', '药', '酒', '烟', '茶', '饭', '菜',
    '汤', '米', '面', '蛋', '奶', '油', '盐', '糖', '果', '蔬',
    '花', '草', '树', '鸟', '兽', '虫', '车', '船', '飞', '机',
    '房', '屋', '楼', '桥', '路', '街', '城', '市', '乡', '村',
    '川', '流', '岛', '礁', '沙', '泥', '园', '林', '场', '店',
    '铺', '馆', '所', '社', '组', '织', '机', '构', '企', '公',
    '司', '商', '贸', '易', '融', '保', '险', '税', '收', '政',
    '法', '律', '警', '察', '军', '队', '府', '党', '团', '教',
    '育', '技', '文', '化', '艺', '体', '育', '新', '闻', '媒',
    '广', '告', '息', '络', '计', '算', '软', '硬', '统', '程',
    '序', '码', '据', '库', '站', '服', '器', '客', '端', '发',
    '设', '测', '护', '运', '管', '领', '导', '员', '职', '经',
    '理', '总', '裁', '董', '事', '长', '任', '科', '局', '记',
    '席', '统', '相', '王', '后', '皇', '帝', '主', '将', '士',
    '医', '护', '教', '司', '机', '厨', '服', '工', '农', '商',
    '企', '艺', '演', '歌', '作', '画', '诗', '哲', '科', '发',
    '政', '军', '商', '管', '经', '历', '文', '语', '数', '物',
    '化', '地', '天', '气', '药', '工', '技', '建', '音', '舞',
    '戏', '剧', '影', '摄', '编', '记', '翻', '译', '秘', '助',
    '顾', '专', '研', '究', '授', '副', '讲', '导', '博', '硕',
    '奖', '状', '誉', '称', '号', '勋', '章', '杯', '牌', '冠',
    '亚', '季', '胜', '败', '成', '功', '机', '会', '挑', '战',
    '困', '难', '遇', '幸', '运', '缘', '今', '明', '昨', '前',
    '周', '本', '月', '年', '去', '期', '星', '节', '假', '息',
    '班', '放', '讨', '论', '分', '析', '结', '报', '计', '划',
    '案', '项', '务', '量', '进', '度', '质', '效', '率', '本',
    '收', '益', '润', '价', '格', '费', '用', '算', '审', '务',
    '表', '件', '资', '图', '像', '频', '字', '言', '翻', '译',
    '流', '沟', '通', '谈', '判', '协', '议', '同', '款', '条',
    '求', '供', '应', '衡', '场', '竞', '争', '合', '作', '创',
    '新', '改', '革', '放', '设', '发', '步', '长', '提', '高',
    '善', '完', '优', '升', '级', '更', '替', '代', '淘', '汰',
    '保', '留', '删', '除', '添', '加', '修', '编', '辑', '置',
    '配', '控', '监', '督', '查', '核', '验', '证', '认', '登',
    '记', '注', '册', '开', '绑', '定', '解', '取', '消', '撤',
    '止', '延', '续', '签', '奖', '励', '惩', '罚', '表', '扬',
    '批', '评', '导', '帮', '助', '持', '配', '协', '援', '捐',
    '赠', '资', '赞', '投', '融', '贷', '还', '借', '欠', '收',
    '付', '转', '汇', '现', '支', '票', '信', '用', '银', '账',
    '存', '率', '股', '票', '基', '金', '债', '券', '理', '财',
    '险', '回', '报', '亏', '损', '盈', '破', '产', '倒', '闭',
    '兼', '并', '购', '重', '组', '市', '定', '增', '配', '红',
    '配', '权', '东', '事', '监', 'CEO', 'CTO', 'CFO', 'VP', 'GM'
  ]
  
  charset.push(...commonChinese)
  return charset
}

async function bufferToTensor(buffer: Buffer): Promise<ort.Tensor> {
  const rgbBuffer = await sharp(buffer)
    .resize({ width: 320, height: 32, fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()
  
  const expectedSize = 3 * 32 * 320
  const data = new Float32Array(expectedSize)
  const mean = 127.5
  const std = 127.5
  
  for (let i = 0; i < expectedSize; i += 3) {
    const pixelIdx = i % rgbBuffer.length
    const r = rgbBuffer[pixelIdx] || 0
    const g = rgbBuffer[pixelIdx + 1] || 0
    const b = rgbBuffer[pixelIdx + 2] || 0
    
    data[i] = (b - mean) / std
    data[i + 1] = (g - mean) / std
    data[i + 2] = (r - mean) / std
  }
  
  return new ort.Tensor('float32', data, [1, 3, 32, 320])
}

function decodeCTC(data: Float32Array, seqLen: number, numClasses: number): string {
  let text = ''
  let prevIdx = 0
  
  for (let i = 0; i < seqLen; i++) {
    let maxIdx = 0
    let maxVal = -Infinity
    
    for (let j = 0; j < numClasses; j++) {
      const idx = i * numClasses + j
      if (idx < data.length && data[idx] > maxVal) {
        maxVal = data[idx]
        maxIdx = j
      }
    }
    
    if (maxIdx > 0 && maxIdx !== prevIdx && maxIdx < charSet.length) {
      text += charSet[maxIdx]
    }
    prevIdx = maxIdx
  }
  
  return text
}

async function testOCR(imagePath: string) {
  try {
    console.log(`Loading image: ${imagePath}`)
    const buffer = fs.readFileSync(imagePath)
    
    console.log('Loading recognition model...')
    const session = await ort.InferenceSession.create(
      './models/ch_PP-OCRv4_rec_infer.onnx',
      { executionProviders: ['cpu'] }
    )
    
    console.log('Preprocessing image...')
    const tensor = await bufferToTensor(buffer)
    console.log(`Input tensor shape: ${tensor.dims}`)
    
    console.log('Running inference...')
    const feeds: Record<string, ort.Tensor> = {}
    feeds[session.inputNames[0]] = tensor
    
    const results = await session.run(feeds)
    const outputName = session.outputNames[0]
    const output = results[outputName]
    
    console.log(`Output name: ${outputName}`)
    console.log(`Output shape: ${output.dims}`)
    
    const outputData = output.data as Float32Array
    console.log(`Output data length: ${outputData.length}`)
    console.log(`First 20 values: ${outputData.slice(0, 20)}`)
    
    const seqLen = output.dims[1]
    const numClasses = output.dims[2]
    console.log(`Sequence length: ${seqLen}, Number of classes: ${numClasses}`)
    
    const text = decodeCTC(outputData, seqLen, numClasses)
    console.log(`\nRecognized text: "${text}"`)
    
    await session.end()
  } catch (error) {
    console.error('OCR error:', error)
  }
}

if (process.argv.length < 3) {
  console.log('Usage: ts-node test-ocr.ts <image-path>')
  process.exit(1)
}

testOCR(process.argv[2])
