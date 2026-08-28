import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// Served at /api/healthz — setGlobalPrefix('api') owns the prefix.
//
// Deliberately does NOT touch the database. This answers "is the process alive and serving
// HTTP", which is what a liveness probe should ask. A health check that queries Postgres
// turns one slow database into every container restarting at once.
//
// ⚠️ Traefik will not route to a container Docker reports unhealthy, so this endpoint is
//    what makes the app reachable at all. Everything 404s for the first 20-40 seconds
//    after a deploy — that is the healthcheck start_period, not a routing fault.
@ApiTags('health')
@Controller('healthz')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe' })
  check(): { status: string } {
    return { status: 'ok' };
  }
}
