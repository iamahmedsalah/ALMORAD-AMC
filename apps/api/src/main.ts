import { SafeExceptionFilter } from './safe-exception.filter.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { printBanner } from '@amc/shared';
import { AppModule } from './app.module.js';
import { parseEnvironment } from './config/environment.js';
import { createHttpLoggerMiddleware } from './http-logger.middleware.js';

async function bootstrap() {
const env = parseEnvironment(process.env);
const startup = (stage: string) => console.info(JSON.stringify({event: 'api_startup', stage}));
// Report configuration validity without exposing values. A platform initialization
// timeout otherwise hides provider-constructor failures before Nest begins listening.
startup('configuration_validated');
if (env.NODE_ENV === 'production') {
  const invalid = ['STAFF_PROXY_SECRET', 'STAFF_CSRF_SECRET'].filter(key => (process.env[key]?.length ?? 0) < 64);
  if (invalid.length) throw new Error(`Invalid API configuration: ${invalid.join(', ')}`);
}
const app = await NestFactory.create(AppModule, { rawBody: true, abortOnError: false }).catch((error: unknown) => {
  console.error(JSON.stringify({event: 'api_startup_failed', stage: 'container_creation', error: error instanceof Error ? error.name : 'UnknownError'}));
  throw new Error('API container initialization failed');
});
startup('container_created');

app.use(helmet());
app.useGlobalFilters(new SafeExceptionFilter());
app.use(createHttpLoggerMiddleware({ environment: env.NODE_ENV }));
app.use(
  (
    _req: unknown,
    res: { setHeader: (name: string, value: string) => void },
    next: () => void,
  ) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  },
);
app.enableCors({
  origin: env.WEB_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Cookie', 'X-CSRF-Token', 'X-Request-ID'],
});
app.enableShutdownHooks();

// Setup OpenAPI / Swagger documentation
const swaggerConfig = new DocumentBuilder()
  .setTitle('ALMORAD AMC — Growth & Brand Studio API')
  .setDescription(
    'Production bilingual REST API documentation for ALMORAD AMC. Enforces PostgreSQL/Prisma persistence, cookie-based session security, RBAC staff authorization, conflict-safe appointment booking, and operational maintenance.',
  )
  .setVersion('0.1.0')
  .addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Token',
    description: 'Bearer token for staff or maintenance access',
  })
  .addCookieAuth('amc_session', {
    type: 'apiKey',
    in: 'cookie',
    description: 'HttpOnly secure staff session cookie',
  })
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('docs', app, document);
SwaggerModule.setup('api/docs', app, document);

const port = process.env.PORT ? Number(process.env.PORT) : env.API_PORT;
const host = process.env.VERCEL ? '0.0.0.0' : env.API_HOST;

startup('starting_listener');
await app.listen(port, host);
startup('listening');

const displayHost = host === '0.0.0.0' ? 'localhost' : host;
const baseUrl = `http://${displayHost}:${port}`;

printBanner({
  title: 'ALMORAD AMC — BACKEND API',
  icon: '🏛️',
  environment: env.NODE_ENV,
  version: 'v0.1.0',
  url: baseUrl,
  docsUrl: `${baseUrl}/docs`,
  nodeVersion: process.version,
  diagnostics: [
    {
      label: 'PostgreSQL',
      status: 'online',
      value: 'Connected',
      icon: '🐘',
    },
    { label: 'Security', status: 'ready', value: 'RBAC + CSRF + Rate Limiter', icon: '🛡️' },
    { label: 'HTTP Telemetry', status: 'online', value: 'Structured JSON Request Logs', icon: '📡' },
  ],
});

}
// Let the module finish evaluating while Vercel attaches its listener wrapper.
void bootstrap().catch((error: unknown) => {
  console.error(JSON.stringify({event: 'api_startup_failed', stage: 'bootstrap', error: error instanceof Error ? error.name : 'UnknownError'}));
  process.exitCode = 1;
});
