// Registry central de gateways disponíveis para o AMT Pay.
// Motor financeiro pede por id; adapters ficam isolados.
import type { GatewayId, PaymentGateway } from "./gateway";
import { asaasGateway } from "./asaas-gateway.server";

const REGISTRY: Partial<Record<GatewayId, PaymentGateway>> = {
  asaas: asaasGateway,
};

export function getGateway(id: GatewayId): PaymentGateway {
  const gw = REGISTRY[id];
  if (!gw) throw new Error(`Gateway '${id}' não registrado no AMT Pay.`);
  return gw;
}

export function listAvailableGateways(): { id: GatewayId; name: string }[] {
  return Object.values(REGISTRY)
    .filter((g): g is PaymentGateway => Boolean(g))
    .map((g) => ({ id: g.id, name: g.displayName }));
}
