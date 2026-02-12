# 🎨 AI绘图任务管理平台

集成真实API调用的完整AI绘图任务管理系统，支持豆包、即梦等多种AI模型。

## 🌟 功能特性

### 前端功能
- ✨ **双模式生图**: 文字生图、参考图生图
- 🎯 **任务管理**: 任务列表、状态追踪、详情查看
- 📊 **数据统计**: API使用统计、任务统计
- 🔐 **账号管理**: 多账号配置、默认账号设置
- 🖼️ **图片处理**: 拖拽上传、粘贴上传、大图预览
- 💾 **数据持久化**: 本地存储、状态保存

### 后端功能
- 🔌 **API集成**: 真实的火山引擎、即梦API调用
- 🛡️ **安全防护**: CORS跨域处理、密钥保护
- ⚡ **异步处理**: 任务队列、后台处理
- 📤 **文件上传**: 图片上传、Base64转换
- 📈 **统计监控**: API调用统计、成功率监控

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn

### 安装步骤

1. **安装依赖**
```bash
npm install
```

2. **启动服务**
```bash
# 开发模式（需要安装 nodemon）
npm run dev

# 生产模式
npm start
```

3. **访问应用**
- 打开浏览器访问: `http://localhost:3000`
- 服务启动后会自动打开前端页面

### 配置说明

#### API账号配置

1. 点击右上角 "⚙️ API设置"
2. 选择 "添加账号" 标签
3. 填写配置信息：
   - **账号名称**: 例如 "主账号"、"测试账号"
   - **服务提供商**: 选择 "火山引擎" 或 "即梦"
   - **API密钥**: 您的API密钥
   - **API Endpoint**: API接口地址（可选）
   - **模型ID**: 模型标识（可选）
   - **设为默认**: 勾选后设为默认账号

4. 保存账号配置

#### 获取API密钥

**火山引擎（豆包）**
- 访问: https://console.volcengine.com/ark
- 创建应用获取API密钥
- 配置对应的模型ID

**即梦API**
- 访问: https://api.jimeng.jianying.com
- 注册账号获取API密钥
- 查看API文档配置Endpoint

## 📋 API文档

### 账号管理

#### 获取所有账号
```http
GET /api/accounts
```

#### 添加账号
```http
POST /api/accounts
Content-Type: application/json

{
  "name": "主账号",
  "provider": "volcengine",
  "apiKey": "your-api-key",
  "endpoint": "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  "modelId": "ep-20241223111111-xxxxx",
  "isDefault": true
}
```

#### 更新账号
```http
PUT /api/accounts/:id
Content-Type: application/json

{
  "name": "更新的名称",
  "apiKey": "new-api-key"
}
```

#### 删除账号
```http
DELETE /api/accounts/:id
```

#### 设为默认账号
```http
PUT /api/accounts/:id/default
```

### 任务管理

#### 获取所有任务
```http
GET /api/tasks?status=completed&model=豆包
```

#### 获取任务详情
```http
GET /api/tasks/:id
```

#### 创建任务
```http
POST /api/tasks
Content-Type: application/json

{
  "type": "textToImage",
  "model": "doubao",
  "prompt": "一只可爱的猫咪",
  "count": 4,
  "referenceImage": "data:image/jpeg;base64,..."
}
```

#### 重新提交任务
```http
POST /api/tasks/:id/resubmit
Content-Type: application/json

{
  "prompt": "修改后的提示词"
}
```

#### 删除任务
```http
DELETE /api/tasks/:id
```

### 文件上传

#### 上传图片
```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary image data>
```

### 统计信息

#### 获取统计数据
```http
GET /api/stats
```

#### 健康检查
```http
GET /api/health
```

## 🎯 使用示例

### 文字生图

1. 点击 "文字生图" 按钮
2. 选择AI模型（豆包/即梦）
3. 上传参考图片（可选）
4. 输入详细的画面描述
5. 选择生成数量
6. 点击 "开始生成"

### 参考图生图

1. 点击 "参考图生图" 按钮
2. 上传基础图片
3. 上传参考风格图
4. 补充描述（可选）
5. 选择生成数量
6. 点击 "开始生成"

### 查看任务详情

1. 在任务列表中点击任意任务
2. 查看任务完整信息
3. 预览输入图片和生成结果
4. 可重新编辑并提交

## 🔧 技术架构

### 前端技术栈
- HTML5 + CSS3 + JavaScript (Vanilla)
- LocalStorage 数据持久化
- Fetch API 网络请求
- FileReader 文件处理

### 后端技术栈
- Node.js + Express.js
- axios HTTP客户端
- multer 文件上传
- uuid 唯一标识生成
- cors 跨域处理

## 📁 项目结构

```
ai-drawing-platform/
├── server.js           # 后端服务主文件
├── package.json        # 项目配置和依赖
├── index.html         # 前端主页面
├── data.json          # 数据存储文件（自动生成）
├── uploads/           # 临时文件上传目录（自动生成）
├── public/            # 静态资源目录（自动生成）
└── README.md          # 项目文档
```

## 🔐 安全注意事项

1. **API密钥安全**: 
   - API密钥仅存储在服务器端，不会暴露给浏览器
   - 前端只能获取密钥的部分信息

2. **CORS配置**:
   - 生产环境建议配置具体的允许域名
   - 避免使用通配符 `*`

3. **文件上传限制**:
   - 限制文件大小（默认10MB）
   - 验证文件类型
   - 清理临时文件

## 🐛 故障排除

### 常见问题

**Q: API调用失败怎么办？**
- 检查API密钥是否正确
- 确认API Endpoint地址是否正确
- 查看服务器日志了解详细错误信息

**Q: 图片上传失败？**
- 检查图片文件大小是否超过限制
- 确认图片格式是否支持（JPG、PNG等）
- 查看网络连接状态

**Q: 任务一直处于处理状态？**
- 检查服务器是否正常运行
- 查看后端日志是否有错误
- 确认API服务商服务状态

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请联系技术支持或查看项目文档。