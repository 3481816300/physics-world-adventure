# 付费与兑换流程

## 商品

- 免费试玩：第一章第 1 关
- 早期完整版：¥9.9
- 正式完整版：预计 ¥19.9

店铺地址：https://pay.ldxp.cn/shop/3DPJRWIT

如果链动小铺需要押金，可以换用这些低门槛渠道：

- 面包多：适合卖数字商品和卡密，支付链路简单，通常不需要押金。
- 爱发电：适合 B 站/创作者，可以做赞助和数字商品。
- 微信/QQ 收款 + 手动发码：零押金、零平台费，但需要人工处理。
- 闲鱼：零押金，适合小额售卖，但自动化程度低。

游戏已经支持“输入兑换码解锁”，所以无论换哪个店铺，只要店铺能导出卡密，就把卡密导入 `redeem_codes` 表即可。

## 当前流程

1. 玩家打开店铺购买完整版。
2. 店铺支付完成后展示兑换码（卡密）。
3. 玩家登录游戏账号。
4. 玩家在“兑换完整版”中输入兑换码。
5. Supabase `redeem_code` RPC 核销兑换码，并把当前账号标记为 `premium`。
6. 当前账号立即解锁全部已发布章节；后续换设备登录仍保持已购买状态。

## 技术实现

`supabase/schema.sql` 已包含：

- `redeem_codes`：兑换码库存与核销状态
- `redeem_code(p_token, p_code)`：玩家兑换
- `create_redeem_codes(p_admin_password, p_quantity)`：管理员生成测试兑换码
- `players.premium` / `players.premium_until`：账号付费状态

如果项目已经部署过数据库，只执行增量迁移：

```sql
-- supabase/migrations/20260824_redeem_codes.sql
```

正式售卖时，建议把店铺生成的卡密批量导入 `redeem_codes` 表：

```sql
insert into public.redeem_codes (code, amount, expires_at)
values
('店铺卡密1', 9.90, null),
('店铺卡密2', 9.90, null);
```

管理员模式在账号页可以生成测试兑换码，用于本地验证；真实店铺卡密仍以店铺发卡数据为准。

## 注意事项

- 不要把 Supabase service key 放进前端。
- 兑换码只能使用一次，换账号后同一兑换码不可重复兑换。
- 兑换码按账号解锁，不绑定设备。
- 后续接入自动支付回调时，可以把 `redeem_codes` 替换成支付平台 Webhook + 订单号校验。
