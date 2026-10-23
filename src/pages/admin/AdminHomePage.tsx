import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppWindow, ArrowRight, Building2, Users } from "lucide-react";
import { listApplications } from "@/api/applications";
import { listUsers } from "@/api/users";
import { listCorporateClients } from "@/api/corporateData";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminHomePage() {
  const appsQuery = useQuery({
    queryKey: ["applications", { includeInactive: true }],
    queryFn: () => listApplications(true),
  });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const clientesQuery = useQuery({
    queryKey: ["corporate-clients", { includeInactive: true }],
    queryFn: () => listCorporateClients(true),
  });

  const cards = [
    {
      to: "/admin/apps",
      icon: <AppWindow className="h-6 w-6 text-brand" />,
      title: "Aplicativos",
      description: "Cadastre apps e defina os perfis de acesso de cada um.",
      count: appsQuery.data?.length,
      countLabel: "aplicativos",
    },
    {
      to: "/admin/users",
      icon: <Users className="h-6 w-6 text-brand" />,
      title: "Usuários",
      description: "Gerencie usuários, 2FA, roles globais e vínculos com apps.",
      count: usersQuery.data?.length,
      countLabel: "usuários",
    },
    {
      to: "/admin/clientes",
      icon: <Building2 className="h-6 w-6 text-brand" />,
      title: "Clientes e sites",
      description: "Mantenha o catálogo corporativo de clientes e seus sites.",
      count: clientesQuery.data?.length,
      countLabel: "clientes",
    },
  ];

  return (
    <AdminLayout
      title="Console de administração"
      description="Gerencie aplicativos, perfis de acesso, usuários e vínculos."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-brand/50 group-hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  {c.icon}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand" />
                </div>
                <CardTitle>{c.title}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {c.count ?? "—"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {c.countLabel}
                  </span>
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Fluxo recomendado</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Cadastre o aplicativo.</li>
          <li>Defina os perfis de acesso do app (rótulos).</li>
          <li>Cadastre os usuários (com método de 2FA).</li>
          <li>Vincule cada usuário ao app escolhendo um perfil.</li>
        </ol>
      </div>
    </AdminLayout>
  );
}
