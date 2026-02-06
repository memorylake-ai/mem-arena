# MemoryLake Arena 部署指南

基于 Helm Chart（`helm/mem-arena`）在 Kubernetes 上部署应用的完整步骤。

## 前置条件

- **kubectl** 已配置，能访问目标集群
- **Helm 3** 已安装
- 集群中存在 **StorageClass** `zbyte-db`（StatefulSet PVC 使用）
- 节点具有 **node label** `relyt.cloud/nodepool: mem-arena`（与模板中 `nodeSelector` 一致）

---

## 1. 创建命名空间

```bash
kubectl create namespace mem-arena
```

---

## 2. 准备镜像拉取密钥（regcred）

模板中通过 `imagePullSecrets` 使用名为 `regcred` 的 Secret 拉取私有镜像。

**方式 A：从 bloom 命名空间拷贝（推荐）**

```bash
kubectl get secret regcred -n bloom -o yaml | \
  sed 's/namespace: .*/namespace: mem-arena/' | \
  grep -v '^\s*resourceVersion:\|^\s*uid:\|^\s*creationTimestamp:' | \
  kubectl apply -f -
```

**方式 B：新建 docker-registry Secret**

若使用 UCloud 镜像仓库 `uhub.service.ucloud.cn`：

```bash
kubectl create secret docker-registry regcred \
  --docker-server=uhub.service.ucloud.cn \
  --docker-username=<username> \
  --docker-password=<password> \
  -n mem-arena
```

---

## 3. 准备 DOTENV 私钥 Secret（bloom-env-private-key）

模板要求存在 Secret `bloom-env-private-key`，键为 `DOTENV_PRIVATE_KEY`。若未使用 DOTENV 加密，仍需该 Secret，否则 Pod 无法启动。

**未使用加密时：创建占位 Secret**

```bash
kubectl create secret generic bloom-env-private-key \
  --from-literal=DOTENV_PRIVATE_KEY='' \
  -n mem-arena
```

**已在使用加密时：从其他命名空间拷贝**

```bash
kubectl get secret bloom-env-private-key -n bloom -o yaml | \
  sed 's/namespace: .*/namespace: mem-arena/' | \
  grep -v '^\s*resourceVersion:\|^\s*uid:\|^\s*creationTimestamp:' | \
  kubectl apply -f -
```

---

## 4. 配置 values

编辑 `helm/mem-arena/values/production.yaml`，至少确认或填写：

| 项 | 说明 |
|----|------|
| `app.databaseUrl` | 生产数据库连接串 |
| `image.tag` | 要部署的镜像 tag，与构建/推送的 tag 一致 |
| 其他 `app.*` | 按需填写 API Key、URL（mem0、supermemory、zootopia、litellm、arena、mainDomain 等） |

使用 stage 环境时，后续 Helm 命令改为 `-f values/stage.yaml`。

---

## 5. 构建并推送镜像（如需新版本）

镜像名为：`<image.repository>/mem-arena:<image.tag>`  
例如：`uhub.service.ucloud.cn/zbyte_release/mem-arena:<tag>`。

在项目根目录：

```bash
# 构建（替换为实际 tag）
docker build -t uhub.service.ucloud.cn/zbyte_release/mem-arena:20260126-de3d222 .

# 登录镜像仓库后推送
docker push uhub.service.ucloud.cn/zbyte_release/mem-arena:20260126-de3d222
```

确保 `values/production.yaml` 中 `image.tag` 与上述 tag 一致。

---

## 6. 渲染并检查（可选）

在 `helm/mem-arena` 目录下预览渲染结果：

```bash
cd helm/mem-arena
helm template mem-arena-app . -f values/production.yaml -n mem-arena
```

确认 StatefulSet、ConfigMap、Service 等符合预期。

---

## 7. 安装或升级

在 `helm/mem-arena` 目录下执行。

**首次安装：**

```bash
helm install mem-arena-app . \
  -f values/production.yaml \
  -n mem-arena
```

**后续更新配置或镜像：**

```bash
helm upgrade mem-arena-app . \
  -f values/production.yaml \
  -n mem-arena
```

**按需覆盖单点配置：**

```bash
helm upgrade mem-arena-app . \
  -f values/production.yaml \
  --set app.dailyCreditsAmount=5000 \
  --set image.tag=20260126-abc1234 \
  -n mem-arena
```

---

## 8. 更新 ConfigMap 环境变量并生效

应用通过 ConfigMap `mem-arena-app-conf` 注入 `.env`（挂载到 `/app/.env`）。修改环境变量后需两步：先更新 ConfigMap，再让 Pod 重新加载。

### 8.1 更新 ConfigMap

**方式 A：改 values 后用 Helm（推荐）**

编辑 `helm/mem-arena/values/production.yaml` 中 `app.*`、`common.dotenvPublicKey` 等，然后：

```bash
cd helm/mem-arena
helm upgrade mem-arena-app . -f values/production.yaml -n mem-arena
```

**方式 B：直接改 ConfigMap**

```bash
kubectl edit configmap mem-arena-app-conf -n mem-arena
```

### 8.2 使新环境变量生效

ConfigMap 更新后，挂载到 Pod 内的文件会由 kubelet 在约 1 分钟内同步，但进程在启动时已读取过 `.env`，运行时不会自动重载。**必须重启 Pod** 后新进程才会读到新值。

对 StatefulSet 执行滚动重启：

```bash
kubectl rollout restart statefulset mem-arena-app -n mem-arena
```

总结：改 values 或 ConfigMap → `helm upgrade` 或 `kubectl apply` 更新 ConfigMap → `kubectl rollout restart statefulset mem-arena-app` 重启 Pod。

---

## 9. 验证部署

```bash
# Pod 状态（期望 Running，Ready 1/1）
kubectl get pods -n mem-arena

# 事件与日志
kubectl describe pod -l app=mem-arena-app -n mem-arena
kubectl logs -l app=mem-arena-app -n mem-arena -f

# Service
kubectl get svc -n mem-arena
```

应用监听 3000 端口，就绪/存活探针为 `GET /api/ping`，需保证该接口存在且返回 200。

---

## 依赖汇总

| 依赖 | 说明 |
|------|------|
| Namespace | `mem-arena` |
| Secret `regcred` | `docker-registry`，用于拉取 `uhub.service.ucloud.cn` 镜像 |
| Secret `bloom-env-private-key` | 含 key `DOTENV_PRIVATE_KEY`（可为空占位） |
| Node label | `relyt.cloud/nodepool: mem-arena` |
| StorageClass | `zbyte-db` |

---

## 卸载

```bash
helm uninstall mem-arena-app -n mem-arena
```

如需保留 PVC，卸载前可先删 StatefulSet 并保留 PVC，或卸载后按需清理 PVC。
