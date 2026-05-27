import { z } from 'zod';

export const clientSchema = z.object({
    name: z.string()
        .min(3, 'Nome deve ter no mínimo 3 caracteres')
        .max(100, 'Nome muito longo'),

    cpf: z.string()
        .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (formato: 000.000.000-00)'),

    rg: z.string()
        .min(5, 'RG inválido'),

    birth_date: z.string()
        .refine((date) => {
            const birthDate = new Date(date);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            return age >= 18;
        }, 'Cliente deve ter no mínimo 18 anos'),

    cnh_number: z.string().optional().or(z.literal('')),
    cnh_category: z.string().optional().or(z.literal('')),
    cnh_expiration: z.string().optional().or(z.literal('')),

    email: z.string()
        .email('Email inválido'),

    phone: z.string()
        .min(10, 'Telefone inválido'),

    cep: z.string()
        .regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 00000-000)'),

    street: z.string().min(3, 'Endereço inválido'),
    number: z.string().min(1, 'Número obrigatório'),
    neighborhood: z.string().min(2, 'Bairro inválido'),
    city: z.string().min(2, 'Cidade inválida'),
    state: z.string().length(2, 'UF deve ter 2 caracteres'),

    status: z.enum(['Ativo', 'Inativo', 'Pendente', 'Inadimplente']),
    vip: z.boolean(),
    score: z.number().min(0).max(100),
    cnh_url: z.string().nullable().or(z.string()).optional(),
    address_proof_url: z.string().nullable().or(z.string()).optional(),
    selfie_url: z.string().nullable().or(z.string()).optional()
});

export type ClientFormData = z.infer<typeof clientSchema>;
