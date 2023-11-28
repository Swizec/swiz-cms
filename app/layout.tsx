import React from "react";
import { Metadata } from "next";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}

export const metadata: Metadata = {
    title: "Swiz CMS",
    description: "Where good articles are born",
};
