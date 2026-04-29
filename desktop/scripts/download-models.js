const fs = require('fs');
const https = require('https');
const path = require('path');

// 模型下载链接
const models = [
  {
    name: 'ch_PP-OCRv4_rec.onnx',
    url: 'https://paddleocr.bj.bcebos.com/PP-OCRv4/chinese/ch_PP-OCRv4_rec_infer.onnx'
  },
  {
    name: 'ch_PP-OCRv4_det.onnx', 
    url: 'https://paddleocr.bj.bcebos.com/PP-OCRv4/chinese/ch_PP-OCRv4_det_infer.onnx'
  },
  {
    name: 'ch_ppocr_mobile_v2.0_cls.onnx',
    url: 'https://paddleocr.bj.bcebos.com/dygraph_v2.0/ch/ch_ppocr_mobile_v2.0_cls_infer.onnx'
  }
];

// 输出目录
const outputDir = path.join(__dirname, '..', 'models');

// 确保目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`创建目录: ${outputDir}`);
}

// 下载文件函数
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`开始下载: ${url}`);
    
    const file = fs.createWriteStream(outputPath);
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.pipe(file);

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r下载进度: ${progress}%`);
      });

      file.on('finish', () => {
        file.close();
        console.log('\n下载完成');
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// 主函数
async function main() {
  console.log('=== 开始下载 PaddleOCR 模型 ===\n');
  
  for (const model of models) {
    const outputPath = path.join(outputDir, model.name);
    
    if (fs.existsSync(outputPath)) {
      console.log(`模型 ${model.name} 已存在，跳过下载`);
      continue;
    }

    try {
      await downloadFile(model.url, outputPath);
      console.log(`模型 ${model.name} 下载成功\n`);
    } catch (err) {
      console.error(`模型 ${model.name} 下载失败: ${err.message}\n`);
    }
  }

  console.log('=== 下载完成 ===');
}

main().catch(console.error);