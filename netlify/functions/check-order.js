const fs = require('fs');

exports.handler = async (event) => {
  try {
    // 1. 接收前端传递的订单号
    const { out_trade_no } = JSON.parse(event.body);
    
    // 2. 读取订单文件
    const orderPath = './orders.json';
    if (!fs.existsSync(orderPath)) {
      return {
        statusCode: 404,
        body: JSON.stringify({ status: 'NOT_FOUND', message: '订单不存在' }),
      };
    }

    const orders = JSON.parse(fs.readFileSync(orderPath));
    const order = orders[out_trade_no];

    // 3. 返回订单状态
    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ status: 'NOT_FOUND', message: '订单不存在' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: order.status, // UNPAID（未付款）/PAID（已付款）
        downloadUrl: order.downloadUrl || '', // 下载链接（已付款才返回）
        novelTitle: order.novelTitle,
      }),
    };
  } catch (error) {
    console.error('查询订单失败：', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'ERROR', message: '查询失败，请重试' }),
    };
  }
};
