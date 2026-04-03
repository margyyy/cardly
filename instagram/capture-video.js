const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const FPS = 30;
const DURATION = 7; // seconds
const TOTAL_FRAMES = FPS * DURATION;
const FRAMES_DIR = path.join(__dirname, 'frames');
const HTML_FILE = `file://${path.join(__dirname, 'video-launch.html')}`;
const OUTPUT = path.join(__dirname, 'export', 'launch-video.mp4');

if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR);
if (!fs.existsSync(path.join(__dirname, 'export'))) fs.mkdirSync(path.join(__dirname, 'export'));

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  await page.goto(HTML_FILE, { waitUntil: 'networkidle0' });

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 300));

  console.log(`Capturing ${TOTAL_FRAMES} frames at ${FPS}fps...`);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const framePath = path.join(FRAMES_DIR, `frame-${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath });

    // Advance animation by 1/FPS seconds
    await page.evaluate((ms) => {
      // Trick CSS into thinking time has passed by manually stepping
    }, 1000 / FPS);

    await new Promise(r => setTimeout(r, 1000 / FPS));

    if (i % 30 === 0) process.stdout.write(`  frame ${i}/${TOTAL_FRAMES}\n`);
  }

  await browser.close();

  console.log('Stitching video with ffmpeg...');
  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame-%04d.png" ` +
    `-vf "scale=1080:1920,format=yuv420p" ` +
    `-c:v libx264 -crf 18 -preset slow "${OUTPUT}"`,
    { stdio: 'inherit' }
  );

  // Cleanup frames
  fs.readdirSync(FRAMES_DIR).forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));
  fs.rmdirSync(FRAMES_DIR);

  console.log(`Done! Video saved to: ${OUTPUT}`);
})();
