const WebSocket = require('ws');

// 1. 算号公式
function getActivationCode(did) {
    const salt = "MiuPhone_Secret_2026V2_Upgrade";
    const str = did + salt;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let hash = 5381; let hash2 = 0;
    
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = ((hash << 5) + hash) + c; 
        hash2 = ((hash2 << 4) ^ (hash2 >> 28)) ^ c; 
    }
    hash = Math.abs(hash); hash2 = Math.abs(hash2);
    
    let code = "";
    for(let i=0; i<6; i++) {
        code += chars[hash % chars.length];
        hash = Math.floor(hash / chars.length);
    }
    for(let i=0; i<6; i++) {
        code += chars[hash2 % chars.length];
        hash2 = Math.floor(hash2 / chars.length);
    }
    return code.match(/.{1,4}/g).join('-');
}

// 2. 连接 Zeabur 里的 QQ 机器人
// 这里会自动读取 Zeabur 给的网络地址
const wsUrl = process.env.WS_URL || 'ws://127.0.0.1:3001'; 
let ws;

function connectBot() {
    console.log(`正在连接到QQ大脑: ${wsUrl}`);
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('✅ 成功连接到 QQ 机器人！等待私聊消息...');
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        // 只要有人私聊机器人
        if (msg.post_type === 'message' && msg.message_type === 'private') {
            const text = msg.raw_message.trim();
            const userId = msg.user_id;

            // 检查他发的是不是：激活 MIU-XXXX-XXXX
            const match = text.match(/^激活\s+(MIU-[A-Z0-9]{4}-[A-Z0-9]{4})$/i);

            if (match) {
                const did = match[1].toUpperCase();
                console.log(`收到用户 ${userId} 的激活请求，设备码: ${did}`);
                
                const validCode = getActivationCode(did);
                const replyText = `你的专属激活码是：\n${validCode}\n祝你使用愉快！`;

                // 发送私聊回复
                ws.send(JSON.stringify({
                    action: "send_private_msg",
                    params: {
                        user_id: userId,
                        message: replyText
                    }
                }));
                console.log(`已回复激活码给: ${userId}`);
            }
        }
    });

    ws.on('close', () => {
        console.log('连接断开，5秒后自动重连...');
        setTimeout(connectBot, 5000);
    });
    
    ws.on('error', (err) => {
        console.error('WebSocket 错误:', err.message);
    });
}

connectBot();
