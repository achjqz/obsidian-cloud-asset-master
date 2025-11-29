# Cloud Asset Master

[English](README.md) | [中文](README_zh-CN.md)

![GitHub release (latest by date)](https://img.shields.io/github/v/release/achjqz/obsidian-cloud-asset-master)
![GitHub last commit](https://img.shields.io/github/last-commit/achjqz/obsidian-cloud-asset-master)
![GitHub license](https://img.shields.io/github/license/achjqz/obsidian-cloud-asset-master)

**Cloud Asset Master** 是一个强大的 Obsidian 插件，旨在优化您的仓库资源管理。它可以自动将图片压缩为 WebP 格式，上传到 Cloudflare R2，并清理未使用的本地图片，保持您的仓库轻量且快速。

## ✨ 功能特性

- **自动压缩**：将图片压缩为 WebP 格式，质量可配置，节省空间并提高加载速度。
- **云存储集成**：无缝上传图片到 Cloudflare R2，并将本地链接替换为公共 URL。
- **批量处理**：处理当前文件或扫描整个仓库，批量转换和上传图片。
- **智能清理**：识别并删除附件文件夹中未使用的图片，回收磁盘空间。
- **错误报告**：生成详细的处理错误报告。
- **并发控制**：通过内置的并发限制高效处理多个上传任务。

## 🛠️ 安装

1.  从 [Releases](https://github.com/achjqz/obsidian-cloud-asset-master/releases) 页面下载最新版本。
2.  将 `main.js`、`manifest.json` 和 `styles.css` 文件解压到您的仓库插件文件夹：`.obsidian/plugins/obsidian-cloud-asset-master/`。
3.  重新加载 Obsidian 并在设置中启用插件。

## ⚙️ 配置

在使用插件之前，您需要在设置选项卡中配置 Cloudflare R2 凭据：

1.  **R2 Endpoint**：您的 Cloudflare R2 端点 URL（例如 `https://<accountid>.r2.cloudflarestorage.com`）。
2.  **R2 Region**：通常为 `auto`。
3.  **Access Key ID**：您的 R2 Access Key ID。
4.  **Secret Access Key**：您的 R2 Secret Access Key。
5.  **Bucket Name**：您的 R2 存储桶名称。
6.  **Public Domain**：映射到 R2 存储桶的公共域名（例如 `https://assets.mydomain.com`）。
7.  **Compression Quality**：WebP 压缩质量（0.1 - 1.0）。默认为 `0.8`。
8.  **Attachments Folder**：存储本地图片的文件夹（例如 `attachments`）。

## 🚀 使用方法

### 命令

您可以通过命令面板（`Ctrl/Cmd + P`）访问以下命令：

-   **Cloud Asset Master: Process Current File**：压缩并上传当前活动笔记中的图片。
-   **Cloud Asset Master: Process All Files**：扫描整个仓库以处理所有 Markdown 文件中的图片。
-   **Cloud Asset Master: Clean Unused Images**：扫描 `Attachments Folder` 中未在任何 Markdown、Canvas 或 Kanban 文件中引用的图片，并将其移动到废纸篓。

### 工作流程

1.  **写作**：像往常一样在笔记中添加图片。
2.  **处理**：运行 "Process Current File" 上传当前笔记中的图片，或运行 "Process All Files" 更新整个仓库。
3.  **清理**：定期运行 "Clean Unused Images" 删除已上传或删除的图片的本地副本。

## ⚠️ 重要提示

-   **备份**：在运行 "Process All Files" 或 "Clean Unused Images" 等批量操作之前，请务必备份您的仓库。
-   **撤销**：替换后的链接指向云端 URL。本地文件在处理过程中不会自动删除（除非您运行清理命令），因此如果需要，您可以还原更改。

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 📄 许可证

本项目基于 MIT 许可证开源 - 详情请参阅 [LICENSE](LICENSE) 文件。
