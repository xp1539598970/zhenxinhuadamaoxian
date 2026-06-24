# 真心话大冒险 - 第三次课升级方案

## 一、项目现状分析

| 维度 | 现状 | 达标情况 |
|------|------|---------|
| 用户登录 | `wx.getUserProfile` + `getOpenId` 云函数 | ✅ 已实现 |
| 数据库关联 _openid | players 集合有 openId 字段 | ✅ 已实现 |
| 页面显示当前用户 | 首页未显示，房间页未显示 | ❌ 需补充 |
| 云存储使用 | 未使用 | ❌ 需新增 |
| loading 提示 | create/join 页有 loading，room 页缺少 | ️ 部分实现 |
| 错误提示 | 大部分有 toast | ️ 需补全 |
| 成功反馈 | 部分有 toast | ️ 需补全 |
| 页面数量 | 4 个（index/create/join/room） | ✅ 需新增 ≥1 |
| 分享功能 | `onShareAppMessage` 已实现 | ✅ 已实现 |

---

## 二、升级内容

### 1. 新增页面：「我的」页面（pages/profile/index）

- 展示当前用户头像、昵称（从 globalData.userInfo 读取）
- 展示我的游戏记录列表（从 gameRecords 集合查询）
- 设置入口：清除缓存
- 作为 TabBar 页面，与首页并列

### 2. 新增云存储功能：游戏截图上传

- 游戏结束后，房主可上传游戏截图到云存储
- 截图记录保存到 `gameScreenshots` 集合
- 截图可在「我的」页面查看

### 3. 新增云函数：getImageUrl

- 接收 fileID 列表
- 调用 `cloud.getTempFileURL` 获取临时访问链接
- 返回给前端展示

### 4. 完善加载状态与错误处理

- 所有云函数调用加 `wx.showLoading` / `wx.hideLoading`
- 网络失败统一 `wx.showToast({ title: '加载失败，请重试', icon: 'none' })`
- 成功操作统一 `wx.showToast({ title: '操作成功', icon: 'success' })`

### 5. 首页显示当前用户信息

- 首页顶部显示用户头像 + 昵称

---

## 三、数据库设计

### 已有集合（无需修改）

| 集合名 | 权限 | 说明 |
|--------|------|------|
| `rooms` | 仅创建者可读写 | 房间信息 |
| `players` | 仅创建者可读写 | 玩家信息 |
| `questions` | 所有用户可读，仅创建者可写 | 题库 |
| `gameRecords` | 仅创建者可读写 | 游戏记录 |

### 新增集合

#### `userProfiles` — 用户档案

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户 openId（自动） |
| `nickName` | string | 昵称 |
| `avatarUrl` | string | 头像 URL |
| `createdAt` | date | 创建时间 |
| `updatedAt` | date | 更新时间 |

**权限**：仅创建者可读写（默认规则即可）
**索引**：`_openid`（默认唯一索引，无需额外创建）

#### `gameScreenshots` — 游戏截图

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 上传者 openId（自动） |
| `fileID` | string | 云存储 fileID |
| `roomId` | string | 关联房间 ID |
| `roomCode` | string | 房间号 |
| `players` | array\<string\> | 参与玩家昵称列表 |
| `createdAt` | date | 上传时间 |

**权限**：所有用户可读，仅创建者可写
**索引**：
- `_openid`（默认，无需创建）
- `roomId`（复合索引，用于查询某房间的所有截图）
- `createdAt`（降序，用于按时间排序）

---

## 四、云函数设计

### 新增：`getImageUrl`

**触发方式**：小程序端调用
**入参**：`{ fileList: string[] }` — fileID 数组
**出参**：`{ success: true, fileList: [{ fileID, tempFileURL }] }`
**逻辑**：调用 `cloud.getTempFileURL({ fileList })` 返回临时链接

### 新增：`uploadScreenshot`

**触发方式**：小程序端调用
**入参**：`{ roomId, roomCode, players }`
**逻辑**：
1. 从 `cloud.getWXContext()` 获取 openId
2. 返回空结果（实际上传由前端 `wx.cloud.uploadFile` 完成）
3. 上传成功后前端调用此云函数保存记录到 `gameScreenshots` 集合

### 修改：`endGame`

**新增逻辑**：游戏结束时自动记录截图数量到 gameRecords

---

## 五、文件变更清单

### 新增文件
```
pages/profile/index.js
pages/profile/index.json
pages/profile/index.wxml
pages/profile/index.wxss
cloudfunctions/getImageUrl/index.js
cloudfunctions/getImageUrl/package.json
cloudfunctions/uploadScreenshot/index.js
cloudfunctions/uploadScreenshot/package.json
```

### 修改文件
```
app.json          → 添加 profile 页面 + tabBar
app.js            → 完善用户信息获取逻辑
pages/index/index.js    → 显示当前用户信息
pages/index/index.wxml  → 添加用户信息展示区
pages/index/index.wxss  → 添加样式
pages/room/index.js     → 添加截图上传 + loading 完善
pages/room/index.wxml   → 添加截图按钮
pages/room/index.wxss   → 添加样式
```

---

## 六、执行步骤

### Step 1：数据库初始化
1. 在微信开发者工具 → 云开发控制台 → 数据库
2. 手动创建集合：`userProfiles`、`gameScreenshots`
3. 设置权限（见上方表格）
4. 创建索引（见上方表格）

### Step 2：创建云函数
1. 在 `cloudfunctions/` 下创建 `getImageUrl` 和 `uploadScreenshot`
2. 每个云函数目录执行 `npm install wx-server-sdk`
3. 右键 → 上传并部署：云端安装依赖

### Step 3：前端代码改造
1. 修改 `app.json` 添加 tabBar 和 profile 页面
2. 创建 `pages/profile/` 四个文件
3. 修改 `app.js` 完善用户信息
4. 修改 `pages/index/` 显示用户信息
5. 修改 `pages/room/` 添加截图上传
6. 完善所有页面的 loading / 错误 / 成功提示

### Step 4：测试验证
1. 编译运行，检查 tabBar 是否正常
2. 登录 → 首页显示头像昵称
3. 创建房间 → 玩游戏 → 结束 → 上传截图
4. 「我的」页面查看游戏记录和截图
5. 分享给好友功能正常

---

## 七、验收对照表

| 第三次课要求 | 实现方式 | 状态 |
|-------------|---------|------|
| wx.getUserProfile 获取用户信息 | app.js 已有，完善错误处理 | ✅ |
| 云数据库关联 _openid | players/userProfiles/gameScreenshots 均有 | ✅ |
| 页面显示"当前用户是谁" | 首页 + 我的页面显示头像昵称 | ✅ |
| 至少1处使用云存储 | 游戏截图上传到云存储 | ✅ |
| 云存储文件能在小程序内访问 | getImageUrl 云函数获取临时链接 | ✅ |
| 数据加载时显示 loading | 所有云函数调用加 wx.showLoading | ✅ |
| 网络失败有错误提示 | 统一 catch + showToast | ✅ |
| 表单提交成功有反馈 | 统一 showToast success | ✅ |
| 页面数量 ≥ 3 | 5 个页面（index/create/join/room/profile） | ✅ |
| [我的] 页面 | pages/profile/index | ✅ |
| 分享给微信好友 | onShareAppMessage 已有 | ✅ |
| 设置功能（清除缓存） | 我的页面内清除本地缓存 | ✅ |
