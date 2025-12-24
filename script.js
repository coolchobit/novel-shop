// 全局变量
let currentOrderNo = ''; // 当前订单号
// 替换为你的Netlify站点域名（部署后获取，格式：https://xxx.netlify.app）
const NETLIFY_DOMAIN = 'https://你的站点域名.netlify.app';

// 1. 加载小说数据
async function loadNovels() {
  try {
    const response = await fetch('novels.json');
    const novels = await response.json();
    renderNovels(novels);
  } catch (error) {
    console.error('加载小说数据失败：', error);
    alert('加载小说列表失败，请刷新页面！');
  }
}

// 2. 渲染小说瀑布流卡片
function renderNovels(novels) {
  const grid = document.getElementById('novelGrid');
  grid.innerHTML = '';

  if (novels.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-gray-500">未找到匹配的小说</p>';
    return;
  }

  novels.forEach(novel => {
    const card = document.createElement('div');
    card.className = 'novel-card';
    card.innerHTML = `
      <h3>${novel.title}</h3>
      <p class="chapter">最新章节：${novel.latestChapter}</p>
      <p class="price">价格：${novel.price}</p>
      <button class="buy-btn" 
        data-id="${novel.id}" 
        data-title="${novel.title}" 
        data-price="${novel.price.replace('元', '')}">
        立即购买
      </button>
    `;
    grid.appendChild(card);
  });

  bindBuyButtons();
}

// 3. 绑定购买按钮事件（调用后端创建订单函数）
function bindBuyButtons() {
  const buyButtons = document.querySelectorAll('.buy-btn');
  buyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const novelId = btn.dataset.id;
      const novelTitle = btn.dataset.title;
      const price = parseFloat(btn.dataset.price);

      // 按钮加载状态
      btn.disabled = true;
      btn.textContent = '创建订单中...';

      try {
        // 调用后端创建订单函数
        const response = await fetch(`${NETLIFY_DOMAIN}/.netlify/functions/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novelId, novelTitle, price }),
        });
        const data = await response.json();

        if (response.ok) {
          currentOrderNo = data.out_trade_no; // 保存订单号
          // 更新弹窗内容
          document.getElementById('modalTitle').textContent = `购买《${novelTitle}》`;
          document.getElementById('modalPrice').textContent = `${price}元`;
          document.querySelector('#paymentModal img').src = data.qrCode; // 显示支付二维码
          document.getElementById('downloadLinkContainer').classList.add('hidden');
          // 显示弹窗
          document.getElementById('paymentModal').classList.remove('hidden');
        } else {
          alert(data.message || '创建订单失败');
        }
      } catch (error) {
        alert('网络错误，请重试');
        console.error('创建订单失败：', error);
      } finally {
        // 恢复按钮状态
        btn.disabled = false;
        btn.textContent = '立即购买';
      }
    });
  });
}

// 4. 搜索功能（实时过滤小说）
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', async () => {
    const keyword = searchInput.value.trim().toLowerCase();
    const response = await fetch('novels.json');
    const allNovels = await response.json();
    // 过滤包含关键词的小说
    const filteredNovels = allNovels.filter(novel => 
      novel.title.toLowerCase().includes(keyword)
    );
    renderNovels(filteredNovels);
  });
}

// 5. 弹窗控制逻辑（查询订单状态）
function initModal() {
  const modal = document.getElementById('paymentModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const showDownloadBtn = document.getElementById('showDownloadBtn');
  const downloadLink = document.getElementById('downloadLink');
  const downloadContainer = document.getElementById('downloadLinkContainer');

  // 关闭弹窗
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    currentOrderNo = ''; // 清空订单号
  });

  // 点击弹窗外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      currentOrderNo = '';
    }
  });

  // 点击「已付款」查询订单状态
  showDownloadBtn.addEventListener('click', async () => {
    if (!currentOrderNo) {
      alert('订单不存在，请重新购买');
      return;
    }

    // 按钮加载状态
    showDownloadBtn.disabled = true;
    showDownloadBtn.textContent = '查询付款状态...';

    try {
      // 调用后端查询订单函数
      const response = await fetch(`${NETLIFY_DOMAIN}/.netlify/functions/check-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ out_trade_no: currentOrderNo }),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.status === 'PAID') {
          // 付款成功，显示下载链接
          downloadLink.href = data.downloadUrl;
          downloadLink.textContent = `下载《${data.novelTitle}》TXT`;
          downloadContainer.classList.remove('hidden');
        } else if (data.status === 'UNPAID') {
          alert('暂未查询到付款记录，请确认已付款或稍后重试');
        } else {
          alert(data.message || '订单状态异常');
        }
      } else {
        alert(data.message || '查询失败，请重试');
      }
    } catch (error) {
      alert('网络错误，请重试');
      console.error('查询订单失败：', error);
    } finally {
      // 恢复按钮状态
      showDownloadBtn.disabled = false;
      showDownloadBtn.textContent = '已付款，显示下载链接';
    }
  });
}

// 初始化所有功能
window.onload = () => {
  loadNovels();
  initSearch();
  initModal();
};
