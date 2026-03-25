import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache;
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

const cached = global._mongooseCache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log('[db] Réutilisation de la connexion MongoDB existante');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('[db] Nouvelle connexion MongoDB en cours...');
    cached.promise = mongoose.connect(process.env.MONGODB_URI!, {
      bufferCommands: false,
    });
  } else {
    console.log('[db] Connexion MongoDB en attente (promise déjà en cours)');
  }

  try {
    cached.conn = await cached.promise;
    console.log('[db] Connexion MongoDB établie avec succès');
  } catch (err) {
    cached.promise = null;
    console.error('[db] Échec de connexion MongoDB :', err);
    throw err;
  }

  return cached.conn;
}
