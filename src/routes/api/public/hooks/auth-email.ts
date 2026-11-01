import * as React from "react";
import { render } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { SignupEmail } from "@/lib/email-templates/signup";
import { EmailSendError, sendEmail } from "@/lib/email/provider.server";
import { verifyStandardWebhook } from "@/lib/security/standard-webhooks.server";

/**
 * Send Email Hook do Supabase Auth (substitui /lovable/email/auth/webhook).
 *
 * Configurar em Authentication → Hooks → Send Email (HTTPS) apontando para
 * https://<domínio>/api/public/hooks/auth-email e guardar o segredo gerado
 * ("v1,whsec_...") em SEND_EMAIL_HOOK_SECRET.
 */

const SITE_NAME = process.env.EMAIL_SITE_NAME || "AMT Marketing";
const SITE_URL = process.env.SITE_URL || "https://amtfightwear.com.br";

type HookPayload = {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
  };
};

type OutgoingAuthEmail = { to: string; subject: string; element: React.ReactElement };

function verifyUrl(tokenHash: string, type: string, redirectTo: string): string {
  const base = `${process.env.SUPABASE_URL}/auth/v1/verify`;
  const params = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo });
  return `${base}?${params.toString()}`;
}

function buildEmails({ user, email_data: d }: HookPayload): OutgoingAuthEmail[] | null {
  const url = (hash: string) => verifyUrl(hash, d.email_action_type, d.redirect_to || SITE_URL);
  switch (d.email_action_type) {
    case "signup":
      return [{
        to: user.email,
        subject: "Confirm your email",
        element: React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: user.email,
          confirmationUrl: url(d.token_hash),
        }),
      }];
    case "invite":
      return [{
        to: user.email,
        subject: "You've been invited",
        element: React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: url(d.token_hash),
        }),
      }];
    case "magiclink":
      return [{
        to: user.email,
        subject: "Your login link",
        element: React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl: url(d.token_hash) }),
      }];
    case "recovery":
      return [{
        to: user.email,
        subject: "Redefinição de senha",
        element: React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl: url(d.token_hash) }),
      }];
    case "email_change": {
      const newEmail = user.new_email ?? "";
      const make = (to: string, hash: string) => ({
        to,
        subject: "Confirm your new email",
        element: React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: d.old_email ?? user.email,
          email: user.email,
          newEmail,
          confirmationUrl: url(hash),
        }),
      });
      // Nomes invertidos por compatibilidade (docs do Supabase): token_hash_new vai
      // para o e-mail ATUAL e token_hash para o NOVO. Sem "Secure email change",
      // só existe token_hash e um único e-mail para o endereço novo.
      if (d.token_hash_new) return [make(user.email, d.token_hash_new), make(newEmail, d.token_hash)];
      return [make(newEmail || user.email, d.token_hash)];
    }
    case "reauthentication":
      return [{
        to: user.email,
        subject: "Your verification code",
        element: React.createElement(ReauthenticationEmail, { token: d.token ?? "" }),
      }];
    default:
      return null;
  }
}

export const Route = createFileRoute("/api/public/hooks/auth-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await verifyStandardWebhook(request, process.env.SEND_EMAIL_HOOK_SECRET);
        if (body === null) {
          return Response.json({ error: { http_code: 401, message: "Invalid signature" } }, { status: 401 });
        }

        let payload: HookPayload;
        try {
          payload = JSON.parse(body) as HookPayload;
        } catch {
          return Response.json({ error: { http_code: 400, message: "Invalid JSON" } }, { status: 400 });
        }

        const emails = buildEmails(payload);
        if (!emails) {
          // Notificações (*_notification) e tipos sem template: nada a enviar.
          return Response.json({});
        }

        try {
          for (const email of emails.filter((e) => e.to)) {
            const html = await render(email.element);
            const text = await render(email.element, { plainText: true });
            await sendEmail({
              to: email.to,
              subject: email.subject,
              html,
              text,
              tag: `auth-${payload.email_data.email_action_type}`,
            });
          }
        } catch (error) {
          console.error("[auth-email] send failed", error);
          const status = error instanceof EmailSendError && !error.retryable ? 400 : 500;
          return Response.json({ error: { http_code: status, message: "Failed to send email" } }, { status });
        }

        return Response.json({});
      },
    },
  },
});
