import type {
  AccessProfileDto,
  ApplicationDto,
  ApplicationSiteDto,
  BulkUserItem,
  MfaMethod,
  RoleDto,
} from "@/api/types";
import { isE164 } from "@/lib/labels";

/** Colunas do CSV de cadastro em lote, na ordem esperada. */
export const BULK_CSV_HEADER = "nome;email;telefone;mfa;senha;roles;aplicativos;sites";

/**
 * Conteúdo do arquivo-modelo oferecido para download. Os sites ficam numa única
 * coluna separados por `;` — entre aspas, como o Excel grava uma célula que contém
 * o separador do arquivo.
 */
export const BULK_CSV_TEMPLATE = [
  BULK_CSV_HEADER,
  'Maria Silva;maria.silva@empresa.com;+5511999990000;Email;;;clearid:Administrator|argus:Operator;"LA-BR-Alphaville;LA-BR-Itumbiara"',
  "João Souza;joao.souza@empresa.com;;None;;Administrator;clearid:Operator;LA-BR-Alphaville",
].join("\n");

/** Limite de linhas por envio (espelha o backend). */
export const BULK_MAX_ROWS = 500;

const MFA_METHODS: MfaMethod[] = ["None", "Totp", "Email", "Sms"];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export interface BulkCatalog {
  apps: ApplicationDto[];
  roles: RoleDto[];
  profilesByApp: Record<number, AccessProfileDto[]>;
  /** Sites vinculados a cada aplicativo (ApplicationSites). */
  sitesByApp?: Record<number, ApplicationSiteDto[]>;
}

export interface BulkParseOptions {
  sendResetLink: boolean;
  defaultMfaMethod: MfaMethod;
}

export interface BulkParsedRow {
  /** Número da linha no texto original (base 1). */
  line: number;
  item: BulkUserItem;
  errors: string[];
}

/**
 * Converte o texto CSV em itens do lote e valida cada linha contra o catálogo
 * (aplicativos ativos, perfis por aplicativo e roles). Linhas em branco são
 * ignoradas; um cabeçalho na primeira linha é detectado e descartado.
 */
export function parseBulkUsersCsv(
  text: string,
  catalog: BulkCatalog,
  options: BulkParseOptions,
): BulkParsedRow[] {
  const rows: BulkParsedRow[] = [];
  const seenEmails = new Set<string>();

  text.split(/\r?\n/).forEach((line, idx) => {
    if (line.trim() === "") return;
    const cells = splitCsvLine(line);
    if (idx === 0 && isHeaderRow(cells)) return;

    const [name = "", email = "", phone = "", mfa = "", password = "", rolesText = "", appsText = "", sitesText = ""] = cells;
    const errors: string[] = [];
    const userName = email.trim().toLowerCase();

    if (!name.trim()) errors.push("Nome é obrigatório.");
    if (!userName) errors.push("E-mail é obrigatório.");
    else if (!EMAIL_RE.test(userName)) errors.push("E-mail inválido.");
    else if (seenEmails.has(userName)) errors.push("E-mail repetido no lote.");
    seenEmails.add(userName);

    let mfaMethod: MfaMethod | null = null;
    if (mfa.trim()) {
      const found = MFA_METHODS.find((m) => m.toLowerCase() === mfa.trim().toLowerCase());
      if (!found) errors.push(`MFA "${mfa.trim()}" inválido (None, Totp, Email ou Sms).`);
      else mfaMethod = found;
    }
    const effectiveMfa = mfaMethod ?? options.defaultMfaMethod;
    if (effectiveMfa === "Sms" && !isE164(phone)) {
      errors.push("Para SMS, informe um telefone E.164 (ex.: +5511999998888).");
    }

    if (!options.sendResetLink && password.trim().length < 8) {
      errors.push("Senha é obrigatória (mínimo 8 caracteres).");
    }

    const roles = splitList(rolesText).map((r) => {
      const role = catalog.roles.find((x) => x.name.toLowerCase() === r.toLowerCase());
      if (!role) errors.push(`Role "${r}" não existe.`);
      return role?.name ?? r;
    });

    const seenApps = new Set<string>();
    const applications = splitList(appsText).map((entry) => {
      const sep = entry.indexOf(":");
      const code = (sep >= 0 ? entry.slice(0, sep) : entry).trim();
      const profileName = sep >= 0 ? entry.slice(sep + 1).trim() : "";
      const app = catalog.apps.find((a) => a.code.toLowerCase() === code.toLowerCase());
      if (!app) {
        errors.push(`Aplicativo "${code}" não existe ou está inativo.`);
        return { applicationCode: code, profile: profileName || null };
      }
      if (seenApps.has(app.code)) errors.push(`Aplicativo "${app.code}" repetido.`);
      seenApps.add(app.code);

      let profile: string | null = null;
      if (profileName) {
        const found = (catalog.profilesByApp[app.id] ?? []).find(
          (p) => p.name.toLowerCase() === profileName.toLowerCase(),
        );
        if (!found) errors.push(`Perfil "${profileName}" não existe em "${app.code}".`);
        profile = found?.name ?? profileName;
      }
      return { applicationCode: app.code, profile };
    });

    const sites = resolveSites(sitesText, applications.map((a) => a.applicationCode), catalog, errors);

    rows.push({
      line: idx + 1,
      errors: Array.from(new Set(errors)),
      item: {
        name: name.trim(),
        userName,
        password: password.trim() || null,
        phoneNumber: phone.trim() || null,
        mfaMethod,
        isADEnabled: false,
        roles: Array.from(new Set(roles)),
        applications,
        sites,
      },
    });
  });

  return rows;
}

function isHeaderRow(cells: string[]): boolean {
  const first = cells[0]?.toLowerCase() ?? "";
  const second = cells[1]?.toLowerCase() ?? "";
  return first === "nome" || second === "email" || second === "e-mail";
}

/**
 * Divide a linha respeitando aspas duplas. O separador é detectado pela
 * primeira ocorrência: `;`, tabulação ou vírgula.
 */
export function splitCsvLine(line: string): string[] {
  const sep = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function splitList(text: string): string[] {
  return text
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Chaves de comparação de um nome de site: só letras e números, em minúsculas, para que
 * "Vylor - LA-BR-Alphaville (ALP-1)", "Vylor:LA-BR-Alphaville (ALP-1)" e "la-br-alphaville (alp-1)"
 * se equivalham; a segunda chave ignora um código entre parênteses no fim.
 */
function siteKeys(text: string): string[] {
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const full = norm(text);
  const noParen = norm(text.replace(/\s*\([^)]*\)\s*$/, ""));
  return full === noParen ? [full] : [full, noParen];
}

/** Lista de sites da coluna: separados por `;` (ou `|`). */
export function splitSites(text: string): string[] {
  return text
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Resolve cada site contra o catálogo dos aplicativos concedidos na linha (todos os ativos
 * quando a linha não concede aplicativo). Aceita o nome do site, `Cliente:Site` / `Cliente - Site`
 * pelos nomes (como a tela exibe) ou `clientId:siteId`. Devolve `clientId:siteId` para os resolvidos; os demais vão como
 * digitados e geram erro.
 */
function resolveSites(
  text: string,
  appCodes: string[],
  catalog: BulkCatalog,
  errors: string[],
): string[] {
  const entries = splitSites(text);
  if (entries.length === 0) return [];

  const scopedApps = appCodes.length
    ? catalog.apps.filter((a) => appCodes.some((c) => c.toLowerCase() === a.code.toLowerCase()))
    : catalog.apps;
  const seen = new Set<string>();
  const candidates: ApplicationSiteDto[] = [];
  for (const app of scopedApps) {
    for (const s of catalog.sitesByApp?.[app.id] ?? []) {
      const k = `${s.clientId}:${s.siteId}`;
      if (!seen.has(k)) {
        seen.add(k);
        candidates.push(s);
      }
    }
  }

  const out: string[] = [];
  for (const entry of entries) {
    const idMatch = /^(\d+)\s*:\s*(\d+)$/.exec(entry);
    let matches: ApplicationSiteDto[];
    if (idMatch) {
      matches = candidates.filter(
        (s) => s.clientId === Number(idMatch[1]) && s.siteId === Number(idMatch[2]),
      );
    } else {
      const wanted = siteKeys(entry);
      matches = candidates.filter((s) => {
        const site = s.siteName ?? "";
        const client = s.clientName ?? "";
        const keys = new Set([...siteKeys(site), ...siteKeys(`${client} ${site}`)]);
        return wanted.some((k) => keys.has(k));
      });
    }

    if (matches.length === 0) {
      errors.push(`Site "${entry}" não está vinculado aos aplicativos concedidos.`);
      out.push(entry);
    } else if (matches.length > 1) {
      const clients = matches.map((m) => m.clientName ?? String(m.clientId)).join(", ");
      errors.push(`Site "${entry}" existe em mais de um cliente (${clients}); use Cliente:Site.`);
      out.push(entry);
    } else {
      const key = `${matches[0].clientId}:${matches[0].siteId}`;
      if (!out.includes(key)) out.push(key);
    }
  }
  return out;
}
