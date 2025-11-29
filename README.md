# Cloud Asset Master

[English](README.md) | [中文](README_zh-CN.md)

![GitHub release (latest by date)](https://img.shields.io/github/v/release/achjqz/obsidian-cloud-asset-master)
![GitHub last commit](https://img.shields.io/github/last-commit/achjqz/obsidian-cloud-asset-master)
![GitHub license](https://img.shields.io/github/license/achjqz/obsidian-cloud-asset-master)

**Cloud Asset Master** is a powerful Obsidian plugin designed to optimize your vault's asset management. It automatically compresses images to WebP format, uploads them to Cloudflare R2, and cleans up unused local images, keeping your vault lightweight and fast.

## ✨ Features

- **Automatic Compression**: Compresses images to WebP format with configurable quality to save space and improve load times.
- **Cloud Storage Integration**: Seamlessly uploads images to Cloudflare R2, replacing local links with public URLs.
- **Batch Processing**: Process the current file or scan your entire vault to convert and upload images in bulk.
- **Smart Cleanup**: Identifies and removes unused images from your attachments folder to reclaim disk space.
- **Error Reporting**: Generates detailed reports of any issues encountered during processing.
- **Concurrency Control**: Efficiently handles multiple uploads with built-in concurrency limits.

## 🛠️ Installation

1.  Download the latest release from the [Releases](https://github.com/achjqz/obsidian-cloud-asset-master/releases) page.
2.  Extract the `main.js`, `manifest.json`, and `styles.css` files to your vault's plugin folder: `.obsidian/plugins/obsidian-cloud-asset-master/`.
3.  Reload Obsidian and enable the plugin in the settings.

## ⚙️ Configuration

Before using the plugin, you need to configure your Cloudflare R2 credentials in the settings tab:

1.  **R2 Endpoint**: Your Cloudflare R2 Endpoint URL (e.g., `https://<accountid>.r2.cloudflarestorage.com`).
2.  **R2 Region**: Usually `auto`.
3.  **Access Key ID**: Your R2 Access Key ID.
4.  **Secret Access Key**: Your R2 Secret Access Key.
5.  **Bucket Name**: The name of your R2 bucket.
6.  **Public Domain**: The public domain mapped to your R2 bucket (e.g., `https://assets.mydomain.com`).
7.  **Compression Quality**: Set the quality for WebP compression (0.1 - 1.0). Default is `0.8`.
8.  **Attachments Folder**: The folder where your local images are stored (e.g., `attachments`).

## 🚀 Usage

### Commands

You can access the following commands via the Command Palette (`Ctrl/Cmd + P`):

-   **Cloud Asset Master: Process Current File**: Compresses and uploads images in the currently active note.
-   **Cloud Asset Master: Process All Files**: Scans the entire vault to process images in all Markdown files.
-   **Cloud Asset Master: Clean Unused Images**: Scans for images in the `Attachments Folder` that are not referenced in any Markdown, Canvas, or Kanban files and moves them to the Trash.

### Workflow

1.  **Write**: Add images to your notes as usual.
2.  **Process**: Run "Process Current File" to upload images in the current note, or "Process All Files" to update the whole vault.
3.  **Clean**: Periodically run "Clean Unused Images" to remove local copies of uploaded or deleted images.

## ⚠️ Important Notes

-   **Backup**: Always backup your vault before running bulk operations like "Process All Files" or "Clean Unused Images".
-   **Undo**: Replaced links point to the cloud URL. Local files are not automatically deleted during processing (unless you run the cleanup command), so you can revert changes if needed.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
