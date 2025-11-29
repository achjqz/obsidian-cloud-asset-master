import * as esbuild from 'esbuild';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function buildAndRun() {
    const outfile = 'dist/test_bundle.js';

    try {
        await esbuild.build({
            entryPoints: ['test/test_upload.ts'],
            bundle: true,
            platform: 'node',
            outfile: outfile,
            external: ['obsidian'], // We will alias this via plugin or just let it resolve to our mock if we can
            plugins: [{
                name: 'alias-obsidian',
                setup(build) {
                    build.onResolve({ filter: /^obsidian$/ }, args => {
                        return { path: path.resolve('test/mock_obsidian.ts') }
                    });
                },
            }],
        });

        console.log('Build successful. Running test...');

        // Execute the bundle
        // Pass through environment variables
        const child = exec(`node ${outfile}`, { env: process.env });

        child.stdout.on('data', (data) => console.log(data.toString()));
        child.stderr.on('data', (data) => console.error(data.toString()));

        child.on('close', (code) => {
            console.log(`Test process exited with code ${code}`);
            if (code !== 0) process.exit(code);
        });

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

buildAndRun();
