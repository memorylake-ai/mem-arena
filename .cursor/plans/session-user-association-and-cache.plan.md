---
name: ""
overview: ""
todos: []
isProject: false
---

# Session 关联用户 ID + 本地用户缓存

## 概述

1. **会话归属**：将 chat session（`sessions` 表）与当前用户 ID 绑定，创建/列表/读写/删除均按用户过滤并做归属校验。
2. **性能优化**：新增表 `arena_session_users`，首次请求时向主域校验并将用户信息写入该表，后续请求在同会话内从本库读取，避免每次会话 action 都请求主域。

---

## 一、Chat Session 关联 userId

### 1.1 数据层

- **Schema** [lib/db/schema.ts](lib/db/schema.ts)：`sessions` 表增加 `userId: text("user_id").notNull()`。
- **迁移**：新增迁移（如 `drizzle/0001_*.sql`），`ALTER TABLE sessions ADD COLUMN user_id text NOT NULL DEFAULT '';`（已有数据 `user_id = ''`，列表仅查当前用户，旧会话不会出现在任何人列表中）。

### 1.2 Repo 层 [lib/db/repo.ts](lib/db/repo.ts)

- **createSession**：入参增加 `userId`，插入时写入 `user_id`。
- **listSessions(userId)**：增加参数 `userId`，`where(eq(sessions.userId, userId))`。
- **getSessionById(id)**：不变，调用方用返回的 `row.userId` 做归属校验。
- **updateSession(id, data, userId?)**：可选 `userId`，若传则 WHERE 加 `eq(sessions.userId, userId)`。
- **deleteSession(id, userId?)**：同上，可选 `userId` 做 WHERE 条件。

### 1.3 Server Actions [app/actions/chat.ts](app/actions/chat.ts)

通过「取当前用户」（见第二节）得到 `user.id` 后：

- **getSessions**：`listSessions(user.id)`。
- **createSession**：`dbCreateSession({ id, userId: user.id })`。
- **getSessionMessages(sessionId)**：`getSessionById(sessionId)`，校验 `session.userId === user.id` 后再取消息；否则抛错。
- **renameSession** / **deleteSession**：校验归属后调用 `dbUpdateSession` / `dbDeleteSession` 并传入 `user.id`。

### 1.4 API 层 [app/api/chat/route.ts](app/api/chat/route.ts)

- 在写 DB 前：`getSessionById(sessionId)`，若不存在或 `session.userId !== userId` 则 `403`。
- `updateSession(sessionId, data, userId)` 传入 `userId` 做条件更新。

---

## 二、性能优化：本地用户缓存表 arena_session_users

### 2.1 表结构

**表名**：`arena_session_users`。

| 字段         | 类型                               | 说明                                                      |
| ------------ | ---------------------------------- | --------------------------------------------------------- |
| session_key  | text, PK                           | 主域 session cookie 的哈希（如 SHA-256），不存原始 cookie |
| user_id      | text, not null                     | 主域用户 ID                                               |
| display_name | text                               | 可选，展示用                                              |
| email        | text                               | 可选                                                      |
| avatar_url   | text                               | 可选                                                      |
| metadata     | jsonb                              | 扩展信息，可存主域返回的其它字段或业务需要的数据          |
| expires_at   | timestamp with time zone, not null | 缓存过期时间，建议 5–15 分钟                              |
| created_at   | timestamp with time zone           | 创建时间                                                  |
| updated_at   | timestamp with time zone           | 更新时间                                                  |

- 首次请求：主域校验成功后，按 `session_key` upsert 一行，设置 `expires_at = now() + TTL`。
- 后续请求：用当前请求的 cookie 算出 `session_key`，查本表；若存在且 `expires_at > now()` 则直接返回 `user_id`（及展示字段），不再请求主域；否则回源主域并更新/插入。

### 2.2 Schema 与迁移

- 在 [lib/db/schema.ts](lib/db/schema.ts) 中定义 `arenaSessionUsers` 表，包含上述字段（含 `metadata`）。
- 新增迁移：创建 `arena_session_users` 表；若与 `sessions.user_id` 在同一批次，可放在同一迁移或分两个迁移文件。

### 2.3 取当前用户逻辑

- 新增 **getCurrentUser()**（或拆成 getCurrentUserId + 可选展示字段）：

1. 读主域 session cookie。
2. 计算 `session_key = hash(cookieValue)`。
3. 查 `arena_session_users`：若存在且 `expires_at > now()`，返回缓存的 user（含 user_id、display_name、email、avatar_url、metadata）。
4. 否则：请求主域 `GET .../api/user/self`，校验通过后 upsert `arena_session_users`（含 metadata 若主域有返回或业务需要），设置 `expires_at`，再返回 user。

- 会话相关 action 统一调用 getCurrentUser()，用返回的 `user.id` 做归属校验与过滤；不再每次调用 getProfile()，从而优化性能。

### 2.4 TTL 与安全

- TTL 建议 5–15 分钟；仅在主域校验成功后才写入本库；不存原始 cookie，只存哈希。

---

## 三、涉及文件汇总

| 文件                                                      | 变更                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [lib/db/schema.ts](lib/db/schema.ts)                      | sessions 增加 userId；新增 arena_session_users 表（含 metadata）                                                               |
| drizzle 迁移                                              | sessions.user_id；创建 arena_session_users                                                                                     |
| [lib/db/repo.ts](lib/db/repo.ts)                          | createSession 带 userId；listSessions(userId)；updateSession/deleteSession 可选 userId；arena_session_users 的 get/upsert 方法 |
| [app/actions/profile.ts](app/actions/profile.ts) 或新文件 | getCurrentUser()：读 cookie → 查 arena_session_users → 未命中/过期则请求主域并 upsert                                          |
| [app/actions/chat.ts](app/actions/chat.ts)                | 所有 session 相关 action 先 getCurrentUser()，再按 user.id 过滤/校验                                                           |
| [app/api/chat/route.ts](app/api/chat/route.ts)            | getSessionById 后校验 session.userId === userId；updateSession 传 userId                                                       |

---

## 四、验收

- 新建会话只出现在当前用户侧栏；访问 `/session/<他人 sessionId>` 加载历史失败；重命名/删除仅对自己会话生效；API 越权写 session 返回 403。
- 首次请求后用户信息写入 `arena_session_users`（含 metadata）；后续同会话请求从本库读取，不再请求主域，延迟明显降低。
