import "server-only";
import { importPKCS8, SignJWT } from "jose";

// JWT RS256 exigido pela Enable Banking em todos os pedidos.
// A chave privada NUNCA sai do servidor.
export async function criarJwtEb(): Promise<string> {
  const applicationId = process.env.EB_APPLICATION_ID;
  const privateKeyPem = process.env.EB_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!applicationId || !privateKeyPem) {
    throw new Error(
      "EB_APPLICATION_ID e EB_PRIVATE_KEY têm de estar definidos no ambiente"
    );
  }

  const key = await importPKCS8(privateKeyPem, "RS256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: applicationId })
    .setIssuer("enablebanking.com")
    .setAudience("api.enablebanking.com")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

export function ebConfigurado(): boolean {
  return Boolean(process.env.EB_APPLICATION_ID && process.env.EB_PRIVATE_KEY);
}
