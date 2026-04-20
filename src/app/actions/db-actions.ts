"use server"

import { prisma } from "@/lib/db/mysql"; 
import { PropertySchema, LeaseSchema, PaymentSchema, UserSchema } from "@/models/schemas"; 

export interface FormState {
  success?: boolean;
  error?: string;
  details?: Record<string, string[] | undefined>;
  data?: unknown;
}

//  ACCIONES DE USUARIOS (Users)
export async function createUserAction(prevState: FormState, formData: FormData) {
  const rawData = {
    email: formData.get("email"),
    name: formData.get("name"),
  };

  const validatedData = UserSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { 
      error: "Revisa el formulario de Usuario", 
      details: validatedData.error.flatten().fieldErrors 
    };
  }

  try {
    const newUser = await prisma.user.create({ data: validatedData.data });
    return { success: true, data: newUser };
  } catch (error) {
    return { error: "El correo ya existe o hubo un error interno." };
  }
}

// ACCIONES DE PROPIEDADES (Properties)
export async function createPropertyAction(prevState: FormState, formData: FormData) {
  const rawData = {
    title: formData.get("title"),
    address: formData.get("address"),
    price: formData.get("price"),
    userId: formData.get("userId"), 
  };

  const validatedData = PropertySchema.safeParse(rawData);

  if (!validatedData.success) {
    return { 
      error: "Datos inválidos en el formulario de Propiedades", 
      details: validatedData.error.flatten().fieldErrors 
    };
  }

  try {
    const newProperty = await prisma.property.create({ data: validatedData.data });
    return { success: true, data: newProperty };
  } catch (error) {
    return { error: "Error interno al guardar la propiedad en la base de datos." };
  }
}

// ACCIONES DE CONTRATOS DE ALQUILER (Leases)
export async function createLeaseAction(prevState: FormState, formData: FormData) {
  const rawData = {
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    propertyId: formData.get("propertyId"), 
  };

  const validatedData = LeaseSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { 
      error: "Datos inválidos en el formulario de Contratos", 
      details: validatedData.error.flatten().fieldErrors 
    };
  }

  try {
    const newLease = await prisma.lease.create({ data: validatedData.data });
    return { success: true, data: newLease };
  } catch (error) {
    return { error: "Error interno al guardar el contrato en la base de datos." };
  }
}

 // ACCIONES DE PAGOS (Payments)

export async function createPaymentAction(prevState: FormState, formData: FormData) {
  const rawData = {
    amount: formData.get("amount"),
    status: formData.get("status"),
    leaseId: formData.get("leaseId"), 
  };

  const validatedData = PaymentSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { 
      error: "Datos inválidos en el formulario de Pagos", 
      details: validatedData.error.flatten().fieldErrors 
    };
  }

  try {
    const newPayment = await prisma.payment.create({ data: validatedData.data });
    return { success: true, data: newPayment };
  } catch (error) {
    return { error: "Error interno al guardar el pago en la base de datos." };
  }
}
