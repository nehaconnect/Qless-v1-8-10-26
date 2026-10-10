import 'dotenv/config';

async function main() {
  const targetUrl = 'https://vercel.com/nehaconnects-projects/qless-v1-8-10-26/4rqpfcmfPbf7anpKCFftW7HFfzLu';
  const res = await fetch(targetUrl);
  const html = await textOrEmpty(res);

  const matches = html.match(/https:\/\/[a-zA-Z0-9\-\.]+\.vercel\.app/g) || [];
  const unique = Array.from(new Set(matches));

  console.log('Extracted vercel.app URLs:', unique);
}

async function textOrEmpty(res: Response) {
  try { return await res.text(); } catch { return ''; }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
