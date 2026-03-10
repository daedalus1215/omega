import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  UserAggregator,
  UserProjection,
} from '../../users/domain/aggregators/user.aggregator';
import type { FailedLoginContext } from '../../security-events/domain/aggregators/security-event.aggregator';
import { SecurityEventAggregator } from '../../security-events/domain/aggregators/security-event.aggregator';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userAggregator: UserAggregator,
    private readonly jwtService: JwtService,
    private readonly securityEventAggregator: SecurityEventAggregator
  ) {}

  async validateUser(
    username: string,
    password: string
  ): Promise<UserProjection | null> {
    const user = await this.userAggregator.findByUsernameForAuth(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Attempt login with security event logging on failure.
   * Called by LoginAction - service orchestrates aggregator for cross-domain logging.
   */
  async attemptLogin(
    username: string,
    password: string,
    context: FailedLoginContext
  ): Promise<{ access_token: string }> {
    const user = await this.validateUser(username, password);
    if (!user) {
      await this.securityEventAggregator.logFailedLogin(context);
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.login(user);
  }

  async login(user: UserProjection) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
