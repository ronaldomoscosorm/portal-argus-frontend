import { describe, expect, it } from "vitest";
import { isSafeReturnUrl, parseAllowedDomains } from "./jwt";

describe("parseAllowedDomains", () => {
  it("normaliza a lista", () => {
    expect(parseAllowedDomains(" .PortalArgus.com.br , rmtecho.com.br ,, ")).toEqual([
      "portalargus.com.br",
      "rmtecho.com.br",
    ]);
    expect(parseAllowedDomains(undefined)).toEqual([]);
  });
});

describe("isSafeReturnUrl", () => {
  const domains = ["portalargus.com.br", "rmtecho.com.br"];

  it("aceita path relativo, domínios permitidos e localhost", () => {
    expect(isSafeReturnUrl("/admin/users", domains)).toBe(true);
    expect(isSafeReturnUrl("https://portalargus.com.br/", domains)).toBe(true);
    expect(isSafeReturnUrl("https://clearid.portalargus.com.br/identities", domains)).toBe(true);
    expect(isSafeReturnUrl("https://clearid.rmtecho.com.br/", domains)).toBe(true);
    expect(isSafeReturnUrl("http://localhost:8080/", domains)).toBe(true);
  });

  it("recusa o que está fora da lista", () => {
    expect(isSafeReturnUrl("//evil.com", domains)).toBe(false);
    expect(isSafeReturnUrl("https://evil.com/", domains)).toBe(false);
    expect(isSafeReturnUrl("https://evilportalargus.com.br/", domains)).toBe(false);
    expect(isSafeReturnUrl("https://portalargus.com.br.evil.com/", domains)).toBe(false);
    expect(isSafeReturnUrl("https://clearid.rmtecho.com.br/", ["portalargus.com.br"])).toBe(false);
    expect(isSafeReturnUrl(null, domains)).toBe(false);
  });

  it("sem variável configurada, aceita o domínio novo e o antigo", () => {
    expect(isSafeReturnUrl("https://clearid.rmtecho.com.br/")).toBe(true);
    expect(isSafeReturnUrl("https://clearid.portalargus.com.br/")).toBe(true);
    expect(isSafeReturnUrl("https://clearid.exemplo.com.br/")).toBe(false);
  });
});
