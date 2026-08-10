declare module "garmin-connect-client" {
  export interface PersistedSession {
    cookies?: string;
    oauth2Token: {
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      refresh_token_expires_in: number;
      expires_at?: number;
      refresh_token_expires_at?: number;
    };
    diClientId: string;
  }

  export interface GarminConnectClient {
    getActivities(start?: number, limit?: number): Promise<
      Array<{
        activityId: number;
        activityType: { typeKey: string };
        startTimeLocal: string;
        duration: number;
        calories?: number;
        steps?: number;
        distance?: number;
      }>
    >;
    sleep: {
      getDailySleepData(
        date?: { toUTC: () => { toISODate: () => string | null } }
      ): Promise<unknown>;
    };
    getSession(): PersistedSession;
  }

  export interface LoginSuccess {
    mfaRequired: false;
    client: GarminConnectClient;
  }

  export interface MfaPending {
    mfaRequired: true;
    cookies: string;
  }

  export type LoginResult = LoginSuccess | MfaPending;

  export function login(config: {
    username: string;
    password: string;
  }): Promise<LoginResult>;
  export function login(pending: MfaPending, mfaCode: string): Promise<GarminConnectClient>;
  export function fromSession(session: PersistedSession): GarminConnectClient;
}
