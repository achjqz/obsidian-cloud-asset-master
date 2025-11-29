import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface RequestUrlParam {
    url: string;
    method?: string;
    contentType?: string;
    body?: string | ArrayBuffer;
    headers?: Record<string, string>;
    throw?: boolean;
}

export interface RequestUrlResponse {
    status: number;
    headers: Record<string, string>;
    text: string;
    arrayBuffer: ArrayBuffer;
    json: any;
}

export const requestHistory: { url: string, method: string, headers: Record<string, string> }[] = [];

export function clearRequestHistory() {
    requestHistory.length = 0;
}

export async function requestUrl(request: RequestUrlParam | string): Promise<RequestUrlResponse> {
    const reqOpts = typeof request === 'string' ? { url: request } : request;
    const urlStr = reqOpts.url;
    const method = reqOpts.method || 'GET';
    const headers = reqOpts.headers || {};
    const body = reqOpts.body;
    const shouldThrow = reqOpts.throw !== false;

    if (reqOpts.contentType) {
        headers['Content-Type'] = reqOpts.contentType;
    }

    requestHistory.push({
        url: urlStr,
        method: method,
        headers: { ...headers }
    });

    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlStr);
        const lib = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            method: method,
            headers: headers,
        };

        const req = lib.request(urlStr, options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const text = buffer.toString('utf-8');

                const response: RequestUrlResponse = {
                    status: res.statusCode || 0,
                    headers: res.headers as Record<string, string>,
                    text: text,
                    arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
                    json: null
                };

                try {
                    response.json = JSON.parse(text);
                } catch (e) {
                    // ignore
                }

                if (shouldThrow && (response.status < 200 || response.status >= 300)) {
                    reject(new Error(`Request failed, status ${response.status}: ${text}`));
                } else {
                    resolve(response);
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            if (typeof body === 'string') {
                req.write(body);
            } else if (body instanceof ArrayBuffer) {
                req.write(Buffer.from(body));
            }
        }

        req.end();
    });
}
