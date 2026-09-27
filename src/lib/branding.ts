/**
 * Configuração de marca (branding) do Portal Argus.
 *
 * Toda customização visual passa por aqui. Os valores vêm do `.env` para que
 * o mesmo build sirva ambientes diferentes só trocando o env file.
 */

import clientLogo from "@/assets/client-logo.svg";
import rmtechoLogo from "@/assets/rmtecho-logo.png";

export type Branding = {
  /** Nome exibido no header e no <title>. */
  clientName: string;
  /** Cor primária em hex (para uso fora do Tailwind, ex: charts). */
  primaryHex: string;
  /** Logo do produto (Portal Argus). */
  clientLogo: string;
  /** Logo R&M Tecnologia para o "Powered by" do footer. */
  rmtechoLogo: string;
  /** URL do site R&M para o link "Powered by". */
  rmtechoUrl: string;
};

export const branding: Branding = {
  clientName: import.meta.env.VITE_CLIENT_NAME || "Portal Argus",
  primaryHex: `#${import.meta.env.VITE_BRAND_PRIMARY_HEX || "0F2840"}`,
  clientLogo,
  rmtechoLogo,
  rmtechoUrl: "https://rmtecho.com.br",
};
