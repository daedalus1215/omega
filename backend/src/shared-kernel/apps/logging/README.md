# Logging Module

This module provides structured logging using Pino throughout the application.

## Usage

The logger is automatically available in all NestJS services, controllers, and providers via dependency injection.

### In Services/Controllers

```typescript
import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class MyService {
  constructor(private readonly logger: Logger) {}

  async doSomething() {
    this.logger.log('Doing something');
    this.logger.debug('Debug information');
    this.logger.warn('Warning message');
    this.logger.error('Error message', error.stack);
  }
}
```

### Log Levels

- `logger.log()` - Info level (default)
- `logger.debug()` - Debug level (only in development)
- `logger.warn()` - Warning level
- `logger.error()` - Error level

### Features

- **Development**: Pretty-printed, colorized logs with timestamps
- **Production**: JSON structured logs for log aggregation tools
- **HTTP Request Logging**: Automatically logs all HTTP requests/responses
- **Error Serialization**: Properly serializes errors with stack traces
- **Request Context**: Includes request ID, method, URL in logs

### Configuration

The logger is configured in `logging.module.ts` and respects the `NODE_ENV` environment variable:
- `development`: Pretty-printed logs with colors
- `production`/`test`: JSON structured logs
