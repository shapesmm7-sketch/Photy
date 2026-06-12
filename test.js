import https from 'https';

https.get('https://search.maven.org/solrsearch/select?q=g:com.arthenica+AND+a:ffmpeg-kit-full&core=gav&rows=100&wt=json', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => { console.log(data); });
}).on('error', err => { console.error(err); });
