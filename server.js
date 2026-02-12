const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置文件上传
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// 数据存储文件路径
const DATA_FILE = path.join(__dirname, 'data.json');

// 初始化数据存储
async function initStorage() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify({
            apiAccounts: [],
            tasks: []
        }, null, 2));
    }
}

// 读取数据
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取数据失败:', error);
        return { apiAccounts: [], tasks: [] };
    }
}

// 保存数据
async function saveData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('保存数据失败:', error);
        throw error;
    }
}

// 获取默认API账号
function getDefaultAccount(accounts) {
    return accounts.find(acc => acc.isDefault) || accounts[0];
}

// 调用火山引擎API（豆包）
async function callVolcengineAPI(account, prompt, referenceImage, count) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.apiKey}`
    };

    const endpoint = account.endpoint || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const modelId = account.modelId || 'ep-20241223111111-xxxxx';

    const messages = [
        {
            role: 'user',
            content: []
        }
    ];

    // 添加文本提示
    messages[0].content.push({
        type: 'text',
        text: prompt
    });

    // 添加参考图片
    if (referenceImage) {
        messages[0].content.push({
            type: 'image_url',
            image_url: {
                url: referenceImage
            }
        });
    }

    const requestBody = {
        model: modelId,
        messages: messages,
        stream: false
    };

    try {
        const response = await axios.post(endpoint, requestBody, { headers });
        return response.data;
    } catch (error) {
        console.error('火山引擎API调用失败:', error.response?.data || error.message);
        throw new Error(`火山引擎API调用失败: ${error.response?.data?.error?.message || error.message}`);
    }
}

// 调用即梦API
async function callJimengAPI(account, prompt, baseImage, refStyleImage, count) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.apiKey}`
    };

    const endpoint = account.endpoint || 'https://api.jimeng.jianying.com/prompt/generate';

    const requestBody = {
        prompt: prompt,
        count: count || 1
    };

    // 添加图片参数
    if (baseImage) {
        requestBody.base_image = baseImage;
    }
    if (refStyleImage) {
        requestBody.reference_image = refStyleImage;
    }

    try {
        const response = await axios.post(endpoint, requestBody, { headers });
        return response.data;
    } catch (error) {
        console.error('即梦API调用失败:', error.response?.data || error.message);
        throw new Error(`即梦API调用失败: ${error.response?.data?.error?.message || error.message}`);
    }
}

// API路由

// 获取所有API账号
app.get('/api/accounts', async (req, res) => {
    try {
        const data = await readData();
        // 不返回完整的API密钥，只返回部分
        const safeAccounts = data.apiAccounts.map(acc => ({
            ...acc,
            apiKey: acc.apiKey ? acc.apiKey.substring(0, 4) + '****' + acc.apiKey.substring(acc.apiKey.length - 4) : ''
        }));
        res.json({ success: true, accounts: safeAccounts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 添加API账号
app.post('/api/accounts', async (req, res) => {
    try {
        const { name, provider, apiKey, endpoint, modelId, isDefault } = req.body;

        if (!name || !apiKey) {
            return res.status(400).json({ success: false, error: '账号名称和API密钥不能为空' });
        }

        const data = await readData();
        
        // 如果设为默认，取消其他账号的默认状态
        if (isDefault) {
            data.apiAccounts.forEach(acc => acc.isDefault = false);
        }

        const newAccount = {
            id: 'acc_' + uuidv4(),
            name,
            provider,
            apiKey,
            endpoint: endpoint || '',
            modelId: modelId || '',
            isDefault: isDefault || false,
            usageCount: 0,
            successCount: 0,
            failureCount: 0,
            createdAt: new Date().toISOString()
        };

        data.apiAccounts.push(newAccount);
        await saveData(data);

        res.json({ success: true, account: newAccount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新API账号
app.put('/api/accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, provider, apiKey, endpoint, modelId, isDefault } = req.body;

        const data = await readData();
        const accountIndex = data.apiAccounts.findIndex(acc => acc.id === id);

        if (accountIndex === -1) {
            return res.status(404).json({ success: false, error: '账号不存在' });
        }

        // 如果设为默认，取消其他账号的默认状态
        if (isDefault) {
            data.apiAccounts.forEach(acc => acc.isDefault = false);
        }

        data.apiAccounts[accountIndex] = {
            ...data.apiAccounts[accountIndex],
            name: name || data.apiAccounts[accountIndex].name,
            provider: provider || data.apiAccounts[accountIndex].provider,
            apiKey: apiKey || data.apiAccounts[accountIndex].apiKey,
            endpoint: endpoint !== undefined ? endpoint : data.apiAccounts[accountIndex].endpoint,
            modelId: modelId !== undefined ? modelId : data.apiAccounts[accountIndex].modelId,
            isDefault: isDefault !== undefined ? isDefault : data.apiAccounts[accountIndex].isDefault
        };

        await saveData(data);
        res.json({ success: true, account: data.apiAccounts[accountIndex] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除API账号
app.delete('/api/accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readData();
        
        const initialLength = data.apiAccounts.length;
        data.apiAccounts = data.apiAccounts.filter(acc => acc.id !== id);

        if (data.apiAccounts.length === initialLength) {
            return res.status(404).json({ success: false, error: '账号不存在' });
        }

        await saveData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 设为默认账号
app.put('/api/accounts/:id/default', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readData();

        // 取消所有默认状态
        data.apiAccounts.forEach(acc => acc.isDefault = false);

        // 设为默认
        const account = data.apiAccounts.find(acc => acc.id === id);
        if (!account) {
            return res.status(404).json({ success: false, error: '账号不存在' });
        }

        account.isDefault = true;
        await saveData(data);

        res.json({ success: true, account });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取所有任务
app.get('/api/tasks', async (req, res) => {
    try {
        const { status, model } = req.query;
        const data = await readData();
        
        let filteredTasks = data.tasks;
        
        if (status) {
            filteredTasks = filteredTasks.filter(task => task.status === status);
        }
        
        if (model) {
            filteredTasks = filteredTasks.filter(task => task.model === model);
        }

        // 按创建时间倒序排列
        filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, tasks: filteredTasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取单个任务详情
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readData();
        const task = data.tasks.find(t => t.id === id);

        if (!task) {
            return res.status(404).json({ success: false, error: '任务不存在' });
        }

        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建新任务
app.post('/api/tasks', async (req, res) => {
    try {
        const { type, model, prompt, count, referenceImage, baseImage, refStyleImage } = req.body;

        if (!type || !model || !prompt) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        const data = await readData();
        const account = getDefaultAccount(data.apiAccounts);

        if (!account) {
            return res.status(400).json({ success: false, error: '请先配置API账号' });
        }

        // 创建任务
        const newTask = {
            id: 'TASK-' + String(data.tasks.length + 1).padStart(6, '0'),
            type,
            model,
            modelCode: model,
            prompt,
            count: count || 1,
            referenceImage,
            baseImage,
            refStyleImage,
            status: 'pending',
            results: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        data.tasks.push(newTask);
        await saveData(data);

        // 异步处理任务（不等待完成就返回）
        processTask(data, newTask.id, account);

        res.json({ success: true, task: newTask });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 处理任务
async function processTask(data, taskId, account) {
    try {
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const task = data.tasks[taskIndex];
        
        // 更新账号使用统计
        account.usageCount = (account.usageCount || 0) + 1;
        
        let response;
        
        if (account.provider === 'volcengine') {
            response = await callVolcengineAPI(account, task.prompt, task.referenceImage, task.count);
        } else if (account.provider === 'jimeng') {
            response = await callJimengAPI(account, task.prompt, task.baseImage, task.refStyleImage, task.count);
        } else {
            throw new Error('不支持的服务提供商');
        }

        // 更新账号成功统计
        account.successCount = (account.successCount || 0) + 1;

        // 解析返回的图片
        const images = [];
        if (response.images && Array.isArray(response.images)) {
            images.push(...response.images);
        } else if (response.choices && response.choices[0]?.message?.content) {
            const content = response.choices[0].message.content;
            if (typeof content === 'string' && content.startsWith('data:image')) {
                images.push(content);
            }
        }

        // 更新任务状态
        data.tasks[taskIndex].status = 'completed';
        data.tasks[taskIndex].results = images;
        data.tasks[taskIndex].updatedAt = new Date().toISOString();
        data.tasks[taskIndex].errorMessage = '';

        await saveData(data);

    } catch (error) {
        console.error('任务处理失败:', error);
        
        // 更新账号失败统计
        account.failureCount = (account.failureCount || 0) + 1;

        // 更新任务状态为失败
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            data.tasks[taskIndex].status = 'failed';
            data.tasks[taskIndex].errorMessage = error.message;
            data.tasks[taskIndex].updatedAt = new Date().toISOString();
        }

        await saveData(data);
    }
}

// 重新提交任务
app.post('/api/tasks/:id/resubmit', async (req, res) => {
    try {
        const { id } = req.params;
        const { prompt } = req.body;

        const data = await readData();
        const originalTask = data.tasks.find(t => t.id === id);

        if (!originalTask) {
            return res.status(404).json({ success: false, error: '原任务不存在' });
        }

        const account = getDefaultAccount(data.apiAccounts);
        if (!account) {
            return res.status(400).json({ success: false, error: '请先配置API账号' });
        }

        // 创建新任务
        const newTask = {
            ...originalTask,
            id: 'TASK-' + String(data.tasks.length + 1).padStart(6, '0'),
            prompt: prompt || originalTask.prompt,
            status: 'pending',
            results: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        data.tasks.push(newTask);
        await saveData(data);

        // 异步处理任务
        processTask(data, newTask.id, account);

        res.json({ success: true, task: newTask });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readData();

        const initialLength = data.tasks.length;
        data.tasks = data.tasks.filter(task => task.id !== id);

        if (data.tasks.length === initialLength) {
            return res.status(404).json({ success: false, error: '任务不存在' });
        }

        await saveData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取API使用统计
app.get('/api/stats', async (req, res) => {
    try {
        const data = await readData();
        
        const stats = {
            totalCalls: data.apiAccounts.reduce((sum, acc) => sum + (acc.usageCount || 0), 0),
            successCalls: data.apiAccounts.reduce((sum, acc) => sum + (acc.successCount || 0), 0),
            failureCalls: data.apiAccounts.reduce((sum, acc) => sum + (acc.failureCount || 0), 0),
            totalTasks: data.tasks.length,
            completedTasks: data.tasks.filter(t => t.status === 'completed').length,
            pendingTasks: data.tasks.filter(t => t.status === 'pending').length,
            failedTasks: data.tasks.filter(t => t.status === 'failed').length
        };

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 文件上传接口
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '请上传文件' });
        }

        // 读取文件并转换为base64
        const imageData = await fs.readFile(req.file.path, 'base64');
        const base64Image = `data:${req.file.mimetype};base64,${imageData}`;

        // 删除临时文件
        await fs.unlink(req.file.path);

        res.json({ 
            success: true, 
            image: base64Image 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// 前端路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 后台管理路由
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 创建必要的目录
async function initDirectories() {
    try {
        await fs.mkdir('uploads', { recursive: true });
        await fs.mkdir('public', { recursive: true });
    } catch (error) {
        console.error('创建目录失败:', error);
    }
}

// 启动服务器
async function startServer() {
    await initStorage();
    await initDirectories();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                  🎨 AI绘图任务管理平台后端服务启动成功                    ║
╠══════════════════════════════════════════════════════════════════════╣
║  📍 服务器地址: http://localhost:${PORT}                                   ║
║  🔧 API文档:   http://localhost:${PORT}/api/health                        ║
║  📊 数据存储:   ${DATA_FILE}                                             ║
╠══════════════════════════════════════════════════════════════════════╣
║  🚀 支持的功能:                                                        ║
║     • API账号管理（添加、编辑、删除）                                   ║
║     • 任务创建与处理（文字生图、参考图生图）                             ║
║     • 真实API调用（火山引擎、即梦）                                     ║
║     • 文件上传与处理                                                   ║
║     • 使用统计与监控                                                   ║
╚══════════════════════════════════════════════════════════════════════╝
        `);
    });
}

startServer().catch(error => {
    console.error('启动服务器失败:', error);
    process.exit(1);
});

module.exports = app;
