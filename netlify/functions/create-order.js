const { Wechatpay } = require('wechatpay-node-v3');
const QRCode = require('qrcode');
const fs = require('fs');

// 从Netlify环境变量读取微信支付配置（避免硬编码）
const pay = new Wechatpay({
  appid: process.env.WX_APPID,
  mchid: process.env.WX_MCHID,
  privateKey: process.env.WX_PRIVATE_KEY,
  serialNo: process.env.WX_SERIAL_NO,
  apiV3Key: process.env.WX_API_V3_KEY,
});

exports.handler = async (event) => {
  try {
    // 1. 接收前端传递的小说信息
    const { novelId, novelTitle, price } = JSON.parse(event.body);
    
    // 2. 生成唯一订单号（时间戳+随机数，避免重复）
    const out_trade_no = `NOVEL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 3. 调用微信支付API创建原生支付订单
    const result = await pay.pay.transactions.native({
      body: `购买小说：${novelTitle}`,  // 订单标题
      out_trade_no,                    // 商户订单号
      total: parseInt(price * 100),    // 金额（转换为分）
      spbill_create_ip: event.headers['x-nf-client-ip'] || '127.0.0.1', // 用户IP
      notify_url: `${process.env.NETLIFY_URL}/.netlify/functions/pay-callback`, // 支付回调地址
      goods_tag: `novel_${novelId}`,   // 商品标签（区分小说）
    });

    // 4. 生成支付二维码（Base64格式，前端直接展示）
    const qrCodeBase64 = await QRCode.toDataURL(result.code_url);

    // 5. 存储订单基础信息（orders.json）
    const orderPath = './orders.json';
    const orders = fs.existsSync(orderPath) ? JSON.parse(fs.readFileSync(orderPath)) : {};
    orders[out_trade_no] = {
      novelId,
      novelTitle,
      price,
      status: 'UNPAID', // 订单状态：未付款
      createTime: new Date().toISOString(),
      downloadUrl: '',  // 后续付款成功后填充
    };
    fs.writeFileSync(orderPath, JSON.stringify(orders));

    // 6. 返回结果给前端（订单号+二维码）
    return {
      statusCode: 200,
      body: JSON.stringify({
        out_trade_no,
        qrCode: qrCodeBase64,
        message: '订单创建成功，请扫码付款',
      }),
    };
  } catch (error) {
    console.error('创建订单失败：', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '创建订单失败，请重试' }),
    };
  }
};
