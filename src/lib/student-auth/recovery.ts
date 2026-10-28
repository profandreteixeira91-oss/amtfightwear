// Recuperação de senha do Portal do Aluno — funções puras (testáveis).

/** Traduz mensagens do serviço de autenticação para português. */
export function translateRecoveryError(message: string): string {
  if (/different from the old password|same.*password/i.test(message))
    return "A nova senha precisa ser diferente da senha atual.";
  if (/pwned|weak|compromised|known to be/i.test(message))
    return "Esta senha aparece em vazamentos conhecidos ou é fraca. Escolha outra senha.";
  if (/at least \d+ characters|password should be/i.test(message))
    return "A senha não atende aos requisitos mínimos de segurança.";
  if (/only request this after|rate limit|too many/i.test(message))
    return "Muitas solicitações. Aguarde 1 minuto e tente novamente.";
  if (/session.*missing|not authenticated|jwt|expired|invalid.*token/i.test(message))
    return "O link de recuperação expirou. Solicite um novo e-mail.";
  if (/invalid.*email|email.*invalid/i.test(message))
    return "E-mail inválido. Verifique se foi digitado corretamente.";
  return message;
}

/** Lê erro devolvido pelo link do e-mail (#error=...&error_code=otp_expired). */
export function readRecoveryLinkError(hash: string, search = ""): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const code = params.get("error_code") ?? query.get("error_code");
  const error = params.get("error") ?? query.get("error");
  if (!code && !error) return null;
  if (code === "otp_expired") return "Este link de recuperação expirou ou já foi usado. Solicite um novo e-mail.";
  return "Link de recuperação inválido. Solicite um novo e-mail.";
}

/** Indica se a URL atual é um retorno de link de recuperação. */
export function isRecoveryLink(hash: string): boolean {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}
