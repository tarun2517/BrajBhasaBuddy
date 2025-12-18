export interface GeoLocation {
  lat: number;
  lng: number;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface MapSearchResult {
  summary: string;
  places?: Array<{
    name: string;
    address?: string;
  }>;
}