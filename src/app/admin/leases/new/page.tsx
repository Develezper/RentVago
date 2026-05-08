import { adminUseCases } from "@/modules/admin/application/admin.use-cases";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { NewLeaseForm } from "./new-lease-form";

export default async function NewLeasePage() {
  const [rawProperties, rawUsers] = await Promise.all([
    propertiesUseCases.listPropertyOptions(),
    adminUseCases.getAllUsers(),
  ]);

  const properties = rawProperties.map((p) => ({
    id: p.id,
    title: p.title,
    location: p.location,
  }));
  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name ?? null,
    email: u.email,
  }));

  return <NewLeaseForm properties={properties} users={users} />;
}
