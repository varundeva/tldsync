import tls from "tls";
import { SslInfo } from "./types";

export async function fetchSslInfo(hostname: string): Promise<SslInfo | null> {
    return new Promise((resolve) => {
        try {
            const socket = tls.connect(
                443,
                hostname,
                { servername: hostname, rejectUnauthorized: false },
                () => {
                    try {
                        const cert = socket.getPeerCertificate(true);
                        const protocol = socket.getProtocol() || "unknown";
                        socket.end();

                        const altNames: string[] = [];
                        if (cert.subjectaltname) {
                            const parts = cert.subjectaltname.split(", ");
                            for (const part of parts) {
                                if (part.startsWith("DNS:")) {
                                    altNames.push(part.substring(4));
                                }
                            }
                        }

                        resolve({
                            issuer:
                                typeof cert.issuer === "object"
                                    ? cert.issuer.O || cert.issuer.CN || JSON.stringify(cert.issuer)
                                    : String(cert.issuer),
                            subject:
                                typeof cert.subject === "object"
                                    ? cert.subject.CN || JSON.stringify(cert.subject)
                                    : String(cert.subject),
                            validFrom: cert.valid_from || "",
                            validTo: cert.valid_to || "",
                            serialNumber: cert.serialNumber || "",
                            fingerprint256: cert.fingerprint256 || "",
                            altNames,
                            protocol,
                        });
                    } catch {
                        socket.end();
                        resolve(null);
                    }
                }
            );

            socket.on("error", () => resolve(null));
            socket.setTimeout(3000, () => {
                socket.destroy();
                resolve(null);
            });
        } catch {
            resolve(null);
        }
    });
}
