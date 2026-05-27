import { z } from 'zod';

export const vehicleSchema = z.object({
    plate: z.string().length(7, 'Placa deve ter exatamente 7 caracteres'),
    brand: z.string().min(2, 'Marca obrigatória'),
    model: z.string().min(2, 'Modelo obrigatório'),
    year: z.number().min(1900).max(new Date().getFullYear() + 1),
    category: z.string().min(1, 'Categoria obrigatória'),
    km: z.number().min(0),
    status: z.enum(['Disponível', 'Alugado', 'Reservado', 'Em manutenção', 'Desativado']),
    color: z.string().min(2, 'Cor obrigatória'),
    passengers: z.number().min(1),
    doors: z.number().min(2),
    transmission: z.enum(['Manual', 'Automático']),
    renavan: z.string().min(11, 'Renavan inválido'),
    chassis: z.string().min(17, 'Chassis inválido'),
    default_security_deposit: z.number().min(0, 'Valor de caução inválido'),
    default_insurance_value: z.number().min(0, 'Valor de seguro inválido'),
    daily_rate: z.number().min(0, 'Valor de diária inválido'),
    image_url: z.string().optional().or(z.string().nullable())
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;