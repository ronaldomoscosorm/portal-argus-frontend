import { describe, expect, it } from "vitest";
import { parseBulkUsersCsv, splitCsvLine, type BulkCatalog } from "./bulkUsersCsv";

const catalog: BulkCatalog = {
  apps: [
    { id: 1, code: "clearid", displayName: "ClearID", description: null, url: "", iconUrl: null, displayOrder: 1, isActive: true, createdAtUtc: "" },
    { id: 2, code: "argus", displayName: "Argus", description: null, url: "", iconUrl: null, displayOrder: 2, isActive: true, createdAtUtc: "" },
  ],
  roles: [{ id: 1, name: "Administrator" }],
  profilesByApp: {
    1: [
      { id: 10, applicationId: 1, name: "Administrator", description: null, isActive: true },
      { id: 11, applicationId: 1, name: "Operator", description: null, isActive: true },
    ],
    2: [{ id: 20, applicationId: 2, name: "Operator", description: null, isActive: true }],
  },
};

const options = { sendResetLink: true, defaultMfaMethod: "None" as const };

const site = (applicationId: number, clientId: number, siteId: number, clientName: string, siteName: string) => ({
  applicationId, clientId, siteId, clientName, siteName, createdAtUtc: "",
});
const catalogWithSites: BulkCatalog = {
  ...catalog,
  sitesByApp: {
    1: [site(1, 10, 100, "Corteva", "LA-BR-Alphaville"), site(1, 10, 101, "Corteva", "LA-BR-Itumbiara (ITU1)"), site(1, 20, 200, "Vylor", "Matriz")],
    2: [site(2, 20, 201, "Vylor", "LA-BR-Alphaville")],
  },
};

describe("splitCsvLine", () => {
  it("detecta o separador e respeita aspas", () => {
    expect(splitCsvLine('"Silva, Maria";maria@x.com;;;;;')).toEqual([
      "Silva, Maria", "maria@x.com", "", "", "", "", "",
    ]);
    expect(splitCsvLine("a\tb\tc")).toEqual(["a", "b", "c"]);
    expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });
});

describe("parseBulkUsersCsv", () => {
  it("ignora cabeçalho e linhas vazias e monta o item", () => {
    const rows = parseBulkUsersCsv(
      [
        "nome;email;telefone;mfa;senha;roles;aplicativos",
        "",
        "Maria;maria@x.com;+5511999990000;Email;;Administrator;clearid:Administrator|argus:Operator",
      ].join("\n"),
      catalog,
      options,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].line).toBe(3);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].item).toMatchObject({
      name: "Maria",
      userName: "maria@x.com",
      phoneNumber: "+5511999990000",
      mfaMethod: "Email",
      roles: ["Administrator"],
      applications: [
        { applicationCode: "clearid", profile: "Administrator" },
        { applicationCode: "argus", profile: "Operator" },
      ],
    });
  });

  it("normaliza maiúsculas de código, perfil e role", () => {
    const [row] = parseBulkUsersCsv("Ana;ana@x.com;;;;administrator;CLEARID:operator", catalog, options);
    expect(row.errors).toEqual([]);
    expect(row.item.roles).toEqual(["Administrator"]);
    expect(row.item.applications).toEqual([{ applicationCode: "clearid", profile: "Operator" }]);
  });

  it("acusa erros de validação por linha", () => {
    const rows = parseBulkUsersCsv(
      [
        ";email-invalido;;Totp;;Supervisor;xpto:Operator",
        "Ana;ana@x.com;;Sms;;;clearid:Gerente",
        "Ana 2;ana@x.com;;;;;clearid|clearid",
      ].join("\n"),
      catalog,
      options,
    );
    expect(rows[0].errors).toEqual(
      expect.arrayContaining([
        "Nome é obrigatório.",
        "E-mail inválido.",
        'Role "Supervisor" não existe.',
        'Aplicativo "xpto" não existe ou está inativo.',
      ]),
    );
    expect(rows[1].errors).toEqual(
      expect.arrayContaining([
        "Para SMS, informe um telefone E.164 (ex.: +5511999998888).",
        'Perfil "Gerente" não existe em "clearid".',
      ]),
    );
    expect(rows[2].errors).toEqual(
      expect.arrayContaining(["E-mail repetido no lote.", 'Aplicativo "clearid" repetido.']),
    );
  });

  it("exige senha quando o link não é enviado", () => {
    const [semSenha] = parseBulkUsersCsv("Ana;ana@x.com;;;;;", catalog, { ...options, sendResetLink: false });
    expect(semSenha.errors).toContain("Senha é obrigatória (mínimo 8 caracteres).");
    const [comSenha] = parseBulkUsersCsv("Ana;ana@x.com;;;Senha@123;;", catalog, { ...options, sendResetLink: false });
    expect(comSenha.errors).toEqual([]);
    expect(comSenha.item.password).toBe("Senha@123");
  });

  it("resolve os sites da mesma coluna separados por ; contra os aplicativos da linha", () => {
    const [row] = parseBulkUsersCsv(
      'Ana;ana@x.com;;;;;clearid:Operator;"LA-BR-Alphaville;la-br-itumbiara;Vylor:Matriz"',
      catalogWithSites,
      options,
    );
    expect(row.errors).toEqual([]);
    expect(row.item.sites).toEqual(["10:100", "10:101", "20:200"]);
  });

  it("aceita o rótulo da tela (Cliente - Site (código)) e ignora o código entre parênteses", () => {
    const [row] = parseBulkUsersCsv(
      'Ana;ana@x.com;;;;;clearid;"Corteva - LA-BR-Alphaville;Corteva-LA-BR-Itumbiara;corteva : la-br-itumbiara (itu1)"',
      catalogWithSites,
      options,
    );
    expect(row.errors).toEqual([]);
    expect(row.item.sites).toEqual(["10:100", "10:101"]);
  });

  it("acusa site inexistente ou ambíguo", () => {
    const [semApp] = parseBulkUsersCsv("Ana;ana@x.com;;;;;;LA-BR-Alphaville", catalogWithSites, options);
    expect(semApp.errors).toEqual([
      'Site "LA-BR-Alphaville" existe em mais de um cliente (Corteva, Vylor); use Cliente:Site.',
    ]);
    const [comApp] = parseBulkUsersCsv("Ana;ana@x.com;;;;;argus:Operator;Xpto|20:201", catalogWithSites, options);
    expect(comApp.errors).toEqual(['Site "Xpto" não está vinculado aos aplicativos concedidos.']);
    expect(comApp.item.sites).toEqual(["Xpto", "20:201"]);
  });

  it("usa o MFA padrão do lote para validar telefone", () => {
    const [row] = parseBulkUsersCsv("Ana;ana@x.com;;;;;", catalog, { ...options, defaultMfaMethod: "Sms" });
    expect(row.errors).toContain("Para SMS, informe um telefone E.164 (ex.: +5511999998888).");
    expect(row.item.mfaMethod).toBeNull();
  });
});
