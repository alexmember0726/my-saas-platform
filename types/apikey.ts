// types/apikey.ts

export interface ApiKey {
    id: string;
    name: string | null;
    // Note: 'key' and 'secret' are only returned on CREATE/ROTATE for one-time display
    key: string; 
    secret: string; 
    createdAt: string; // Using string to match JSON date format from API
    revoked: boolean; // Assuming this field is available or inferred
    // We'll also need 'last4' for display, but it's part of 'secret' in the list response
}

export interface ApiKeyListItem {
    id: string;
    name: string | null;
    // key/secret will be masked or show last 4 chars in the list view
    key: string; 
    secret: string; 
    createdAt: string;
    revoked: boolean;
}

export type NewApiKeyResponse = Pick<ApiKey, 'id' | 'name' | 'key' | 'secret' | 'createdAt'>;
export type RotateApiKeyResponse = Pick<ApiKey, 'id' | 'key' | 'secret'>;