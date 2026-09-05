import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicDirectory = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', publicDirectory), 'utf8');
const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
});

try {
    const page = await browser.newPage();
    for (const size of [32, 180]) {
        const data = await page.evaluate(async ({ svg, size }) => {
            const image = new Image();
            image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            canvas.getContext('2d').drawImage(image, 0, 0, size, size);
            return canvas.toDataURL('image/png').split(',')[1];
        }, { svg, size });
        const png = Buffer.from(data, 'base64');
        if (size === 180) {
            await writeFile(new URL('apple-touch-icon.png', publicDirectory), png);
            continue;
        }

        // ICO directory with one 32-bit PNG image.
        const header = Buffer.alloc(22);
        header.writeUInt16LE(1, 2);
        header.writeUInt16LE(1, 4);
        header[6] = header[7] = size;
        header.writeUInt16LE(1, 10);
        header.writeUInt16LE(32, 12);
        header.writeUInt32LE(png.length, 14);
        header.writeUInt32LE(22, 18);
        await writeFile(new URL('favicon.ico', publicDirectory), Buffer.concat([header, png]));
    }
    console.log(`Generated favicon assets in ${fileURLToPath(publicDirectory)}`);
} finally {
    await browser.close();
}
