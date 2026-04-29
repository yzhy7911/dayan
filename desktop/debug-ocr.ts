import * as ort from 'onnxruntime-node'
import * as sharp from 'sharp'
import * as fs from 'fs'

async function main() {
  try {
    console.log('=== OCR Debug ===')
    
    const session = await ort.InferenceSession.create(
      './models/ch_PP-OCRv4_rec_infer.onnx',
      { executionProviders: ['cpu'] }
    )
    
    console.log(`Input names: ${session.inputNames}`)
    console.log(`Output names: ${session.outputNames}`)
    
    const testImage = fs.readFileSync('./test-image.png')
    
    const rgbBuffer = await sharp(testImage)
      .resize(320, 32, { fit: 'fill' })
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
    
    const tensor = new ort.Tensor('float32', data, [1, 3, 32, 320])
    
    const feeds: Record<string, ort.Tensor> = {
      'x': tensor
    }
    
    const results = await session.run(feeds)
    const outputName = session.outputNames[0]
    const output = results[outputName]
    
    console.log(`\nOutput name: ${outputName}`)
    console.log(`Output shape: ${output.dims}`)
    
    const outputData = output.data as Float32Array
    console.log(`Output data length: ${outputData.length}`)
    console.log(`\nFirst 50 values:`)
    for (let i = 0; i < Math.min(50, outputData.length); i++) {
      process.stdout.write(`${outputData[i].toFixed(4)} `)
      if ((i + 1) % 10 === 0) console.log()
    }
    
    const seqLen = output.dims[1]
    const numClasses = output.dims[2]
    console.log(`\n\nSequence length: ${seqLen}, Number of classes: ${numClasses}`)
    
    console.log('\nMax indices per time step:')
    for (let i = 0; i < seqLen; i++) {
      let maxIdx = 0
      let maxVal = -Infinity
      for (let j = 0; j < numClasses; j++) {
        const idx = i * numClasses + j
        if (idx < outputData.length && outputData[idx] > maxVal) {
          maxVal = outputData[idx]
          maxIdx = j
        }
      }
      process.stdout.write(`${maxIdx} `)
      if ((i + 1) % 10 === 0) console.log()
    }
    
    await session.end()
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
```
