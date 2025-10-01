export interface Event {
    id: string;
    projectId: string;
    name: string;
    metadata: Record<string, any> | null;
    createdAt: string; // ISO string format
}