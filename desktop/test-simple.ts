import * as ort from 'onnxruntime-node'
import * as fs from 'fs'

async function main() {
  try {
    console.log('=== OCR Model Info ===')
    
    const session = await ort.InferenceSession.create(
      './models/ch_PP-OCRv4_rec_infer.onnx',
      { executionProviders: ['cpu'] }
    )
    
    console.log(`\nInput names: ${JSON.stringify(session.inputNames)}`)
    console.log(`Output names: ${JSON.stringify(session.outputNames)}`)
    
    const inputMeta = session.inputMetadata
    console.log('\nInput metadata:')
    console.log(JSON.stringify(inputMeta, null, 2))
    
    const outputMeta = session.outputMetadata
    console.log('\nOutput metadata:')
    console.log(JSON.stringify(outputMeta, null, 2))
    
    await session.end()
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
