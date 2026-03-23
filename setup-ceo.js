const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// El email que queremos convertir en CEO
const CEO_EMAIL = 'felizdeemprender@gmail.com';

// Buscamos el archivo de credenciales en la carpeta actual
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌ ERROR: No se encontró el archivo "service-account.json".');
    console.log('\nPasos para solucionar esto:');
    console.log('1. Ve a Firebase Console -> Configuración del proyecto -> Cuentas de servicio.');
    console.log('2. Haz clic en "Generar nueva clave privada".');
    console.log('3. Descarga el archivo JSON y cámbiale el nombre a "service-account.json".');
    console.log('4. Colócalo en esta misma carpeta y vuelve a ejecutar: node setup-ceo.js\n');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function promoteToCeo() {
    console.log(`\n⏳ Procesando acceso para: ${CEO_EMAIL}...`);

    try {
        // 1. Buscar el usuario por email
        const userRecord = await auth.getUserByEmail(CEO_EMAIL);
        const uid = userRecord.uid;

        console.log(`✅ Usuario encontrado (UID: ${uid})`);

        // 2. Asignar Custom Claims (Role: CEO)
        // Esto es vital para que el frontend lo reconozca como tal
        await auth.setCustomUserClaims(uid, { role: 'CEO' });
        console.log('✅ Custom Claims (CEO) asignados correctamente.');

        // 3. Crear/Actualizar el perfil en Firestore
        await db.collection('users').doc(uid).set({
            email: CEO_EMAIL,
            role: 'CEO',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ Perfil en Firestore actualizado.');
        console.log('\n🚀 ¡LISTO! Ya puedes iniciar sesión y acceder a /ceo\n');

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`\n❌ ERROR: El usuario ${CEO_EMAIL} no existe en Firebase Authentication.`);
            console.log('Primero regístrate en la aplicación o créalo manualmente en la consola de Firebase.\n');
        } else {
            console.error('\n❌ ERROR INESPERADO:', error.message);
        }
    }
}

promoteToCeo();
