"use client";

import { UserProfile } from "@/components/UserProfile";

export default function ProfilePage() {
    return (
        <div className="w-full h-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <UserProfile />
        </div>
    );
}
