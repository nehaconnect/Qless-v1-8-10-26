import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\sande\\.gemini\\antigravity-ide\\brain\\8753ca50-1d6d-4ffb-baa7-efa5786db050';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Helper to delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class CDPClient {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();

  async connect(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
    });

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      } catch {}
    };
  }

  send(method: string, params: Record<string, any> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function loginUser(username: string, password = 'password123') {
  const res = await fetch('http://localhost:3000/api/auth/sign-in/username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(`Failed to login as ${username}: ${res.statusText}`);
  }

  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  let sessionToken = '';
  for (const c of cookies) {
    const match = c.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/);
    if (match) {
      sessionToken = match[1];
      break;
    }
  }

  if (!sessionToken) {
    // Check raw-cookie
    const raw = res.headers.get('set-cookie') || '';
    const match = raw.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/);
    if (match) sessionToken = match[1];
  }

  return sessionToken;
}

async function captureScreen(
  client: CDPClient,
  sessionToken: string,
  outputPath: string,
  expectedRole: string
) {
  console.log(`Setting up session for ${expectedRole}...`);
  // Clear existing cookies
  await client.send('Network.clearBrowserCookies');

  // Set the Better Auth session token
  await client.send('Network.setCookie', {
    name: 'better-auth.session_token',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
  });

  // Navigate to localhost:3000
  console.log(`Navigating to http://localhost:3000 for ${expectedRole}...`);
  await client.send('Page.navigate', { url: 'http://localhost:3000' });

  // Wait for loading to finish and IdentityBar to appear
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const evalRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const bar = document.querySelector('[data-testid="identity-bar"]');
        if (!bar) return null;
        return {
          found: true,
          text: bar.innerText
        };
      })()`,
      returnByValue: true,
    });

    if (evalRes?.result?.value?.found) {
      console.log(`IdentityBar detected for ${expectedRole}:`, evalRes.result.value.text.replace(/\n/g, ' '));
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.warn(`Warning: IdentityBar selector not found within timeout for ${expectedRole}, continuing anyway...`);
  }

  // Extra settle time for images/fonts
  await sleep(1500);

  // Capture screenshot
  const screenshotData = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });

  const buffer = Buffer.from(screenshotData.data, 'base64');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved screenshot to ${outputPath} (${buffer.length} bytes)`);
}

async function main() {
  const port = 9223;
  const tempProfileDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile');
  if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
  }

  console.log('Launching headless Chrome...');
  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${tempProfileDir}`,
      '--window-size=1400,900',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  // Wait for remote debugging to be responsive
  let versionData: any = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://localhost:${port}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
  }

  if (!versionData) {
    chromeProc.kill();
    throw new Error('Chrome remote debugging did not respond.');
  }

  console.log('Chrome responsive, creating target page...');
  const targetRes = await fetch(`http://localhost:${port}/json/new?about:blank`, { method: 'PUT' });
  const targetData = await targetRes.json();
  const wsUrl = targetData.webSocketDebuggerUrl;

  const client = new CDPClient();
  await client.connect(wsUrl);

  // Enable necessary domains
  await client.send('Page.enable');
  await client.send('Network.enable');
  await client.send('Runtime.enable');

  try {
    // 1. Seller: slr/soman_singh
    console.log('\n--- 1. Authenticating as Seller (Soman Singh) ---');
    const sellerToken = await loginUser('slr/soman_singh', 'password123');
    await captureScreen(
      client,
      sellerToken,
      path.join(ARTIFACT_DIR, 'seller_screen_identity_bar.png'),
      'SELLER'
    );

    // 2. Customer: ctr/siya_sen
    console.log('\n--- 2. Authenticating as Customer (Siya Sen) ---');
    const customerToken = await loginUser('ctr/siya_sen', 'password123');
    await captureScreen(
      client,
      customerToken,
      path.join(ARTIFACT_DIR, 'customer_screen_identity_bar.png'),
      'CUSTOMER'
    );

    // 3. Admin: adm/admin_qless
    console.log('\n--- 3. Authenticating as Admin (Admin QLess) ---');
    const adminToken = await loginUser('adm/admin_qless', 'password123');
    await captureScreen(
      client,
      adminToken,
      path.join(ARTIFACT_DIR, 'admin_screen_identity_bar.png'),
      'ADMIN'
    );

    console.log('\n All three screen screenshots captured successfully!');
  } finally {
    client.close();
    chromeProc.kill();
  }
}

main().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
