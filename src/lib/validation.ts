import { z } from "zod";

export const acceptedAttachmentMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const maxAttachmentSizeInBytes = 10 * 1024 * 1024;

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(120),
  description: optionalTrimmedString,
  dueDate: optionalTrimmedString,
});

export const updateTodoSchema =
  createTodoSchema.partial().extend({
    status: z.enum(["pending", "done"]).optional(),
  });

export const todoIdSchema = z.string().uuid("Identifiant de tache invalide");

export function assertValidAttachment(file: File): void {
  if (!acceptedAttachmentMimeTypes.includes(file.type as (typeof acceptedAttachmentMimeTypes)[number])) {
    throw new Error("Type de fichier non autorise. Utilisez JPG, PNG, WEBP ou PDF.");
  }

  if (file.size > maxAttachmentSizeInBytes) {
    throw new Error("Fichier trop volumineux. Taille maximum: 10 MB.");
  }
}
