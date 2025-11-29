import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
import { S3Uploader, S3Config } from './s3_uploader';
import { ImageProcessor } from './image_processor';

interface CloudAssetMasterSettings {
    r2Endpoint: string;
    r2Region: string;
    r2AccessKeyId: string;
    r2SecretAccessKey: string;
    r2BucketName: string;
    r2PublicDomain: string;
    compressionQuality: number;
    attachmentsFolder: string;
}

const DEFAULT_SETTINGS: CloudAssetMasterSettings = {
    r2Endpoint: '',
    r2Region: 'auto',
    r2AccessKeyId: '',
    r2SecretAccessKey: '',
    r2BucketName: '',
    r2PublicDomain: '',
    compressionQuality: 0.8,
    attachmentsFolder: 'attachments'
}

interface ProcessingError {
    file: string;
    imagePath?: string;
    error: string;
    timestamp: string;
}

export default class CloudAssetMasterPlugin extends Plugin {
    settings: CloudAssetMasterSettings;
    s3Uploader: S3Uploader;
    imageProcessor: ImageProcessor;

    async onload() {
        await this.loadSettings();

        this.s3Uploader = new S3Uploader({
            endpoint: this.settings.r2Endpoint,
            region: this.settings.r2Region,
            accessKeyId: this.settings.r2AccessKeyId,
            secretAccessKey: this.settings.r2SecretAccessKey,
            bucketName: this.settings.r2BucketName,
            publicDomain: this.settings.r2PublicDomain
        });

        this.imageProcessor = new ImageProcessor();

        // Command: Process Current File
        this.addCommand({
            id: 'process-current-file',
            name: 'Process Current File',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                await this.processCurrentFile(editor, view);
            }
        });

        // Command: Process All Files
        this.addCommand({
            id: 'process-all-files',
            name: 'Process All Files',
            callback: async () => {
                await this.processAllFiles();
            }
        });

        // Command: Clean Unused Images
        this.addCommand({
            id: 'clean-unused-images',
            name: 'Clean Unused Images',
            callback: async () => {
                await this.cleanUnusedImages();
            }
        });

        this.addSettingTab(new CloudAssetMasterSettingTab(this.app, this));
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Re-init uploader with new settings
        this.s3Uploader = new S3Uploader({
            endpoint: this.settings.r2Endpoint,
            region: this.settings.r2Region,
            accessKeyId: this.settings.r2AccessKeyId,
            secretAccessKey: this.settings.r2SecretAccessKey,
            bucketName: this.settings.r2BucketName,
            publicDomain: this.settings.r2PublicDomain
        });
    }

    async processCurrentFile(editor: Editor, view: MarkdownView) {
        new Notice('Processing current file...');
        const content = editor.getValue();
        const file = view.file;
        if (!file) return;

        const result = await this.processContent(content, file.path);

        if (result.modified) {
            editor.setValue(result.content);
            new Notice('File processed successfully.');
        } else {
            new Notice('No images to process or no changes made.');
        }

        if (result.errors.length > 0) {
            new Notice(`Encountered ${result.errors.length} errors. Check console or run Process All Files for a report.`);
            console.error('Processing Errors:', result.errors);
        }
    }

    async processAllFiles() {
        const files = this.app.vault.getMarkdownFiles();
        const totalFiles = files.length;
        if (totalFiles === 0) {
            new Notice('No markdown files found.');
            return;
        }

        new Notice(`Starting processing of ${totalFiles} files...`);

        let processedFilesCount = 0;
        let processedImagesCount = 0;
        let errorCount = 0;
        const allErrors: ProcessingError[] = [];

        // Concurrency control
        const CONCURRENCY_LIMIT = 5;
        const queue = [...files];
        let completedCount = 0;

        // Progress indicator update interval
        const updateProgress = () => {
            if (completedCount % 10 === 0 || completedCount === totalFiles) {
                new Notice(`Processing: ${completedCount}/${totalFiles} files...`, 2000);
            }
        };

        const worker = async () => {
            while (queue.length > 0) {
                const file = queue.shift();
                if (!file) break;

                try {
                    const content = await this.app.vault.read(file);
                    const result = await this.processContent(content, file.path);

                    if (result.modified) {
                        await this.app.vault.modify(file, result.content);
                        processedFilesCount++;
                        processedImagesCount += result.imagesProcessed;
                    }

                    if (result.errors.length > 0) {
                        allErrors.push(...result.errors);
                        errorCount += result.errors.length;
                    }

                } catch (e) {
                    errorCount++;
                    const msg = e instanceof Error ? e.message : String(e);
                    console.error(`Error processing file ${file.path}:`, e);
                    allErrors.push({
                        file: file.path,
                        error: msg,
                        timestamp: new Date().toISOString()
                    });
                } finally {
                    completedCount++;
                    updateProgress();
                }
            }
        };

        const workers = Array(Math.min(CONCURRENCY_LIMIT, totalFiles))
            .fill(null)
            .map(() => worker());

        await Promise.all(workers);

        // Generate Error Report
        if (allErrors.length > 0) {
            await this.generateErrorReport(allErrors);
        }

        // Final report
        let summary = `Finished processing. Files: ${processedFilesCount}, Images: ${processedImagesCount}.`;
        if (errorCount > 0) {
            summary += ` Errors: ${errorCount}. See processing_errors.md for details.`;
            new Notice(`Processing complete with ${errorCount} errors.`);
        } else {
            new Notice(summary);
        }
        console.log('Processing Summary:', summary);
    }

    async generateErrorReport(errors: ProcessingError[]) {
        const reportPath = 'processing_errors.md';
        let content = `# Processing Error Report\nGenerated at: ${new Date().toLocaleString()}\n\n`;
        content += `Total Errors: ${errors.length}\n\n`;
        content += `| File | Image Path | Error | Timestamp |\n`;
        content += `|------|------------|-------|-----------|\n`;

        for (const err of errors) {
            const imagePath = err.imagePath ? `\`${err.imagePath}\`` : 'N/A';
            // Escape pipes in error message to avoid breaking table
            const safeError = err.error.replace(/\|/g, '\\|').replace(/\n/g, ' ');
            content += `| [[${err.file}]] | ${imagePath} | ${safeError} | ${err.timestamp} |\n`;
        }

        const file = this.app.vault.getAbstractFileByPath(reportPath);
        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
        } else {
            await this.app.vault.create(reportPath, content);
        }
        new Notice(`Error report saved to ${reportPath}`);
    }

    // Shared content processing logic to handle regex and replacements safely
    async processContent(content: string, sourcePath: string): Promise<{ content: string, modified: boolean, imagesProcessed: number, errors: ProcessingError[] }> {
        // Regex to find images. 
        // Note: We use a loop with exec to find all matches and their indices.
        // We do NOT use global replace to avoid race conditions and ensure we replace the correct instance.
        // Improved regex to handle one level of nested parentheses in URL
        const imageRegex = /!\[(.*?)\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
        const wikiRegex = /!\[\[(.*?)\]\]/g;

        const matches: { start: number, end: number, full: string, alt: string, path: string, type: 'md' | 'wiki' }[] = [];
        let match;

        // Reset lastIndex just in case, though it's a new regex object each time here.
        imageRegex.lastIndex = 0;
        while ((match = imageRegex.exec(content)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                full: match[0],
                alt: match[1],
                path: match[2],
                type: 'md'
            });
        }

        wikiRegex.lastIndex = 0;
        while ((match = wikiRegex.exec(content)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                full: match[0],
                alt: '',
                path: match[1],
                type: 'wiki'
            });
        }

        if (matches.length === 0) {
            return { content, modified: false, imagesProcessed: 0, errors: [] };
        }

        // Sort matches by start index descending to replace from end to start
        matches.sort((a, b) => b.start - a.start);

        let newContent = content;
        let imagesProcessed = 0;
        let modified = false;
        const errors: ProcessingError[] = [];

        for (const m of matches) {
            // Skip if already R2 domain
            if (m.path.includes(this.settings.r2PublicDomain)) continue;

            const { path: cleanPath } = this.parseUrl(m.path);

            // Decode URI to handle encoded paths (e.g. %20)
            const decodedPath = decodeURI(cleanPath);

            try {
                const url = await this.processImage(decodedPath, sourcePath);
                if (url) {
                    // Replace the specific range in the string
                    const before = newContent.slice(0, m.start);
                    const after = newContent.slice(m.end);
                    // Use empty alt text as requested in previous context
                    newContent = before + `![](${url})` + after;
                    modified = true;
                    imagesProcessed++;
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`Failed to process image ${m.path} in ${sourcePath}:`, e);
                errors.push({
                    file: sourcePath,
                    imagePath: m.path,
                    error: msg,
                    timestamp: new Date().toISOString()
                });
                // Don't stop processing other images in the same file
            }
        }

        return { content: newContent, modified, imagesProcessed, errors };
    }

    async cleanUnusedImages() {
        new Notice('Cleaning unused images...');
        // 1. Scan all markdown, canvas, kanban
        const allFiles = this.app.vault.getFiles();
        const referencedImages = new Set<string>();

        for (const file of allFiles) {
            if (['md', 'canvas', 'kanban'].includes(file.extension)) {
                const content = await this.app.vault.read(file);

                if (file.extension === 'canvas') {
                    try {
                        const canvasData = JSON.parse(content);
                        if (canvasData.nodes) {
                            for (const node of canvasData.nodes) {
                                if (node.type === 'file' && node.file) {
                                    const resolved = this.app.metadataCache.getFirstLinkpathDest(node.file, file.path);
                                    if (resolved) referencedImages.add(resolved.path);
                                } else if (node.type === 'text' && node.text) {
                                    // Check text nodes for markdown links
                                    this.extractLinksFromText(node.text, file.path, referencedImages);
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Error parsing canvas file ${file.path}`, e);
                    }
                } else {
                    // Markdown / Kanban
                    this.extractLinksFromText(content, file.path, referencedImages);
                }
            }
        }

        // 2. Iterate attachments folder
        // 2. Scan for unused images in all folders matching the attachmentsFolder name
        const attachmentFolderName = this.settings.attachmentsFolder;
        let deletedCount = 0;

        for (const file of allFiles) {
            // Check if the file is located inside a folder with the configured name
            const pathParts = file.path.split('/');
            pathParts.pop(); // Remove filename

            // We check if any of the parent folders match the attachmentFolderName
            // This covers both root-level and nested attachments folders
            if (pathParts.includes(attachmentFolderName)) {
                if (!referencedImages.has(file.path)) {
                    console.log(`Moving unused image ${file.path} to Trash.`);
                    await this.app.vault.trash(file, true);
                    deletedCount++;
                }
            }
        }
        new Notice(`Moved ${deletedCount} unused images to Trash.`);
    }

    private extractLinksFromText(text: string, sourcePath: string, referencedImages: Set<string>) {
        const imageRegex = /!\[(.*?)\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
        const wikiRegex = /!\[\[(.*?)\]\]/g;

        let match;
        while ((match = imageRegex.exec(text)) !== null) {
            const link = match[2]; // Index 2 is the path now
            if (link) this.resolveAndAdd(link, sourcePath, referencedImages);
        }

        while ((match = wikiRegex.exec(text)) !== null) {
            const link = match[1];
            if (link) this.resolveAndAdd(link, sourcePath, referencedImages);
        }
    }

    private resolveAndAdd(link: string, sourcePath: string, referencedImages: Set<string>) {
        const { path } = this.parseUrl(link);
        const decodedPath = decodeURI(path);
        const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(decodedPath, sourcePath);
        if (resolvedFile) {
            referencedImages.add(resolvedFile.path);
        }
    }

    private parseUrl(url: string): { path: string, title: string } {
        const match = url.match(/^(\S+)(?:\s+(["'].*["']))?$/);
        if (match) {
            return { path: match[1], title: match[2] || '' };
        }
        return { path: url, title: '' };
    }

    async processImage(path: string, sourcePath: string): Promise<string | null> {
        let buffer: ArrayBuffer;
        let isRemote = false;

        if (path.startsWith('http')) {
            isRemote = true;
            console.log('Processing remote image:', path);
            try {
                const response = await requestUrl({ url: path });
                buffer = response.arrayBuffer;
            } catch (e) {
                throw new Error(`Failed to fetch remote image: ${e instanceof Error ? e.message : String(e)}`);
            }
        } else {
            const file = this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
            if (!file) {
                throw new Error(`Image not found locally: ${path}`);
            }
            buffer = await this.app.vault.readBinary(file);
        }

        // Compress
        const compressedBuffer = await this.imageProcessor.compressToWebP(buffer, this.settings.compressionQuality);

        // Calculate SHA-256 using Web Crypto API for better memory management
        const hashBuffer = await crypto.subtle.digest('SHA-256', compressedBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const filename = `${hash.substring(0, 12)}.webp`;

        // Upload
        const url = await this.s3Uploader.upload(compressedBuffer, filename, 'image/webp');
        return url;
    }
}

class CloudAssetMasterSettingTab extends PluginSettingTab {
    plugin: CloudAssetMasterPlugin;

    constructor(app: App, plugin: CloudAssetMasterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Cloud Asset Master Settings' });

        new Setting(containerEl)
            .setName('R2 Endpoint')
            .setDesc('Your Cloudflare R2 Endpoint URL')
            .addText(text => text
                .setPlaceholder('https://<accountid>.r2.cloudflarestorage.com')
                .setValue(this.plugin.settings.r2Endpoint)
                .onChange(async (value) => {
                    this.plugin.settings.r2Endpoint = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('R2 Region')
            .setDesc('Region (usually "auto" for R2)')
            .addText(text => text
                .setPlaceholder('auto')
                .setValue(this.plugin.settings.r2Region)
                .onChange(async (value) => {
                    this.plugin.settings.r2Region = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Access Key ID')
            .addText(text => text
                .setPlaceholder('Your Access Key ID')
                .setValue(this.plugin.settings.r2AccessKeyId)
                .onChange(async (value) => {
                    this.plugin.settings.r2AccessKeyId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Secret Access Key')
            .addText(text => text
                .setPlaceholder('Your Secret Access Key')
                .setValue(this.plugin.settings.r2SecretAccessKey)
                .onChange(async (value) => {
                    this.plugin.settings.r2SecretAccessKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Bucket Name')
            .addText(text => text
                .setPlaceholder('my-bucket')
                .setValue(this.plugin.settings.r2BucketName)
                .onChange(async (value) => {
                    this.plugin.settings.r2BucketName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Public Domain')
            .setDesc('The public domain for your R2 bucket (e.g. https://assets.mydomain.com)')
            .addText(text => text
                .setPlaceholder('https://assets.mydomain.com')
                .setValue(this.plugin.settings.r2PublicDomain)
                .onChange(async (value) => {
                    this.plugin.settings.r2PublicDomain = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Compression Quality')
            .setDesc('WebP compression quality (0.1 - 1.0)')
            .addSlider(slider => slider
                .setLimits(0.1, 1.0, 0.1)
                .setValue(this.plugin.settings.compressionQuality)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.compressionQuality = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Attachments Folder')
            .setDesc('Folder to scan for unused images')
            .addText(text => text
                .setPlaceholder('attachments')
                .setValue(this.plugin.settings.attachmentsFolder)
                .onChange(async (value) => {
                    this.plugin.settings.attachmentsFolder = value;
                    await this.plugin.saveSettings();
                }));
    }
}
