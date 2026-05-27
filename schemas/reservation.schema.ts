import { z } from 'zod';

export const reservationSchema = z.object({
    client_id: z.string().uuid('Selecione um cliente válido'),
    vehicle_id: z.string().uuid('Selecione um veículo válido'),
    pickup_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Data de retirada inválida'),
    return_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Data de devolução inválida'),
    daily_rate: z.number().min(0),
    security_deposit: z.number().min(0),
    insurance_value: z.number().min(0),
    insurance_details: z.array(z.object({
        name: z.string(),
        value: z.number(),
        selected: z.boolean()
    })).optional(),
    additional_services: z.string().optional(),
    pickup_photos: z.array(z.string()).optional(),
    actual_pickup_date: z.string().optional(),
    pickup_checklist: z.record(z.string(), z.object({
        hasIssue: z.boolean(),
        observation: z.string()
    })).optional(),
    return_photos: z.array(z.string()).optional(),
    actual_return_date: z.string().optional(),
    return_checklist: z.record(z.string(), z.object({
        hasIssue: z.boolean(),
        observation: z.string()
    })).optional(),
    origin: z.enum(['painel', 'site']).optional(),
    status: z.string(),
    days: z.number().min(1),
    total_value: z.number().min(0)
}).refine(data => new Date(data.return_date) > new Date(data.pickup_date), {
    message: "Data de devolução deve ser posterior à data de retirada",
    path: ["return_date"]
});

export type ReservationFormData = z.infer<typeof reservationSchema>;