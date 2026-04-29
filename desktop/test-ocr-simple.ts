import * as fs from 'fs'
import * as path from 'path'

async function testOCR() {
  const { OCR } = await import('./dist/main/index.js')
  
  const ocr = new OCR()
  await ocr.init()
  
  if (!ocr.isAvailable()) {
    console.log('OCR not available')
    return
  }
  
  const testImagePath = path.join(__dirname, 'test-image.png')
  
  if (!fs.existsSync(testImagePath)) {
    console.log('Test image not found')
    return
  }
  
  const imageBuffer = fs.readFileSync(testImagePath)
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`
  
  try {
    const result = await ocr.recognize(base64Image)
    console.log('OCR Result:', result)
  } catch (error) {
    console.error('OCR Error:', error)
  }
}

testOCR()
