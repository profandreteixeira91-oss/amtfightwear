import { describe, expect, it } from "vitest";
import { readRecoveryLinkError, translateRecoveryError, isRecoveryLink } from "./recovery";

describe("recuperação de senha do aluno", () => {
  it("link vencido mostra mensagem de expiração", () => {
    expect(readRecoveryLinkError("#error=access_denied&error_code=otp_expired")).toMatch(/expirou/);
  });
  it("link válido não gera erro", () => {
    expect(readRecoveryLinkError("#access_token=x&type=recovery")).toBeNull();
    expect(isRecoveryLink("#access_token=x&type=recovery")).toBe(true);
  });
  it("senha igual à anterior é traduzida", () => {
    expect(translateRecoveryError("New password should be different from the old password.")).toBe(
      "A nova senha precisa ser diferente da senha atual.",
    );
  });
  it("limite de envio é traduzido", () => {
    expect(translateRecoveryError("For security purposes, you can only request this after 42 seconds.")).toMatch(/Aguarde/);
  });
});
