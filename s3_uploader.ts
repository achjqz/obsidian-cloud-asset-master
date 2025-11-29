import { requestUrl, RequestUrlParam } from 'obsidian';


export interface S3Config {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicDomain: string;
}

export class S3Uploader {
    private config: S3Config;

    constructor(config: S3Config) {
        this.config = config;
    }

    async upload(fileBuffer: ArrayBuffer, key: string, contentType: string): Promise<string> {
        // 0. Check if file already exists
        const exists = await this.checkExists(key);
        if (exists) {
            console.log(`File ${key} already exists, skipping upload.`);
            const publicDomain = this.config.publicDomain.replace(/\/$/, '');
            return `${publicDomain}/${key}`;
        }

        const method = 'PUT';
        const endpoint = this.config.endpoint.replace(/\/$/, '');
        const url = `${endpoint}/${this.config.bucketName}/${key}`;
        const payloadHash = 'UNSIGNED-PAYLOAD';

        const headers = await this.getHeaders(method, key, payloadHash, contentType);

        const request: RequestUrlParam = {
            url: url,
            method: method,
            headers: headers,
            body: fileBuffer
        };

        try {
            const response = await requestUrl(request);
            if (response.status >= 200 && response.status < 300) {
                // Return the public URL
                const publicDomain = this.config.publicDomain.replace(/\/$/, '');
                return `${publicDomain}/${key}`;
            } else {
                throw new Error(`Upload failed with status ${response.status}: ${response.text}`);
            }
        } catch (error) {
            console.error("S3 Upload Error:", error);
            throw error;
        }
    }

    private async checkExists(key: string): Promise<boolean> {
        const method = 'HEAD';
        const endpoint = this.config.endpoint.replace(/\/$/, '');
        const url = `${endpoint}/${this.config.bucketName}/${key}`;
        const payloadHash = 'UNSIGNED-PAYLOAD'; // HEAD request has no body

        const headers = await this.getHeaders(method, key, payloadHash);

        const request: RequestUrlParam = {
            url: url,
            method: method,
            headers: headers,
            throw: false // Don't throw on 404
        };

        try {
            const response = await requestUrl(request);
            return response.status === 200;
        } catch (error) {
            console.warn(`Check exists failed for ${key}:`, error);
            return false;
        }
    }

    private async getHeaders(method: string, key: string, payloadHash: string, contentType?: string): Promise<Record<string, string>> {
        const service = 's3';
        const host = new URL(this.config.endpoint).host;

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substr(0, 8);

        // 1. Canonical Request
        const canonicalUri = `/${this.config.bucketName}/${key}`;
        const canonicalQuerystring = '';
        const canonicalHeaders =
            `host:${host}\n` +
            `x-amz-content-sha256:${payloadHash}\n` +
            `x-amz-date:${amzDate}\n`;
        const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

        const canonicalRequest =
            `${method}\n` +
            `${canonicalUri}\n` +
            `${canonicalQuerystring}\n` +
            `${canonicalHeaders}\n` +
            `${signedHeaders}\n` +
            `${payloadHash}`;

        // 2. String to Sign
        const algorithm = 'AWS4-HMAC-SHA256';
        const credentialScope = `${dateStamp}/${this.config.region}/${service}/aws4_request`;
        const canonicalRequestHash = await this.sha256(canonicalRequest);
        const stringToSign =
            `${algorithm}\n` +
            `${amzDate}\n` +
            `${credentialScope}\n` +
            `${canonicalRequestHash}`;

        // 3. Calculate Signature
        const signingKey = await this.getSignatureKey(this.config.secretAccessKey, dateStamp, this.config.region, service);
        const signatureBuffer = await this.hmac(signingKey, stringToSign);
        const signature = this.bufferToHex(signatureBuffer);

        // 4. Authorization Header
        const authorizationHeader =
            `${algorithm} Credential=${this.config.accessKeyId}/${credentialScope}, ` +
            `SignedHeaders=${signedHeaders}, ` +
            `Signature=${signature}`;

        const headers: Record<string, string> = {
            'Authorization': authorizationHeader,
            'x-amz-date': amzDate,
            'x-amz-content-sha256': payloadHash,
        };

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        return headers;
    }

    private async getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
        const kDate = await this.hmac("AWS4" + key, dateStamp);
        const kRegion = await this.hmac(kDate, regionName);
        const kService = await this.hmac(kRegion, serviceName);
        const kSigning = await this.hmac(kService, "aws4_request");
        return kSigning;
    }

    private async sha256(message: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return this.bufferToHex(hashBuffer);
    }

    private async hmac(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
        const enc = new TextEncoder();
        let keyData: ArrayBuffer;
        if (typeof key === 'string') {
            keyData = enc.encode(key).buffer;
        } else {
            keyData = key;
        }

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        return await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            enc.encode(message)
        );
    }

    private bufferToHex(buffer: ArrayBuffer): string {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
