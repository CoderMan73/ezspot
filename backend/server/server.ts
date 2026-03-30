import express from 'express';
import { waitForDatabase } from './db/connection';
import authRoutes from './routes/authRoutes';
import uploadRoutes from './routes/uploadRoutes';
import healthRoutes from './routes/healthRoutes';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { casStrategy } from './auth/casStrategy';
import { getSessionSecret } from './auth/authConfig';

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

/**
 * Resolves allowed CORS origins from a comma-separated environment variable.
 * @returns List of allowed origins from configuration.
 */
function getAllowedOrigins(): string[] {
    return (process.env.CORS_ALLOWED_ORIGINS || '')
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

const allowedOrigins = new Set(getAllowedOrigins());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);
app.use(express.json());

app.use(
  session({
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
  })
);

passport.use(casStrategy);
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', healthRoutes);

/**
 * Starts the API server after database is ready.
 */
async function startServer() {
    try {
        await waitForDatabase();

        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

        const shutdown = () => {
            console.log('Received shutdown signal, closing server...');
            server.close(() => {
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (err) {
        console.error('Startup failed:', err);
        process.exit(1);
    }
}

startServer();
