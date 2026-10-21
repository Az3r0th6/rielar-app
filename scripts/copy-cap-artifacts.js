import fs from 'fs';
import path from 'path';
import os from 'os';

const type = process.argv[2] || 'debug'; // 'debug' | 'bundle' | 'release'

const tempBuildDir = path.join(os.tmpdir(), 'rielar-build', 'app', 'outputs');

if (type === 'debug') {
  const src = path.join(tempBuildDir, 'apk', 'debug', 'app-debug.apk');
  const dest = path.resolve('RielAR-v1.1.9-debug.apk');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[RielAR] APK debug copiado con éxito a ${dest}`);
  } else {
    console.error(`[RielAR] No se encontró el APK en ${src}`);
  }
} else if (type === 'bundle') {
  const src = path.join(tempBuildDir, 'bundle', 'release', 'app-release.aab');
  const dest = path.resolve('RielAR-v1.1.9.aab');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[RielAR] AAB release copiado con éxito a ${dest}`);
  } else {
    console.error(`[RielAR] No se encontró el AAB en ${src}`);
  }
} else if (type === 'release') {
  const src = path.join(tempBuildDir, 'apk', 'release', 'app-release.apk');
  const dest = path.resolve('RielAR-v1.1.9-release.apk');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[RielAR] APK release copiado con éxito a ${dest}`);
  } else {
    console.error(`[RielAR] No se encontró el APK en ${src}`);
  }
}
