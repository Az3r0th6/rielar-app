import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import Color from 'color';
import { TwaManifest, TwaGenerator, ConsoleLog, BufferedLog } from '@bubblewrap/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const targetDir = path.join(rootDir, 'android-twa');
const publicDir = path.join(rootDir, 'public');

const JDK_PATH = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot';
const KEYTOOL_PATH = path.join(JDK_PATH, 'bin', 'keytool.exe');
const KEYSTORE_FILE = path.join(targetDir, 'android.keystore');
const KEY_ALIAS = 'rielar';
const KEY_PASS = 'rielar2026';

async function main() {
  console.log('🚀 [RielAR] Generando proyecto Android TWA (Trusted Web Activity)...');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Iniciar servidor HTTP efímero para servir iconos locales durante el templating
  const server = http.createServer((req, res) => {
    const filePath = path.join(publicDir, req.url.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mime = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'application/json';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const PORT = 8999;
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`📦 Servidor de iconos temporal activo en http://127.0.0.1:${PORT}`);

  try {
    // 2. Cargar manifest.json y crear TwaManifest
    const manifestJson = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));
    const twaManifest = await TwaManifest.fromWebManifestJson(
      new URL('https://rielar-app.onrender.com/manifest.json'),
      manifestJson
    );

    twaManifest.packageId = 'com.rielar.app';
    twaManifest.host = 'rielar-app.onrender.com';
    twaManifest.name = 'RielAR';
    twaManifest.launcherName = 'RielAR';
    twaManifest.themeColor = new Color('#009fe3');
    twaManifest.themeColorDark = new Color('#0a0a0c');
    twaManifest.navigationColor = new Color('#0a0a0c');
    twaManifest.navigationColorDark = new Color('#0a0a0c');
    twaManifest.navigationDividerColor = new Color('#1e293b');
    twaManifest.navigationDividerColorDark = new Color('#1e293b');
    twaManifest.backgroundColor = new Color('#0a0a0c');
    twaManifest.enableNotifications = true;
    twaManifest.generatorApp = 'bubblewrap';
    twaManifest.signingKey = {
      path: KEYSTORE_FILE,
      alias: KEY_ALIAS,
    };

    // Usar el servidor local temporal para descargar los iconos
    twaManifest.iconUrl = `http://127.0.0.1:${PORT}/icon-512.png`;
    twaManifest.maskableIconUrl = `http://127.0.0.1:${PORT}/icon-maskable-512.png`;

    const validation = twaManifest.validate();
    if (validation !== null) {
      throw new Error(`Error validando TWA Manifest: ${validation}`);
    }

    // 3. Crear proyecto Gradle Android
    console.log('⚙️ Creando estructura Gradle de Android TWA...');
    const twaGenerator = new TwaGenerator();
    const log = new BufferedLog(new ConsoleLog('TWA Builder'));
    await twaGenerator.createTwaProject(targetDir, twaManifest, log);
    log.flush();

    // 4. Restaurar URLs canónicas de producción en twa-manifest.json
    twaManifest.iconUrl = 'https://rielar-app.onrender.com/icon-512.png';
    twaManifest.maskableIconUrl = 'https://rielar-app.onrender.com/icon-maskable-512.png';
    await twaManifest.saveToFile(path.join(targetDir, 'twa-manifest.json'));
    console.log('✅ twa-manifest.json guardado con éxito');

    // 5. Generar o verificar Keystore
    if (!fs.existsSync(KEYSTORE_FILE)) {
      console.log('🔑 Generando clave de firma (Keystore) para Android...');
      const genCmd = `"${KEYTOOL_PATH}" -genkeypair -v -keystore "${KEYSTORE_FILE}" -alias "${KEY_ALIAS}" -keyalg RSA -keysize 2048 -validity 10000 -storepass "${KEY_PASS}" -keypass "${KEY_PASS}" -dname "CN=RielAR Developer, OU=Mobile Transit, O=RielAR, C=AR"`;
      execSync(genCmd, { stdio: 'pipe' });
      console.log(`✅ Keystore creado en: ${KEYSTORE_FILE}`);
    } else {
      console.log(`ℹ️ Keystore existente encontrado en: ${KEYSTORE_FILE}`);
    }

    // 6. Obtener huella digital SHA-256 para Digital Asset Links
    const listCmd = `"${KEYTOOL_PATH}" -list -v -keystore "${KEYSTORE_FILE}" -alias "${KEY_ALIAS}" -storepass "${KEY_PASS}"`;
    const listOutput = execSync(listCmd, { encoding: 'utf8' });
    const shaMatch = listOutput.match(/SHA256:\s*([A-Fa-f0-9:]+)/);

    if (shaMatch && shaMatch[1]) {
      const sha256Fingerprint = shaMatch[1].trim();
      console.log(`🔒 Huella Digital SHA-256: ${sha256Fingerprint}`);

      const wellKnownDir = path.join(publicDir, '.well-known');
      if (!fs.existsSync(wellKnownDir)) {
        fs.mkdirSync(wellKnownDir, { recursive: true });
      }

      const assetlinksContent = [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: 'com.rielar.app',
            sha256_cert_fingerprints: [sha256Fingerprint],
          },
        },
      ];

      fs.writeFileSync(
        path.join(wellKnownDir, 'assetlinks.json'),
        JSON.stringify(assetlinksContent, null, 2),
        'utf8'
      );
      console.log('✅ public/.well-known/assetlinks.json generado correctamente');
    }

    console.log('🎉 [RielAR] ¡Proyecto Android TWA listo en la carpeta android-twa/ !');
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('❌ Error generando Android TWA:', err);
  process.exit(1);
});
