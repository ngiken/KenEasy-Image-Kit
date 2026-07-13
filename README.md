<div align="center">

# KenEasy Image Kit

**打开就能用的图片工具** — 拖入图片，压缩、改尺寸、转 WebP / JPEG / PNG，一键打包下载。
文件只在你浏览器里处理，**不上传、不安装、不注册**。

<br/>

### 👉 点这里直接使用

# [🚀 打开 Image Kit（在线）](https://ngiken.github.io/KenEasy-Image-Kit/)

**https://ngiken.github.io/KenEasy-Image-Kit/**

> 上面这个才是**工具网页**。
> 你现在看的 GitHub 页面只是**源代码**，不能当工具点着用。

<br/>

[中文](README.md) · [English](README.en.md)

<br/>

<img alt="Use online" src="https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E4%BD%BF%E7%94%A8-ngiken.github.io-fb7299?style=for-the-badge">
<img alt="Version" src="https://img.shields.io/badge/version-0.1.0-27c499?style=for-the-badge">
<img alt="Privacy" src="https://img.shields.io/badge/privacy-local%20only-00aeec?style=for-the-badge">
<img alt="License" src="https://img.shields.io/badge/license-MIT-9aa4b2?style=for-the-badge">

</div>

---

## 30 秒上手

1. 打开：**[在线工具](https://ngiken.github.io/KenEasy-Image-Kit/)**
2. 把图片拖进页面（支持多选）
3. 选输出格式（WebP / JPEG / PNG）、质量、最长边（可选）
4. 按住 `⠿` 拖动调整顺序（可选）
5. 点 **开始处理** → 自动打包下载（或逐张下载）

就这么多。没有账号、没有安装包、没有服务器上传。

---

## 这是什么

KenEasy Image Kit 是一个**纯前端**图片工具：

| 你想做的事 | 它怎么帮你 |
| --- | --- |
| 图片太大要压缩 | 转 WebP / JPEG，拉质量滑块，体积立减 |
| 换个格式 | PNG ↔ JPEG ↔ WebP 一键互转 |
| 尺寸太大要缩小 | 设「最长边」，等比缩小（不放大小图） |
| 一堆图要打包 | 全部处理完打包成一个 zip 下载 |
| 隐私敏感图片 | 全程在本机浏览器完成，不经过服务器 |

界面支持 **中文 / English** 一键切换（右上角），会记住你的选择；首次打开按浏览器语言自动选择。

适合：发图前压体积、截图批量转格式、给网页/表单准备合规尺寸的图。

---

## 支持什么

| 输入格式 | 说明 |
| --- | --- |
| PNG / JPG / WEBP / GIF / BMP | 拖入或点击选择，支持多选 |

| 输出选项 | 说明 |
| --- | --- |
| 格式 | WebP / JPEG / PNG，或「保持原格式」 |
| 质量 | 0.4–1.0 滑块（对 WebP / JPEG 生效；PNG 无损忽略） |
| 最长边 | 像素值；`0` = 不缩放。只缩小、不放大 |
| 打包方式 | 合并成一个 zip（默认）/ 逐张下载 |
| 文件名 | zip 文件名，或保留每张原文件名（仅换扩展名） |

---

## 隐私说明

- 图片**不会上传**到任何服务器（本项目也没有后端）
- 处理只在当前浏览器标签页的内存里进行
- 关掉页面后，队列里的文件引用会被释放

---

## 本地使用（可选）

不想走在线链接时，可在本机跑同样的页面（依赖已打包在 `web/vendor/`，可离线）：

```powershell
# 在仓库根目录
python -m http.server 5173 --directory web
```

然后打开 <http://localhost:5173/>。

> 不推荐直接双击 `index.html`（`file://`），部分浏览器会限制脚本；用上面的本地服务最稳。

重新下载离线依赖（可选）：

```powershell
.\scratch\fetch-vendor.ps1
```

---

## 已知限制

- 重编码会**移除 EXIF**（含拍摄信息与方向标记）；带旋转 EXIF 的图会先按方向绘制后再输出
- 不做 HEIC 解码、水印、裁剪/旋转编辑（后续版本可能加入）
- 质量滑块对 PNG 无效（PNG 为无损）
- 建议单文件 &lt; 40MB，队列最多约 120 张

---

## 技术与目录

纯静态站点，推送到 `main` 后由 GitHub Actions 自动发布 Pages。

| 库 | 用途 |
| --- | --- |
| SortableJS | 队列拖拽排序 |
| JSZip | 打包成 zip 下载 |
| 浏览器 Canvas | 解码 / 缩放 / 重编码（零额外依赖） |

```text
web/                 ← 网站本体（也是 Pages 发布内容）
  index.html
  styles.css
  app.js
  vendor/            ← 离线依赖
.github/workflows/   ← 自动部署
scratch/             ← 维护脚本 + 端到端测试
```

第三方许可：[`web/vendor/NOTICE.txt`](./web/vendor/NOTICE.txt)

---

## 更新说明

### v0.1.0
- 首个版本：拖拽队列、排序、多图处理
- 输出 WebP / JPEG / PNG，质量滑块，最长边等比缩放
- 打包 zip 或逐张下载，可保留原文件名
- 中英双语界面，本地离线可用

---

## 链接一览

| 用途 | 链接 |
| --- | --- |
| **立即使用（推荐）** | https://ngiken.github.io/KenEasy-Image-Kit/ |
| 源代码 | https://github.com/ngiken/KenEasy-Image-Kit |

---

## 许可

[MIT](LICENSE) © 2026
