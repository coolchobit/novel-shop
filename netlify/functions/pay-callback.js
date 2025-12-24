const { Wechatpay } = require('wechatpay-node-v3');
const fs = require('fs');

// 初始化微信支付（与create-order.js一致）
const pay = new Wechatpay({
  appid: process.env.WX_APPID,
  mchid: process.env.WX_MCHID,
  privateKey: process.env.WX_PRIVATE_KEY,
  serialNo: process.env.WX_SERIAL_NO,
  apiV3Key: process.env.WX_API_V3_KEY,
});

exports.handler = async (event) => {
  try {
    // 1. 验证微信支付回调签名（防止伪造请求）
    const signature = event.headers['wechatpay-signature'];
    const timestamp = event.headers['wechatpay-timestamp'];
    const nonce = event.headers['wechatpay-nonce'];
    const body = event.body;
    
    await pay.callback.verify({
      signature,
      timestamp,
      nonce,
      body,
      serialNo: process.env.WX_SERIAL_NO,
    });

    // 2. 解析回调数据
    const callbackData = JSON.parse(body);
    const out_trade_no = callbackData.out_trade_no; // 商户订单号
    const trade_state = callbackData.trade_state;   // 支付状态

    // 3. 仅处理「付款成功」的订单
    if (trade_state === 'SUCCESS') {
      const orderPath = './orders.json';
      const novelsPath = './novels.json';
      
      // 4. 读取订单和小说数据
      const orders = JSON.parse(fs.readFileSync(orderPath));
      const novels = JSON.parse(fs.readFileSync(novelsPath));

      // 5. 更新订单状态+填充下载链接
      if (orders[out_trade_no]) {
        const novel = novels.find(n => n.id == orders[out_trade_no].novelId);
        orders[out_trade_no].status = 'PAID'; // 标记为已付款
        orders[out_trade_no].downloadUrl = novel.downloadUrl; // 填充小说下载链接
        orders[out_trade_no].payTime = new Date().toISOString(); // 付款时间
        fs.writeFileSync(orderPath, JSON.stringify(orders));
      }
    }

    // 6. 回复微信支付（必须返回200，否则会重复回调）
    return {
      statusCode: 200,
      body: JSON.stringify({ code: 'SUCCESS', message: '成功' }),
    };
  } catch (error) {
    console.error('回调处理失败：', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ code: 'FAIL', message: '失败' }),
    };
  }
};
