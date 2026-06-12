import https from 'https';

const req = https.get('https://repo1.maven.org/maven2/com/arthenica/ffmpeg-kit-video/6.0-2/ffmpeg-kit-video-6.0-2.pom', (res) => {
  console.log('ffmpeg-kit-video:', res.statusCode);
  process.exit(0);
});

req.on('error', (e) => {
  console.error(e);
  process.exit(1);
});




