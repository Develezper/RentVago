import { z } from "zod";

// Validación para Formulario de Usuario
export const UserSchema = z.object({
  email: z.string().email("Debe ser un correo válido."),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").optional(),
});

// Validación para Formulario de Propiedades
export const PropertySchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  address: z.string().min(5, "La dirección debe ser más detallada."),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0."),
  userId: z.coerce.number().int().positive("El ID de usuario es inválido.")
});

// Validación para Formulario de Contrato (Leases)
export const LeaseSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  propertyId: z.coerce.number().int().positive()
}).refine(data => data.endDate > data.startDate, {
  message: "La fecha de alquiler de fin debe ser después de la fecha de inicio.",
  path: ["endDate"]
});

// Validación para Pagos
export const PaymentSchema = z.object({
  amount: z.coerce.number().positive("El pago debe ser mayor a 0."),
  status: z.enum(["pending", "paid", "overdue"]).default("pending"),
  leaseId: z.coerce.number().int().positive()
});
