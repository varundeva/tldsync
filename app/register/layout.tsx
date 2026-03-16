import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Register",
    description: "Create a new TLDsync account to start tracking, verifying, and managing your entire domain portfolio.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
