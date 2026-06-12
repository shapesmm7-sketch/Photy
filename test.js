import https from 'https';

https.get('https://repo1.maven.org/maven2/com/arthenica/ffmpeg-kit-full/6.0-2/ffmpeg-kit-full-6.0-2.pom', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  console.log('6.0-2:', res.statusCode);
}).on('error', err => { console.error(err); });

https.get('https://repo1.maven.org/maven2/com/arthenica/ffmpeg-kit-full/5.1.LTS/ffmpeg-kit-full-5.1.LTS.pom', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  console.log('5.1.LTS:', res.statusCode);
}).on('error', err => { console.error(err); });
