import { S3Uploader } from '../s3_uploader';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { requestHistory, clearRequestHistory } from 'obsidian';

async function runTest() {
    // 1. Load credentials from dist/data.json
    const configPath = path.resolve('dist/data.json');
    if (!fs.existsSync(configPath)) {
        console.error(`Config file not found at ${configPath}`);
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const endpoint = config.r2Endpoint;
    const region = config.r2Region || 'auto';
    const accessKeyId = config.r2AccessKeyId;
    const secretAccessKey = config.r2SecretAccessKey;
    const bucketName = config.r2BucketName;
    const publicDomain = config.r2PublicDomain;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicDomain) {
        console.error('Missing credentials in dist/data.json');
        process.exit(1);
    }

    const uploader = new S3Uploader({
        endpoint,
        region,
        accessKeyId,
        secretAccessKey,
        bucketName,
        publicDomain
    });

    // Create a dummy image buffer (1x1 pixel transparent GIF)
    const dummyImage = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const key = `test-image-${Date.now()}.gif`;
    const contentType = 'image/gif';

    console.log(`\n--- Test 1: Initial Upload (${key}) ---`);
    clearRequestHistory();

    try {
        const url = await uploader.upload(dummyImage.buffer, key, contentType);
        console.log('Upload successful!');
        console.log('URL:', url);

        // Verify requests: Should have HEAD (404) then PUT (200)
        // Note: HEAD might return 404, which is fine, checkExists returns false
        const putRequest = requestHistory.find((r: any) => r.method === 'PUT');
        if (putRequest) {
            console.log('✅ Verified: PUT request was made.');
        } else {
            console.error('❌ Error: PUT request was NOT made.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Upload failed:', error);
        process.exit(1);
    }

    console.log(`\n--- Test 2: Deduplication Upload (${key}) ---`);
    clearRequestHistory();

    try {
        // Upload the same file again
        const url = await uploader.upload(dummyImage.buffer, key, contentType);
        console.log('Second upload call returned URL:', url);

        // Verify requests: Should have HEAD (200) and NO PUT
        const headRequest = requestHistory.find((r: any) => r.method === 'HEAD');
        const putRequest = requestHistory.find((r: any) => r.method === 'PUT');

        if (headRequest) {
            console.log('✅ Verified: HEAD request was made.');
        } else {
            console.error('❌ Error: HEAD request was NOT made.');
            process.exit(1);
        }

        if (!putRequest) {
            console.log('✅ Verified: PUT request was NOT made (Deduplication worked).');
        } else {
            console.error('❌ Error: PUT request WAS made (Deduplication failed).');
            process.exit(1);
        }

    } catch (error) {
        console.error('Second upload failed:', error);
        process.exit(1);
    }
}

runTest();
