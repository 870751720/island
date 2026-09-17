# 浏览器能力兼容

## 背景
iOS 15 内嵌浏览器在创建玩家名牌时缺少 Canvas roundRect，导致登岛初始化失败。语言编译目标不会自动补齐运行时 Web API。

## 需求描述
业务通过 src/platform/compat 统一使用存在兼容差异的能力。按能力检测选择实现，不按 UA 猜测，也不修改浏览器全局原型。

## 设计方案
- canvas.ts：roundedRectPath 开始并闭合等半径圆角矩形路径，尺寸非负，半径限制到短边一半；优先原生 roundRect，缺失时用 arcTo。名牌、奶瓶、照片卡及战绩卡共享实现。
- identity.ts：createUuid 优先原生 UUID，缺失时用 getRandomValues 生成 UUID v4。玩家、信令、恢复凭证与新世界实体共用。无安全随机能力时明确报错，不用 Math.random 生成凭证。已有持久化 ID 保持不变。
- data.ts：clonePlainData 仅接受普通存档数据树；原生 structuredClone 缺失时递归复制对象和数组，保留 undefined。不得用于类实例、循环引用或可转移对象。任务与首掉保底快照使用此接口。
- clipboard.ts：writeClipboardText 统一检查能力、返回失败。战绩页提示保存图片，邀请界面保留房间码和二维码入口。拒绝权限不会被误报为复制成功。
- 联机增量路径取最后一段使用基础数组索引，不依赖 Array.at。
- WebGL2、WebRTC、ResizeObserver 等底层能力不在本次模拟范围；此兼容层不代表支持所有旧浏览器。登岛页不提供诊断日志采集或复制入口。
- 无新增依赖、不改变存档版本、协议格式或权威结算。房主和客人独立使用本地兼容实现；凭证仍使用安全随机数。
- 回归命令：node scripts/test-browser-compat.mts。隔离环境模拟接口不存在与权限拒绝，验证圆角路径、UUID 格式及版本位、深复制隔离、复制失败语义。真机运行由用户验证。

参考：[Canvas roundRect](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect)、[Crypto randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)。
