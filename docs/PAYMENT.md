# 付费用户方案

## 目标

只让已付费玩家玩完整游戏。推荐结构：

- 免费玩家可以玩第 1 章作为试玩
- 付费玩家解锁全部章节
- 也可以在页面最前面直接加付费墙，不让免费玩家进入游戏

## 推荐支付渠道

### 面向全球

- **Stripe Payment Link**：最简单，不需要自己做结算页面
- **Lemon Squeezy**：适合卖数字商品，平台代收税
- **Paddle**：适合全球销售，平台处理税务和发票

### 面向中国

- **微信支付**
- **支付宝**

微信支付和支付宝通常需要：

- 企业资质
- 域名备案
- 签约支付商户号

如果是个人开发者，前期建议先用 Stripe 或 Lemon Squeezy 做海外版本。

## 推荐流程

1. 玩家注册账号
2. 玩家点击“购买完整版”
3. 跳转到支付页面
4. 支付成功后，支付平台调用 Webhook
5. Webhook 在 Supabase 里把该玩家标记为 `premium`
6. 游戏端登录时检查 `premium`
7. 付费玩家进入完整游戏，免费玩家进入试玩或付费墙

## 数据库

`supabase/schema.sql` 已经加入：

- `players.premium`：是否付费
- `players.premium_until`：会员到期时间
- `payments`：支付记录

## 技术实现

支付平台会发送 Webhook，例如 Stripe：

```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_xxx",
      "metadata": {
        "player_id": "玩家ID"
      }
    }
  }
}
```

Supabase Edge Function 收到后执行：

```sql
update players
set premium = true, premium_until = now() + interval '1 year'
where id = '玩家ID';
```

前端登录后读取：

```text
premium = true
```

然后解锁全部章节。

## 建议

- 不要把支付密钥放进 GitHub Pages 前端
- Webhook 必须放在 Supabase Edge Function 或独立后端
- 正式上线前先设置测试支付，验证完整流程
- 可以加入“兑换码”功能，先通过外部渠道卖兑换码，玩家在游戏里输入后解锁，这样最简单
