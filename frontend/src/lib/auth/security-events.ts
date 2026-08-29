export interface SecurityEvent {
  type: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  details?: Record<string, unknown>;
}

class SecurityEventLogger {
  private events: SecurityEvent[] = [];

  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(securityEvent);

    switch (securityEvent.type) {
      case 'AUTH_LOGIN_FAILURE':
      case 'AUTH_UNAUTHORIZED':
        console.warn(`[SecurityEvent] ${securityEvent.type}`, securityEvent);
        break;
      case 'AUTH_REFRESH_REUSE':
        console.error(`[SecurityEvent] ${securityEvent.type}`, securityEvent);
        break;
      default:
        console.info(`[SecurityEvent] ${securityEvent.type}`, securityEvent);
    }
  }

  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}

export const securityEventLogger = new SecurityEventLogger();
