import { z } from "zod";

export const roleSchema = z.enum(["USER", "SUPERADMIN"]);

const nameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(100, "El nombre es demasiado largo.")
  .optional();

const emailSchema = z
  .string()
  .trim()
  .min(1, "El correo electrónico es obligatorio.")
  .max(320, "El correo electrónico es demasiado largo.")
  .email("El correo electrónico no es válido.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña no debe superar los 72 caracteres.")
  .regex(/[a-z]/, "La contraseña debe incluir una letra minúscula.")
  .regex(/[A-Z]/, "La contraseña debe incluir una letra mayúscula.")
  .regex(/\d/, "La contraseña debe incluir un número.");

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(1, "La contraseña es obligatoria.")
      .max(72, "La contraseña no debe superar los 72 caracteres."),
  })
  .strict();

export type LoginInput = z.input<typeof loginSchema>;
export type LoginData = z.output<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterData = z.output<typeof registerSchema>;
export type RoleInput = z.output<typeof roleSchema>;
