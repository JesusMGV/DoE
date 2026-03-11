"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ReactNode } from "react";

type AuthGuardProps = {
    children: ReactNode;
    fallback?: ReactNode;
    requiredRole?: string | string[];
};

export function CustomAuthGuard({
        children,
        fallback = <p>Please sign in.</p>,
        requiredRole
    }: AuthGuardProps) {
    const { isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();

    if (!isLoaded) {
        return <p>Loading...</p>;
    }
    if (!isSignedIn) {
        return <>{fallback}</>;
    }

    const userRole = user?.publicMetadata?.role as string | undefined;

    if (requiredRole) {
        const allowed = Array.isArray(requiredRole)
            ? requiredRole.includes(userRole ?? "")
            : userRole === requiredRole;

        if (!allowed) {
            return <p>Access denied. You do not have the required permissions.</p>;
        }
    }
    if (requiredRole && userRole !== requiredRole) {
        return <p>Access denied. You do not have the required permissions.</p>;
    }


    return <>{children}</>;
}