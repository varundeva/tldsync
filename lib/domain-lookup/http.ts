import { HttpInfo } from "./types";

export async function fetchHttpInfo(domain: string): Promise<HttpInfo | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`https://${domain}`, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "DomainTracker/1.0",
            },
        });

        clearTimeout(timeoutId);

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });

        return {
            statusCode: response.status,
            redirectUrl: response.redirected ? response.url : null,
            headers,
            server: headers["server"] || null,
            poweredBy: headers["x-powered-by"] || null,
            securityHeaders: {
                strictTransportSecurity: headers["strict-transport-security"] || null,
                contentSecurityPolicy: headers["content-security-policy"] || null,
                xFrameOptions: headers["x-frame-options"] || null,
                xContentTypeOptions: headers["x-content-type-options"] || null,
                referrerPolicy: headers["referrer-policy"] || null,
                permissionsPolicy: headers["permissions-policy"] || null,
            },
        };
    } catch {
        // Try HTTP fallback
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const response = await fetch(`http://${domain}`, {
                method: "HEAD",
                redirect: "follow",
                signal: controller.signal,
                headers: {
                    "User-Agent": "DomainTracker/1.0",
                },
            });

            clearTimeout(timeoutId);

            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });

            return {
                statusCode: response.status,
                redirectUrl: response.redirected ? response.url : null,
                headers,
                server: headers["server"] || null,
                poweredBy: headers["x-powered-by"] || null,
                securityHeaders: {
                    strictTransportSecurity: headers["strict-transport-security"] || null,
                    contentSecurityPolicy: headers["content-security-policy"] || null,
                    xFrameOptions: headers["x-frame-options"] || null,
                    xContentTypeOptions: headers["x-content-type-options"] || null,
                    referrerPolicy: headers["referrer-policy"] || null,
                    permissionsPolicy: headers["permissions-policy"] || null,
                },
            };
        } catch {
            return null;
        }
    }
}
