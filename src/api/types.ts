/**
 * Tipos do contrato consumido via BFF (PortalArgus.Api).
 * Todas as respostas vêm no shape plano (envelope já desembrulhado pelo BFF).
 * Ref.: docs/PRD-Frontend-PortalArgus.md §7.
 */

/** Método de segundo fator suportado pela ArthosMFA. */
export type MfaMethod = "None" | "Totp" | "Email" | "Sms";

/** Canal de envio de código para MFA/reset por mensagem. */
export type OtpChannel = "Email" | "Sms";

// ----------------------------------------------------------------------------
// Autenticação
// ----------------------------------------------------------------------------

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string | null;
  mfaRequired: boolean;
  /** Método de MFA exigido, quando aplicável (Totp/Email/Sms). */
  mfaMethod?: MfaMethod | null;
  mfaToken: string | null;
  /** QR code (base64/data-uri) para setup do app autenticador. */
  qrCode: string | null;
  token: string | null;
  refreshToken: string | null;
}

export interface VerifyMfaRequest {
  mfaToken: string;
  mfaCode: string;
}

/** Solicita o envio de um OTP por e-mail/SMS durante o login. */
export interface SendCodeRequest {
  mfaToken: string;
  channel: OtpChannel;
}

export interface ForgotPasswordRequest {
  userName: string;
  channel: OtpChannel;
}

export interface ResetPasswordWithCodeRequest {
  userName: string;
  code: string;
  newPassword: string;
}

/** Corpo do reset por token JWT (link enviado por e-mail pelo admin). */
export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

// ----------------------------------------------------------------------------
// Usuário logado (/api/me)
// ----------------------------------------------------------------------------

export interface ApplicationDto {
  id: number;
  code: string;
  displayName: string;
  description: string | null;
  url: string;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAtUtc: string;
}

/** Referência enxuta de perfil de acesso (rótulo do vínculo). */
export interface AccessProfileRef {
  id: number;
  name: string;
}

/** Aplicação no dashboard do usuário — inclui o perfil vigente do vínculo. */
export interface MeAppDto extends ApplicationDto {
  profile?: AccessProfileRef | null;
}

export interface MeProfileDto {
  phoneNumber: string | null;
  department: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
}

export interface MeDto {
  id: number;
  userName: string;
  name: string | null;
  roles: string[];
  apps: MeAppDto[];
  profile: MeProfileDto | null;
}

/** Configuração de 2FA self-service (GET/PUT /api/me/mfa). */
export interface MeMfaDto {
  method: MfaMethod;
  phoneNumber: string | null;
  /** QR code para o app autenticador quando method = Totp. */
  qrCode?: string | null;
  secretKey?: string | null;
}

export interface UpdateMeMfaRequest {
  method: MfaMethod;
  phoneNumber?: string | null;
}

// ----------------------------------------------------------------------------
// Administração — Aplicações
// ----------------------------------------------------------------------------

export interface CreateApplicationRequest {
  code: string;
  displayName: string;
  description?: string | null;
  url: string;
  iconUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
}

/** `Code` é imutável — não vai no update. */
export interface UpdateApplicationRequest {
  displayName: string;
  description?: string | null;
  url: string;
  iconUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
}

// ----------------------------------------------------------------------------
// Administração — Perfis de acesso
// ----------------------------------------------------------------------------

export interface AccessProfileDto {
  id: number;
  applicationId: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CreateAccessProfileRequest {
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface UpdateAccessProfileRequest {
  name: string;
  description?: string | null;
  isActive: boolean;
}

// ----------------------------------------------------------------------------
// Administração — Usuários
// ----------------------------------------------------------------------------

export interface UserDto {
  id: number;
  name: string | null;
  userName: string;
  mfaMethod: MfaMethod;
  phoneNumber: string | null;
  roles: string[];
  isAdSynced: boolean;
}

export interface CreateUserRequest {
  name: string;
  userName: string;
  /**
   * Senha opcional. Quando `sendResetLink` é `true`, ignorada — o servidor gera
   * uma senha aleatória placeholder e envia link por e-mail pro usuário definir.
   */
  password?: string | null;
  confirmPassword?: string | null;
  /** Se `true`, o servidor envia por e-mail um link para o usuário definir a senha. */
  sendResetLink?: boolean;
  mfaMethod: MfaMethod;
  phoneNumber?: string | null;
  isAdSynced: boolean;
}

export interface UpdateUserRequest {
  name: string;
  userName: string;
  /** Opcional na edição; se vazio, mantém a senha atual. */
  password?: string | null;
  mfaMethod: MfaMethod;
  phoneNumber?: string | null;
  isAdSynced: boolean;
}

export interface AssignRoleRequest {
  roleName: string;
}

// ----------------------------------------------------------------------------
// Administração — Vínculos usuário ↔ app ↔ perfil
// ----------------------------------------------------------------------------

/** Vínculo de um usuário com uma aplicação (com o perfil vigente). */
export interface UserApplicationDto {
  userId: number;
  applicationId: number;
  code: string;
  displayName: string;
  url: string;
  iconUrl: string | null;
  profile: AccessProfileRef | null;
  grantedAtUtc: string;
}

/** Usuário vinculado a uma aplicação (visão by-application). */
export interface ApplicationUserDto {
  userId: number;
  userName: string;
  name: string | null;
  profile: AccessProfileRef | null;
  grantedAtUtc: string;
}

export interface AssignUserApplicationRequest {
  userId: number;
  applicationId: number;
  accessProfileId?: number | null;
}

export interface ChangeUserApplicationProfileRequest {
  accessProfileId: number | null;
}

// ----------------------------------------------------------------------------
// Administração — Roles globais
// ----------------------------------------------------------------------------

export interface RoleDto {
  id: number;
  name: string;
}

// ----------------------------------------------------------------------------
// Administração — Permissões de menu por perfil de acesso
// ----------------------------------------------------------------------------

/**
 * Permissão de um menu para um perfil de acesso (visibilidade + CRUD).
 * `menuKey` é uma string livre que casa com o catálogo de menus do próprio app
 * (ex.: no ClearID: "identities", "empresas", "settings").
 */
export interface AccessProfileMenuDto {
  menuKey: string;
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
}

/** Corpo do PUT que substitui o conjunto de permissões de menu de um perfil. */
export interface SetProfileMenusRequest {
  menus: AccessProfileMenuDto[];
}

// ----------------------------------------------------------------------------
// Administração — Catálogo de menus por aplicativo
// ----------------------------------------------------------------------------

/** Item plano do catálogo de menus (por aplicativo). */
export interface MenuDto {
  id: number;
  applicationId: number;
  code: string;
  displayName: string;
  icon?: string | null;
  parentMenuId?: number | null;
  displayOrder: number;
  isActive: boolean;
}

/** Nó da árvore de menus (só ativos). */
export interface MenuTreeNodeDto {
  id: number;
  code: string;
  displayName: string;
  icon?: string | null;
  displayOrder: number;
  isActive: boolean;
  children: MenuTreeNodeDto[];
}

export interface CreateMenuRequest {
  code: string;
  displayName: string;
  icon?: string | null;
  parentMenuId?: number | null;
  displayOrder: number;
  isActive: boolean;
}

export interface UpdateMenuRequest {
  code: string;
  displayName: string;
  icon?: string | null;
  parentMenuId?: number | null;
  displayOrder: number;
  isActive: boolean;
}

// ----------------------------------------------------------------------------
// Administração — Sites do ClearID atribuídos ao usuário
// ----------------------------------------------------------------------------

/** Vínculo (usuário, cliente, site) — reflete a linha de UserSites. */
export interface UserSiteDto {
  id: number;
  userId: number;
  clientCode: string;
  siteCode: string;
  createdAtUtc: string;
}

/** Item da lista enviada no PUT bulk. */
export interface UserSiteItem {
  clientCode: string;
  siteCode: string;
}

export interface SetUserSitesRequest {
  sites: UserSiteItem[];
}

/** Site vindo do ArgusClearId.Api (subset — só o que a UI precisa). */
export interface ClearIdSiteDto {
  siteId?: string | null;
  name?: string | null;
  accountId?: string | null;
}

// ----------------------------------------------------------------------------
// Administração — CorporateData (clientes/sites corporativos)
// ----------------------------------------------------------------------------

/**
 * Cliente do CorporateData. Contrato tolerante — aceita nomes em PT ou EN
 * (o CorporateData mistura os dois em versões diferentes).
 */
export interface CorporateClientDto {
  id: number;
  name?: string | null;
  nome?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  description?: string | null;
  descricao?: string | null;
  cnpj?: string | null;
  /** Código único (perfil do ClearID). Imutável após a criação. */
  code?: string | null;
  /** AccountId do ClearID (GUID), quando conhecido. */
  externalAccountId?: string | null;
  isActive?: boolean | null;
  /** Quantidade de sites ativos. */
  siteCount?: number | null;
  updatedAtUtc?: string | null;
}

export interface CreateCorporateClientRequest {
  code: string;
  name: string;
  externalAccountId: string | null;
  isActive: boolean;
}

export type UpdateCorporateClientRequest = Omit<
  CreateCorporateClientRequest,
  "code"
>;

/** Escopo do site no CorporateData. */
export type CorporateSiteScope =
  "All" | "ClearIdOnly" | "ClientesOnly" | "AplicativosOnly";

/** Site (dentro de um cliente) do CorporateData. */
export interface CorporateSiteDto {
  id: number;
  clienteId?: number | null;
  externalId?: string | null;
  name?: string | null;
  nome?: string | null;
  description?: string | null;
  descricao?: string | null;
  isActive?: boolean | null;
  sigla?: string | null;
  apelido?: string | null;
  timeZoneId?: string | null;
  regionId?: string | null;
  scope?: CorporateSiteScope | null;
}

export interface UpdateCorporateSiteRequest {
  name: string;
  sigla: string | null;
  apelido: string | null;
  description: string | null;
  timeZoneId: string | null;
  regionId: string | null;
  scope: CorporateSiteScope;
  isActive: boolean;
}

export interface CreateCorporateSiteRequest extends UpdateCorporateSiteRequest {
  clienteId: number;
  /** Em branco = site fora do ClearID (a API gera um identificador "manual-…"). */
  externalId: string | null;
}

// ----------------------------------------------------------------------------
// Administração — Vínculo aplicação ↔ sites (CorporateData)
// ----------------------------------------------------------------------------

export interface ApplicationSiteDto {
  applicationId: number;
  clientId: number;
  siteId: number;
  clientName?: string | null;
  siteName?: string | null;
  createdAtUtc: string;
}

export interface ApplicationSiteItem {
  clientId: number;
  siteId: number;
  clientName?: string | null;
  siteName?: string | null;
}

export interface SetApplicationSitesRequest {
  sites: ApplicationSiteItem[];
}

// ----------------------------------------------------------------------------
// Administração — Cadastro em lote de usuários (POST /api/users/bulk)
// ----------------------------------------------------------------------------

/** Aplicativo concedido a um usuário do lote, com o perfil (papel) no app. */
export interface BulkUserApplication {
  applicationCode: string;
  profile?: string | null;
}

/** Um usuário do lote. */
export interface BulkUserItem {
  name: string;
  userName: string;
  /** Usada só quando `sendResetLink` do lote é `false`. */
  password?: string | null;
  phoneNumber?: string | null;
  /** Vazio = usa o `defaultMfaMethod` do lote. */
  mfaMethod?: MfaMethod | null;
  isADEnabled?: boolean;
  roles: string[];
  applications: BulkUserApplication[];
  /** Sites do usuário: `clientId:siteId` quando resolvido no catálogo, senão o texto digitado. */
  sites: string[];
}

export interface BulkCreateUsersRequest {
  users: BulkUserItem[];
  sendResetLink: boolean;
  defaultMfaMethod?: MfaMethod;
}

export interface BulkCreateUserItemResult {
  index: number;
  userName: string | null;
  success: boolean;
  userId: number | null;
  error: string | null;
  warnings: string[];
  roles: string[];
  applications: string[];
  /** Sites vinculados, no formato `Cliente:Site`. */
  sites: string[];
  /** E-mail com o link de senha agendado para envio em segundo plano. */
  resetLinkQueued: boolean;
}

export interface SendPasswordResetLinksResult {
  requested: number;
  queued: number;
  notFound: number[];
}

export interface BulkCreateUsersResult {
  total: number;
  created: number;
  failed: number;
  items: BulkCreateUserItemResult[];
}
