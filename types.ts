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

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface MapSearchResult {
  text: string;
  links: GroundingLink[];
}