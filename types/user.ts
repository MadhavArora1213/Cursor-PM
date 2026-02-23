export interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: 'pm' | 'eng' | 'design' | 'admin';
    preferences: {
        theme: 'light' | 'dark' | 'system';
        notifications: boolean;
        language: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
