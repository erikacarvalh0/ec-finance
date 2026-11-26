import { toCents } from '@/components/finance/form-utils';

export function validateAmount(value: string) {
    try {
        const cents = BigInt(toCents(value));
        if (cents <= BigInt(0) || cents > BigInt('9223372036854775807')) return 'Informe um valor positivo válido.';
    } catch {
        return 'Informe um valor com até duas casas decimais.';
    }
}

export function validateDescription(value: string) {
    if (value.trim().length < 2 || value.trim().length > 255) return 'Informe uma descrição de 2 a 255 caracteres.';
}

export function validateInstallments(value: string) {
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 120) return 'Informe de 1 a 120 parcelas.';
}
